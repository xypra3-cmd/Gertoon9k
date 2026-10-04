-- =============================================================================
-- Digital Card — 0005_service_functions
-- Transactional business logic used by Edge Functions (service role only) and a few
-- read-only RPCs for clients (stats).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Payments (QPay)
-- -----------------------------------------------------------------------------

-- Creates (or reuses) the subscription row and a pending payment. Amount comes from plans.
create or replace function public.create_pending_payment(
  p_user    uuid,
  p_plan_id text,
  p_org_id  uuid default null,
  p_seats   int  default null
)
returns table (payment_id uuid, sender_invoice_no text, amount_mnt int, subscription_id uuid, description text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  pl      public.plans%rowtype;
  sub_id  uuid;
  seats   int := 1;
  amount  int;
  members int;
  inv_no  text;
  pay_id  uuid;
begin
  select * into pl from public.plans p where p.id = p_plan_id and p.is_active;
  if not found or pl.id = 'free' then
    raise exception 'invalid_plan' using errcode = 'P0001';
  end if;

  if pl.id = 'team' then
    if p_org_id is null then
      raise exception 'org_required' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.org_members m
                    where m.org_id = p_org_id and m.user_id = p_user and m.status = 'active'
                      and m.role in ('owner', 'admin')) then
      raise exception 'not_org_admin' using errcode = '42501';
    end if;
    select count(*) into members from public.org_members m where m.org_id = p_org_id;
    seats  := greatest(coalesce(p_seats, 0), pl.min_seats, members);
    amount := pl.price_per_seat_mnt * seats;

    select s.id into sub_id from public.subscriptions s where s.org_id = p_org_id;
    if sub_id is null then
      insert into public.subscriptions (org_id, plan_id, seats, status)
      values (p_org_id, pl.id, seats, 'pending') returning id into sub_id;
    end if;
  else
    if p_org_id is not null then
      raise exception 'org_not_allowed_for_plan' using errcode = 'P0001';
    end if;
    amount := pl.price_mnt;
    select s.id into sub_id from public.subscriptions s where s.owner_user_id = p_user;
    if sub_id is null then
      insert into public.subscriptions (owner_user_id, plan_id, seats, status)
      values (p_user, pl.id, 1, 'pending') returning id into sub_id;
    end if;
  end if;

  if amount is null or amount <= 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  inv_no := 'DC' || to_char(now() at time zone 'Asia/Ulaanbaatar', 'YYMMDDHH24MISS')
            || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.payments (subscription_id, plan_id, seats, sender_invoice_no, amount_mnt, status)
  values (sub_id, pl.id, seats, inv_no, amount, 'pending')
  returning id into pay_id;

  insert into public.audit_log (actor_id, action, entity, entity_id, meta)
  values (p_user, 'payment.create', 'payments', pay_id::text,
          jsonb_build_object('plan_id', pl.id, 'seats', seats, 'amount_mnt', amount, 'org_id', p_org_id));

  return query select pay_id, inv_no, amount, sub_id,
    format('Digital Card %s%s', pl.name_en, case when pl.id = 'team' then format(' x%s', seats) else '' end);
end;
$$;

