-- =============================================================================
-- Digital Card — 0009_growth: annual billing, referrals, slug lock after publish,
-- viral branding flag on free public cards, AI assist daily quota.
-- See docs/DECISIONS.md D-39..D-45.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Annual billing (prices stay in the plans table only)
-- -----------------------------------------------------------------------------
alter table public.plans
  add column price_annual_mnt          int not null default 0 check (price_annual_mnt >= 0),
  add column price_per_seat_annual_mnt int not null default 0 check (price_per_seat_annual_mnt >= 0);

update public.plans set price_annual_mnt = 79000 where id = 'pro';             -- ≈ 8 months of 9,900₮
update public.plans set price_per_seat_annual_mnt = 50000 where id = 'team';   -- 10 months of 5,000₮

alter table public.payments
  add column period text not null default 'month' check (period in ('month', 'year'));

drop function public.create_pending_payment(uuid, text, uuid, int);

create or replace function public.create_pending_payment(
  p_user    uuid,
  p_plan_id text,
  p_org_id  uuid default null,
  p_seats   int  default null,
  p_period  text default 'month'
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
  yearly  boolean := coalesce(p_period, 'month') = 'year';
begin
  if coalesce(p_period, 'month') not in ('month', 'year') then
    raise exception 'invalid_period' using errcode = 'P0001';
  end if;

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
    amount := (case when yearly then pl.price_per_seat_annual_mnt else pl.price_per_seat_mnt end) * seats;

    select s.id into sub_id from public.subscriptions s where s.org_id = p_org_id;
    if sub_id is null then
      insert into public.subscriptions (org_id, plan_id, seats, status)
      values (p_org_id, pl.id, seats, 'pending') returning id into sub_id;
    end if;
  else
    if p_org_id is not null then
      raise exception 'org_not_allowed_for_plan' using errcode = 'P0001';
    end if;
    amount := case when yearly then pl.price_annual_mnt else pl.price_mnt end;
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

  insert into public.payments (subscription_id, plan_id, seats, sender_invoice_no, amount_mnt, status, period)
  values (sub_id, pl.id, seats, inv_no, amount, 'pending', case when yearly then 'year' else 'month' end)
  returning id into pay_id;

  insert into public.audit_log (actor_id, action, entity, entity_id, meta)
  values (p_user, 'payment.create', 'payments', pay_id::text,
          jsonb_build_object('plan_id', pl.id, 'seats', seats, 'amount_mnt', amount, 'org_id', p_org_id,
                             'period', case when yearly then 'year' else 'month' end));

  return query select pay_id, inv_no, amount, sub_id,
    format('Digital Card %s%s%s', pl.name_en,
           case when pl.id = 'team' then format(' x%s', seats) else '' end,
           case when yearly then ' (1 year)' else '' end);
end;
$$;

revoke execute on function public.create_pending_payment(uuid, text, uuid, int, text) from public, anon, authenticated;
grant execute on function public.create_pending_payment(uuid, text, uuid, int, text) to service_role;

-- -----------------------------------------------------------------------------
-- 2. Referrals: every profile has a code; the referrer gets +1 month Pro when the
--    referred user's first payment is confirmed (server-side check only).
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column referral_code        text not null default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  add column referred_by          uuid references auth.users (id) on delete set null,
  add column referral_rewarded_at timestamptz,
  add column onboarded_at         timestamptz;

create unique index profiles_referral_code_uidx on public.profiles (referral_code);
create index profiles_referred_by_idx on public.profiles (referred_by) where referred_by is not null;

create or replace function public.profiles_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_client_request() and (
       new.role is distinct from old.role
       or new.id is distinct from old.id
       or new.referral_code is distinct from old.referral_code
       or new.referred_by is distinct from old.referred_by
       or new.referral_rewarded_at is distinct from old.referral_rewarded_at) then
    raise exception 'role_change_forbidden' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ref_code text := lower(nullif(trim(new.raw_user_meta_data ->> 'ref'), ''));
  referrer uuid;
begin
  if ref_code is not null then
    select p.id into referrer from public.profiles p where p.referral_code = ref_code;
  end if;

  insert into public.profiles (id, full_name, locale, referred_by)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'mn' end,
    case when referrer is distinct from new.id then referrer end
  )
  on conflict (id) do nothing;

  -- Auto-link pending org invitations sent to this e-mail
  update public.org_members m
     set user_id = new.id
   where m.invited_email = lower(new.email) and m.user_id is null;

  return new;