create or replace function public.attach_qpay_invoice(p_payment_id uuid, p_qpay_invoice_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payments set qpay_invoice_id = p_qpay_invoice_id where id = p_payment_id and qpay_invoice_id is null;
$$;

-- Applies the result of a SERVER-SIDE /v2/payment/check. Never call with callback data.
-- Idempotent: a payment is applied at most once (row lock + status check).
-- Returns: paid | already_paid | not_paid | amount_mismatch | not_found | failed
create or replace function public.apply_payment_check(
  p_sender_invoice_no text,
  p_paid              boolean,
  p_paid_amount       int,
  p_qpay_payment_id   text,
  p_raw               jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pay  public.payments%rowtype;
  sub  public.subscriptions%rowtype;
  base timestamptz;
begin
  select * into pay from public.payments p where p.sender_invoice_no = p_sender_invoice_no for update;
  if not found then
    return 'not_found';
  end if;
  if pay.status = 'paid' then
    return 'already_paid';
  end if;
  if pay.status = 'failed' then
    return 'failed';
  end if;

  update public.payments set raw_callback = p_raw where id = pay.id;

  if not p_paid then
    return 'not_paid';
  end if;

  if p_paid_amount is distinct from pay.amount_mnt then
    update public.payments
       set status = 'failed', failure_reason = 'amount_mismatch',
           paid_amount_mnt = p_paid_amount, qpay_payment_id = p_qpay_payment_id
     where id = pay.id;
    insert into public.audit_log (action, entity, entity_id, meta)
    values ('payment.amount_mismatch', 'payments', pay.id::text,
            jsonb_build_object('expected', pay.amount_mnt, 'paid', p_paid_amount, 'qpay_payment_id', p_qpay_payment_id));
    return 'amount_mismatch';
  end if;

  select * into sub from public.subscriptions s where s.id = pay.subscription_id for update;

  base := greatest(now(), coalesce(sub.current_period_end, now()));

  update public.subscriptions
     set plan_id = pay.plan_id,
         seats = pay.seats,
         status = 'active',
         current_period_start = case when sub.status = 'active' and sub.current_period_end > now()
                                     then sub.current_period_start else now() end,
         current_period_end = base + interval '1 month'
   where id = sub.id;

  update public.payments
     set status = 'paid', paid_at = now(), paid_amount_mnt = p_paid_amount, qpay_payment_id = p_qpay_payment_id
   where id = pay.id;

  insert into public.audit_log (action, entity, entity_id, meta)
  values ('payment.paid', 'payments', pay.id::text,
          jsonb_build_object('subscription_id', sub.id, 'plan_id', pay.plan_id, 'period_end', base + interval '1 month'));

  return 'paid';
end;
$$;

-- Pending payments older than 24h → expired. Returns affected rows.
create or replace function public.expire_stale_payments()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  update public.payments set status = 'expired'
   where status = 'pending' and created_at < now() - interval '24 hours';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- -----------------------------------------------------------------------------
-- Subscriptions lifecycle (daily cron)
-- -----------------------------------------------------------------------------
create or replace function public.expire_subscriptions()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_n  int;
  reminded_n int;
begin
  update public.subscriptions set status = 'expired'
   where status = 'active' and current_period_end <= now();
  get diagnostics expired_n = row_count;

  -- one reminder per subscription period, 3 days before the end
  insert into public.email_queue (user_id, to_email, kind, payload, dedupe_key)
  select u.id, u.email, 'subscription_expiring',
         jsonb_build_object('plan_id', s.plan_id, 'period_end', s.current_period_end, 'org_id', s.org_id,
                            'locale', coalesce(pr.locale, 'mn')),
         'sub_expiring:' || s.id || ':' || to_char(s.current_period_end, 'YYYY-MM-DD')
    from public.subscriptions s
    join auth.users u on u.id = coalesce(s.owner_user_id, (select o.owner_id from public.organizations o where o.id = s.org_id))
    left join public.profiles pr on pr.id = u.id
   where s.status = 'active'
     and s.current_period_end > now()
     and s.current_period_end <= now() + interval '3 days'
     and u.email is not null
  on conflict (dedupe_key) do nothing;
  get diagnostics reminded_n = row_count;

  return jsonb_build_object('expired', expired_n, 'reminders_queued', reminded_n);
end;
$$;

-- -----------------------------------------------------------------------------
-- Follow-up digest: at most ONE e-mail per user per day (dedupe_key).
-- -----------------------------------------------------------------------------
create or replace function public.queue_followup_digests(p_day date default (now() at time zone 'Asia/Ulaanbaatar')::date)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  insert into public.email_queue (user_id, to_email, kind, payload, dedupe_key)
  select u.id, u.email, 'followup_digest',
         jsonb_build_object(
           'day', p_day,
           'locale', coalesce(pr.locale, 'mn'),
           'contacts', (
             select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'company', c.company,
                                                 'follow_up_at', c.follow_up_at, 'met_where_text', c.met_where_text)
                              order by c.follow_up_at, c.name)
               from (select * from public.contacts c2
                      where c2.owner_id = u.id and c2.follow_up_at <= p_day and c2.status <> 'closed'
                      order by c2.follow_up_at limit 50) c
           )
         ),
         'followup:' || u.id || ':' || p_day
    from auth.users u
    left join public.profiles pr on pr.id = u.id
   where u.email is not null
     and public.crm_enabled(u.id)
     and exists (select 1 from public.contacts c
                  where c.owner_id = u.id and c.follow_up_at <= p_day and c.status <> 'closed')
  on conflict (dedupe_key) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- -----------------------------------------------------------------------------