end;
$$;

-- For sign-ups that could not carry ?ref= (e.g. OAuth): claim within 7 days, before any payment.
create or replace function public.claim_referral(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid      uuid := auth.uid();
  me       public.profiles%rowtype;
  referrer uuid;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into me from public.profiles p where p.id = uid for update;
  if me.referred_by is not null then
    return 'already_claimed';
  end if;
  if me.created_at < now() - interval '7 days' then
    raise exception 'referral_window_closed' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.payments pay join public.subscriptions s on s.id = pay.subscription_id
              where s.owner_user_id = uid and pay.status = 'paid') then
    raise exception 'referral_window_closed' using errcode = 'P0001';
  end if;
  select p.id into referrer from public.profiles p where p.referral_code = lower(trim(p_code));
  if referrer is null or referrer = uid then
    raise exception 'referral_invalid' using errcode = 'P0001';
  end if;
  update public.profiles set referred_by = referrer where id = uid;
  insert into public.audit_log (actor_id, action, entity, entity_id) values (uid, 'referral.claim', 'profiles', uid::text);
  return 'claimed';
end;
$$;

-- Grants the reward (idempotent per referred user). Called inside apply_payment_check.
create or replace function public.reward_referral(p_payer uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  me       public.profiles%rowtype;
  sub      public.subscriptions%rowtype;
begin
  select * into me from public.profiles p where p.id = p_payer for update;
  if not found or me.referred_by is null or me.referral_rewarded_at is not null then
    return false;
  end if;

  update public.profiles set referral_rewarded_at = now() where id = p_payer;

  select * into sub from public.subscriptions s where s.owner_user_id = me.referred_by for update;
  if not found then
    insert into public.subscriptions (owner_user_id, plan_id, seats, status, current_period_start, current_period_end)
    values (me.referred_by, 'pro', 1, 'active', now(), now() + interval '1 month');
  elsif sub.status = 'active' and sub.current_period_end > now() then
    update public.subscriptions set current_period_end = current_period_end + interval '1 month' where id = sub.id;
  else
    update public.subscriptions
       set plan_id = 'pro', seats = 1, status = 'active',
           current_period_start = now(), current_period_end = now() + interval '1 month'
     where id = sub.id;
  end if;

  insert into public.audit_log (action, entity, entity_id, meta)
  values ('referral.reward', 'profiles', me.referred_by::text, jsonb_build_object('referred', p_payer));
  return true;
end;
$$;

revoke execute on function public.claim_referral(text) from public, anon;
grant execute on function public.claim_referral(text) to authenticated;
revoke execute on function public.reward_referral(uuid) from public, anon, authenticated;
grant execute on function public.reward_referral(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- 3. apply_payment_check: period length from the payment + referral reward
-- -----------------------------------------------------------------------------
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
  pay    public.payments%rowtype;
  sub    public.subscriptions%rowtype;
  base   timestamptz;
  span   interval;
  payer  uuid;
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

  span := case when pay.period = 'year' then interval '1 year' else interval '1 month' end;
  base := greatest(now(), coalesce(sub.current_period_end, now()));

  update public.subscriptions
     set plan_id = pay.plan_id,
         seats = pay.seats,
         status = 'active',
         current_period_start = case when sub.status = 'active' and sub.current_period_end > now()
                                     then sub.current_period_start else now() end,
         current_period_end = base + span
   where id = sub.id;

  update public.payments
     set status = 'paid', paid_at = now(), paid_amount_mnt = p_paid_amount, qpay_payment_id = p_qpay_payment_id
   where id = pay.id;

  insert into public.audit_log (action, entity, entity_id, meta)
  values ('payment.paid', 'payments', pay.id::text,
          jsonb_build_object('subscription_id', sub.id, 'plan_id', pay.plan_id, 'period', pay.period,
                             'period_end', base + span));

  payer := coalesce(sub.owner_user_id, (select o.owner_id from public.organizations o where o.id = sub.org_id));
  if payer is not null then
    perform public.reward_referral(payer);
  end if;

  return 'paid';
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Slug lock: once a card has been published its URL (printed QR codes!) never changes.
-- -----------------------------------------------------------------------------
alter table public.cards add column published_at timestamptz;
update public.cards set published_at = created_at where is_published;

create or replace function public.cards_slug_lock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_published then
      new.published_at := now();
    else
      new.published_at := null;
    end if;
    return new;
  end if;

  if old.published_at is not null then
    new.published_at := old.published_at;
    if new.slug is distinct from old.slug and public.is_client_request() then
      raise exception 'slug_locked' using errcode = '42501';
    end if;
  elsif new.is_published then
    new.published_at := now();
  else
    new.published_at := null;
  end if;
  return new;
end;
$$;

-- Named so it runs after cards_before_insert/update (triggers fire in name order).
create trigger cards_slug_lock
  before insert or update on public.cards
  for each row execute function public.cards_slug_lock();

-- -----------------------------------------------------------------------------
-- 5. Public view: show_branding → «Made with Digital Card» on free personal cards
-- -----------------------------------------------------------------------------
create or replace view public.public_cards
with (security_invoker = false, security_barrier = true)
as
select
  c.id,
  c.slug,
  c.template_id,
  c.color_scheme,
  c.last_name,
  c.first_name,
  c.name_format,
  c.title,
  c.company,
  c.phone,
  c.email,
  c.website,
  c.address,
  c.bio,
  c.slogan,
  c.avatar_path,
  c.logo_path,
  o.name        as org_name,
  o.brand_color as org_brand_color,
  o.logo_path   as org_logo_path,
  coalesce((
    select jsonb_agg(jsonb_build_object('kind', l.kind, 'label', l.label, 'url', l.url) order by l.sort, l.id)
    from public.card_links l where l.card_id = c.id
  ), '[]'::jsonb) as links,
  c.updated_at,
  (c.org_id is null and not public.has_active_plan(c.owner_id)) as show_branding
from public.cards c
left join public.organizations o on o.id = c.org_id
where c.is_published and c.deleted_at is null;

revoke all on public.public_cards from anon, authenticated;
grant select on public.public_cards to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. AI assist quota (Edge Function ai-assist; no chatbot)
-- -----------------------------------------------------------------------------
create table public.ai_usage (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null default (now() at time zone 'Asia/Ulaanbaatar')::date,
  used     int  not null default 0 check (used >= 0),
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create policy ai_usage_select_own on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.ai_usage from anon, authenticated;

create or replace function public.ai_daily_limit(uid uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.has_active_plan(uid) then 100 else 3 end;
$$;

-- Reserves one AI call. CRM tasks need a plan with CRM. Raises when the daily quota is used up.
create or replace function public.consume_ai_credit(p_user uuid, p_task text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  lim   int := public.ai_daily_limit(p_user);
  today date := (now() at time zone 'Asia/Ulaanbaatar')::date;
  n     int;
begin
  if p_task not in ('bio', 'scan', 'note', 'followup') then
    raise exception 'invalid_task' using errcode = 'P0001';
  end if;
  if p_task in ('note', 'followup') and not public.crm_enabled(p_user) then
    raise exception 'crm_not_enabled' using errcode = '42501';
  end if;

  insert into public.ai_usage (user_id, day, used) values (p_user, today, 1)
  on conflict (user_id, day) do update set used = public.ai_usage.used + 1
  returning used into n;

  if n > lim then
    update public.ai_usage set used = used - 1 where user_id = p_user and day = today;
    raise exception 'ai_quota_exceeded' using errcode = 'P0001';
  end if;
  return lim - n;
end;
$$;

-- Gives the credit back when the model call failed (not the user's fault).
create or replace function public.refund_ai_credit(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage set used = greatest(used - 1, 0)
   where user_id = p_user and day = (now() at time zone 'Asia/Ulaanbaatar')::date;
$$;

revoke execute on function public.ai_daily_limit(uuid) from public, anon;
grant execute on function public.ai_daily_limit(uuid) to authenticated, service_role;
revoke execute on function public.consume_ai_credit(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_ai_credit(uuid, text) to service_role;
revoke execute on function public.refund_ai_credit(uuid) from public, anon, authenticated;
grant execute on function public.refund_ai_credit(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- 7. Entitlements + growth summary for the UI
-- -----------------------------------------------------------------------------
create or replace function public.get_my_entitlements()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  personal public.subscriptions%rowtype;
  result jsonb;
begin
  if uid is null then
    return null;
  end if;

  select * into personal from public.subscriptions s where s.owner_user_id = uid;

  select jsonb_build_object(
    'has_active_plan', public.has_active_plan(uid),
    'plan_ids', coalesce((select jsonb_agg(distinct p.id) from public.active_plans(uid) p), '[]'::jsonb),
    'personal_plan_id', case when personal.status = 'active' and personal.current_period_end > now() then personal.plan_id else 'free' end,
    'personal_period_end', personal.current_period_end,
    'personal_expired', public.is_personal_plan_expired(uid),
    'card_quota', public.card_quota(uid),
    'personal_card_count', (select count(*) from public.cards c where c.owner_id = uid and c.org_id is null and c.deleted_at is null),
    'crm_enabled', public.crm_enabled(uid),
    'contact_limit', public.contact_limit(uid),
    'contact_count', (select count(*) from public.contacts c where c.owner_id = uid),
    'editable_card_ids', coalesce((
      select jsonb_agg(c.id) from public.cards c
       where c.deleted_at is null
         and (c.owner_id = uid or (c.org_id is not null and public.is_org_admin(c.org_id)))
         and public.can_edit_card(c.id)
    ), '[]'::jsonb),
    'orgs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'org_id', m.org_id, 'role', m.role, 'status', m.status, 'name', o.name,
        'active', public.org_has_active_plan(m.org_id),
        'allow_employee_edit_fields', o.allow_employee_edit_fields,
        'locked_template_id', o.locked_template_id))
        from public.org_members m join public.organizations o on o.id = m.org_id
       where m.user_id = uid
    ), '[]'::jsonb),
    'is_admin', exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin'),
    'ai_daily_limit', public.ai_daily_limit(uid),
    'ai_used_today', coalesce((select u.used from public.ai_usage u
                                where u.user_id = uid and u.day = (now() at time zone 'Asia/Ulaanbaatar')::date), 0)
  ) into result;

  return result;
end;
$$;

-- Onboarding checklist + referral summary (one round-trip for the dashboard).
create or replace function public.get_my_growth()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'referral_code', p.referral_code,
    'invited', (select count(*) from public.profiles r where r.referred_by = p.id),
    'rewarded', (select count(*) from public.profiles r where r.referred_by = p.id and r.referral_rewarded_at is not null),
    'onboarded_at', p.onboarded_at,
    'has_card', exists (select 1 from public.cards c where c.owner_id = p.id and c.deleted_at is null),
    'has_published', exists (select 1 from public.cards c where c.owner_id = p.id and c.published_at is not null and c.deleted_at is null),
    'has_photo', exists (select 1 from public.cards c where c.owner_id = p.id and c.avatar_path is not null and c.deleted_at is null),
    'has_links', exists (select 1 from public.card_links l join public.cards c on c.id = l.card_id where c.owner_id = p.id and c.deleted_at is null),
    'has_shared', exists (select 1 from public.card_events e join public.cards c on c.id = e.card_id
                           where c.owner_id = p.id and e.event in ('view', 'qr_open')),
    'has_contact', exists (select 1 from public.contacts ct where ct.owner_id = p.id)
  )
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke execute on function public.get_my_growth() from public, anon;
grant execute on function public.get_my_growth() to authenticated;