-- Analytics
-- -----------------------------------------------------------------------------

-- Records a public card event. visitor_hash is computed by the edge function
-- (sha256(ip + ua + daily salt)); the IP itself never reaches the database.
-- Returns: ok | rate_limited | not_found | invalid_event
create or replace function public.track_card_event(
  p_slug          text,
  p_event         text,
  p_link_kind     text,
  p_visitor_hash  text,
  p_viewer        uuid default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid     uuid;
  recent  int;
  viewer  uuid;
begin
  if p_event not in ('view', 'qr_open', 'link_click', 'contact_save') then
    return 'invalid_event';
  end if;

  select c.id into cid from public.cards c
   where c.slug = lower(p_slug) and c.is_published and c.deleted_at is null;
  if cid is null then
    return 'not_found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('evt:' || cid::text || ':' || p_visitor_hash, 0));
  select count(*) into recent from public.card_events e
   where e.card_id = cid and e.visitor_hash = p_visitor_hash and e.created_at > now() - interval '1 minute';
  if recent >= 30 then
    return 'rate_limited';
  end if;

  -- Only keep the viewer identity if they opted in to be shown to card owners.
  if p_viewer is not null and exists (select 1 from public.profiles p where p.id = p_viewer and p.show_name_to_owners) then
    viewer := p_viewer;
  end if;

  insert into public.card_events (card_id, event, link_kind, visitor_hash, viewer_user_id)
  values (cid, p_event,
          case when p_event = 'link_click' then left(p_link_kind, 40) end,
          p_visitor_hash, viewer);
  return 'ok';
end;
$$;

-- Guest leaves their details on a public card ("Миний мэдээллийг үлдээх").
-- Returns jsonb: { status: ok|not_found|rate_limited|owner_limit_reached|invalid, owner_first_name }
create or replace function public.submit_contact_exchange(
  p_slug          text,
  p_visitor_hash  text,
  p_name          text,
  p_phone         text,
  p_email         text,
  p_company       text,
  p_title         text,
  p_message       text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c        public.cards%rowtype;
  recent   int;
  new_id   uuid;
  owner_mail text;
begin
  p_name    := nullif(btrim(p_name), '');
  p_phone   := nullif(btrim(p_phone), '');
  p_email   := nullif(lower(btrim(p_email)), '');
  p_company := nullif(btrim(p_company), '');
  p_title   := nullif(btrim(p_title), '');
  p_message := nullif(btrim(p_message), '');

  if p_name is null or char_length(p_name) > 120 or (p_phone is null and p_email is null)
     or char_length(coalesce(p_message, '')) > 300 then
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into c from public.cards x where x.slug = lower(p_slug) and x.is_published and x.deleted_at is null;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('exchange:' || p_visitor_hash, 0));
  select count(*) into recent from public.card_events e
   where e.visitor_hash = p_visitor_hash and e.event = 'exchange' and e.created_at > now() - interval '1 hour';
  if recent >= 5 then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  begin
    insert into public.contacts (owner_id, via_card_id, name, title, company, phone, email, source,
                                 exchange_message, met_at, consent_at)
    values (c.owner_id, c.id, p_name, left(p_title, 80), left(p_company, 80), left(p_phone, 40), left(p_email, 254),
            'exchange', p_message, (now() at time zone 'Asia/Ulaanbaatar')::date, now())
    returning id into new_id;
  exception when insufficient_privilege then
    if sqlerrm = 'contact_limit_reached' then
      return jsonb_build_object('status', 'owner_limit_reached', 'owner_first_name', c.first_name);
    end if;
    raise;
  end;

  insert into public.card_events (card_id, event, visitor_hash) values (c.id, 'exchange', p_visitor_hash);

  if public.crm_enabled(c.owner_id) then
    select u.email into owner_mail from auth.users u where u.id = c.owner_id;
    if owner_mail is not null then
      insert into public.email_queue (user_id, to_email, kind, payload, dedupe_key)
      values (c.owner_id, owner_mail, 'exchange_received',
              jsonb_build_object('contact_id', new_id, 'name', p_name, 'company', p_company, 'card_slug', c.slug),
              'exchange:' || new_id)
      on conflict (dedupe_key) do nothing;
    end if;
  end if;

  return jsonb_build_object('status', 'ok', 'owner_first_name', c.first_name);
end;
$$;

-- Card statistics for the caller's cards (owner or org admin). p_from = null → all time.
-- Every metric is "events since p_from", so All time ≥ 30d ≥ 7d ≥ Today always holds,
-- and total_opens = views + qr_opens by definition.
create or replace function public.get_card_stats(p_card_ids uuid[], p_from timestamptz default null)
returns table (
  card_id          uuid,
  total_opens      bigint,
  views            bigint,
  qr_opens         bigint,
  unique_visitors  bigint,
  link_clicks      bigint,
  contact_saves    bigint,
  exchanges        bigint,
  followups        bigint,
  top_link_kind    text,
  top_link_clicks  bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with allowed as (
    select c.id, c.owner_id from public.cards c
     where c.id = any (p_card_ids) and public.can_view_card(c.id)
  ),
  ev as (
    select e.* from public.card_events e
     join allowed a on a.id = e.card_id
    where p_from is null or e.created_at >= p_from
  ),
  links as (
    select distinct on (ev.card_id) ev.card_id, ev.link_kind, count(*) over (partition by ev.card_id, ev.link_kind) as n
      from ev where ev.event = 'link_click'
     order by ev.card_id, count(*) over (partition by ev.card_id, ev.link_kind) desc, ev.link_kind
  )
  select
    a.id,
    count(ev.id) filter (where ev.event in ('view', 'qr_open')),
    count(ev.id) filter (where ev.event = 'view'),
    count(ev.id) filter (where ev.event = 'qr_open'),
    count(distinct ev.visitor_hash),
    count(ev.id) filter (where ev.event = 'link_click'),
    count(ev.id) filter (where ev.event = 'contact_save'),
    count(ev.id) filter (where ev.event = 'exchange'),
    (select count(*) from public.contacts ct
      where ct.via_card_id = a.id and ct.owner_id = a.owner_id and ct.last_contacted_at is not null
        and (p_from is null or ct.created_at >= p_from)),
    l.link_kind,
    coalesce(l.n, 0)
  from allowed a
  left join ev on ev.card_id = a.id
  left join links l on l.card_id = a.id
  group by a.id, a.owner_id, l.link_kind, l.n;
$$;

-- Named viewers (only those who opted in, checked again at read time).
create or replace function public.get_named_viewers(p_card_id uuid, p_from timestamptz default null)
returns table (viewer_user_id uuid, full_name text, last_seen timestamptz, opens bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select e.viewer_user_id, p.full_name, max(e.created_at), count(*)
    from public.card_events e
    join public.profiles p on p.id = e.viewer_user_id and p.show_name_to_owners
   where e.card_id = p_card_id
     and public.can_view_card(p_card_id)
     and (p_from is null or e.created_at >= p_from)
   group by e.viewer_user_id, p.full_name
   order by max(e.created_at) desc
   limit 200;
$$;

-- -----------------------------------------------------------------------------
-- Org invitations (called by the org-invite edge function with the caller's id)
-- -----------------------------------------------------------------------------
create or replace function public.invite_org_member(p_actor uuid, p_org_id uuid, p_email text, p_role text default 'member')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  mail    text := lower(btrim(p_email));
  uid     uuid;
  mid     uuid;
  orgname text;
begin
  if not exists (select 1 from public.org_members m
                  where m.org_id = p_org_id and m.user_id = p_actor and m.status = 'active'
                    and m.role in ('owner', 'admin')) then
    raise exception 'not_org_admin' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'member') then
    raise exception 'invalid_role' using errcode = 'P0001';
  end if;
  if mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;

  select u.id into uid from auth.users u where lower(u.email) = mail;

  if exists (select 1 from public.org_members m
              where m.org_id = p_org_id and (m.invited_email = mail or (uid is not null and m.user_id = uid))) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  -- seat limit enforced by org_members_before_insert
  insert into public.org_members (org_id, user_id, role, invited_email, status)
  values (p_org_id, uid, p_role, mail, 'invited')
  returning id into mid;

  select o.name into orgname from public.organizations o where o.id = p_org_id;
  insert into public.email_queue (user_id, to_email, kind, payload, dedupe_key)
  values (uid, mail, 'org_invite', jsonb_build_object('org_id', p_org_id, 'org_name', orgname), 'org_invite:' || mid)
  on conflict (dedupe_key) do nothing;

  insert into public.audit_log (actor_id, action, entity, entity_id, meta)
  values (p_actor, 'org.invite', 'org_members', mid::text, jsonb_build_object('org_id', p_org_id, 'role', p_role));

  return mid;
end;
$$;

-- -----------------------------------------------------------------------------
-- Privileges: service-only functions are not callable by clients.
-- -----------------------------------------------------------------------------
revoke execute on function public.create_pending_payment(uuid, text, uuid, int) from public, anon, authenticated;
revoke execute on function public.attach_qpay_invoice(uuid, text) from public, anon, authenticated;
revoke execute on function public.apply_payment_check(text, boolean, int, text, jsonb) from public, anon, authenticated;
revoke execute on function public.expire_stale_payments() from public, anon, authenticated;
revoke execute on function public.expire_subscriptions() from public, anon, authenticated;
revoke execute on function public.queue_followup_digests(date) from public, anon, authenticated;
revoke execute on function public.track_card_event(text, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.submit_contact_exchange(text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.invite_org_member(uuid, uuid, text, text) from public, anon, authenticated;

grant execute on function public.create_pending_payment(uuid, text, uuid, int) to service_role;
grant execute on function public.attach_qpay_invoice(uuid, text) to service_role;
grant execute on function public.apply_payment_check(text, boolean, int, text, jsonb) to service_role;
grant execute on function public.expire_stale_payments() to service_role;
grant execute on function public.expire_subscriptions() to service_role;
grant execute on function public.queue_followup_digests(date) to service_role;
grant execute on function public.track_card_event(text, text, text, text, uuid) to service_role;
grant execute on function public.submit_contact_exchange(text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.invite_org_member(uuid, uuid, text, text) to service_role;

revoke execute on function public.get_card_stats(uuid[], timestamptz) from public, anon;
revoke execute on function public.get_named_viewers(uuid, timestamptz) from public, anon;
grant execute on function public.get_card_stats(uuid[], timestamptz) to authenticated, service_role;
grant execute on function public.get_named_viewers(uuid, timestamptz) to authenticated, service_role;
