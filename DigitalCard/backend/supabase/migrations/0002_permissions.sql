-- =============================================================================
-- Digital Card — 0002_permissions: entitlement functions + guard triggers
--
-- Error contract: guard failures raise SQLSTATE 42501 (PostgREST → HTTP 403) or
-- P0001 (→ 400) with a stable machine-readable MESSAGE key, e.g. 'card_quota_exceeded'.
-- Frontends translate these keys (packages/shared/i18n: errors.<key>).
-- =============================================================================

-- True when the request comes from an end-user client (JWT role anon/authenticated),
-- false for service_role (edge functions), cron jobs and direct postgres sessions.
-- Uses the JWT claim, so it also works inside SECURITY DEFINER functions.
create or replace function public.is_client_request()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.role(), '') in ('anon', 'authenticated');
$$;

-- -----------------------------------------------------------------------------
-- Organization helpers
-- -----------------------------------------------------------------------------
create or replace function public.is_org_admin(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = org
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = org and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.org_has_active_plan(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.org_id = org and s.status = 'active' and s.current_period_end > now()
  );
$$;

-- Paid seats of the org's active subscription (0 when none).
create or replace function public.org_paid_seats(org uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select s.seats from public.subscriptions s
    where s.org_id = org and s.status = 'active' and s.current_period_end > now()
  ), 0);
$$;

-- -----------------------------------------------------------------------------
-- Plan / entitlement helpers
-- -----------------------------------------------------------------------------

-- Plans of all currently active subscriptions of a user (personal + orgs where active member).
create or replace function public.active_plans(uid uuid)
returns setof public.plans
language sql
stable
security definer
set search_path = ''
as $$
  select p.*
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.status = 'active'
    and s.current_period_end > now()
    and (
      s.owner_user_id = uid
      or s.org_id in (select m.org_id from public.org_members m where m.user_id = uid and m.status = 'active')
    );
$$;

create or replace function public.has_active_plan(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.active_plans(uid));
$$;

-- A user whose personal subscription was activated once and is no longer active
-- (informational for UIs; entitlements fall back to the Free plan).
create or replace function public.is_personal_plan_expired(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.owner_user_id = uid
      and s.current_period_end is not null
      and not (s.status = 'active' and s.current_period_end > now())
  );
$$;

-- Personal card quota: card_limit of the active personal plan, otherwise the free plan's.
-- (Org cards are governed by the org's Team plan, see cards_before_insert.)
create or replace function public.card_quota(uid uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select max(p.card_limit)
       from public.subscriptions s join public.plans p on p.id = s.plan_id
      where s.owner_user_id = uid and s.status = 'active' and s.current_period_end > now()),
    (select p.card_limit from public.plans p where p.id = 'free'),
    1
  );
$$;

create or replace function public.crm_enabled(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select bool_or(p.crm_enabled) from public.active_plans(uid) p), false);
$$;

-- null = unlimited
create or replace function public.contact_limit(uid uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not exists (select 1 from public.active_plans(uid))
      then (select p.contact_limit from public.plans p where p.id = 'free')
    when exists (select 1 from public.active_plans(uid) p where p.contact_limit is null)
      then null
    else (select max(p.contact_limit) from public.active_plans(uid) p)
  end;
$$;

-- Platform admin. Requires MFA (aal2) in the JWT.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
     and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- Owner or org admin may see the full card row.
create or replace function public.can_view_card(card uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cards c
    where c.id = card
      and (c.owner_id = auth.uid() or (c.org_id is not null and public.is_org_admin(c.org_id)))
  );
$$;

-- Edit permission (row level). Org employees get further column restrictions in cards_before_update.
create or replace function public.can_edit_card(card_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid  uuid := auth.uid();
  c    public.cards%rowtype;
  rnk  int;
begin
  if uid is null then
    return false;
  end if;

  select * into c from public.cards where id = card_id;
  if not found or c.deleted_at is not null then
    return false;
  end if;

  -- Organization card
  if c.org_id is not null then
    if not public.org_has_active_plan(c.org_id) then
      return false;
    end if;
    if public.is_org_admin(c.org_id) then
      return true;
    end if;
    return c.owner_id = uid and public.is_org_member(c.org_id);
  end if;

  -- Personal card. An expired plan falls back to Free (see docs/DECISIONS.md D-03):
  -- only the first card stays editable, the rest stay public but locked.
  if c.owner_id <> uid then
    return false;
  end if;

  -- Free: only the first created card; Pro: first card_limit cards (downgrade-safe).
  select count(*) into rnk
  from public.cards x
  where x.owner_id = uid
    and x.org_id is null
    and x.deleted_at is null
    and (x.created_at, x.id) <= (c.created_at, c.id);

  return rnk <= public.card_quota(uid);
end;
$$;

create or replace function public.can_edit_card_links(card_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.cards%rowtype;
begin
  if not public.can_edit_card(card_id) then
    return false;
  end if;
  select * into c from public.cards where id = card_id;
  if c.org_id is null or public.is_org_admin(c.org_id) then
    return true;
  end if;
  return exists (
    select 1 from public.organizations o
    where o.id = c.org_id and 'links' = any (o.allow_employee_edit_fields)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Generic updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'mn' end
  )
  on conflict (id) do nothing;

  -- Auto-link pending org invitations sent to this e-mail
  update public.org_members m
     set user_id = new.id
   where m.invited_email = lower(new.email) and m.user_id is null;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.profiles_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_client_request() and (new.role is distinct from old.role or new.id is distinct from old.id) then
    raise exception 'role_change_forbidden' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

-- -----------------------------------------------------------------------------
-- organizations / org_members
-- -----------------------------------------------------------------------------
create or replace function public.organizations_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.org_members (org_id, user_id, role, status, invited_email)
  values (new.id, new.owner_id, 'owner', 'active', null)
  on conflict (org_id, user_id) do nothing;
  return new;
end;
$$;

create trigger organizations_after_insert
  after insert on public.organizations
  for each row execute function public.organizations_after_insert();

create or replace function public.organizations_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_client_request() and new.owner_id is distinct from old.owner_id then
    raise exception 'org_owner_change_forbidden' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger organizations_before_update
  before update on public.organizations
  for each row execute function public.organizations_before_update();

-- Seat enforcement for every insert path (REST, org-invite function, service role).
create or replace function public.org_members_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  used int;
begin
  new.invited_email := lower(new.invited_email);

  -- The owner row is created together with the organization.
  if new.role = 'owner' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('org_seats:' || new.org_id::text, 0));
  select count(*) into used from public.org_members m where m.org_id = new.org_id;
  if used >= public.org_paid_seats(new.org_id) then
    raise exception 'seat_limit_reached' using errcode = '42501',
      hint = format('paid seats: %s, used: %s', public.org_paid_seats(new.org_id), used);
  end if;
  return new;
end;
$$;

create trigger org_members_before_insert
  before insert on public.org_members
  for each row execute function public.org_members_before_insert();

create or replace function public.org_members_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_client_request() then
    if new.org_id is distinct from old.org_id or new.user_id is distinct from old.user_id
       or new.invited_email is distinct from old.invited_email then
      raise exception 'org_member_immutable' using errcode = '42501';
    end if;
    if old.role = 'owner' or new.role = 'owner' then
      raise exception 'org_owner_change_forbidden' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger org_members_before_update
  before update on public.org_members
  for each row execute function public.org_members_before_update();

-- Invited user accepts membership (matched by e-mail).
create or replace function public.accept_org_invite(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := auth.uid();
  mail  text;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select lower(u.email) into mail from auth.users u where u.id = uid;
  update public.org_members m
     set user_id = uid, status = 'active'
   where m.org_id = p_org_id and (m.user_id = uid or m.invited_email = mail) and m.status = 'invited';
  if not found then
    raise exception 'invite_not_found' using errcode = 'P0001';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- cards
-- -----------------------------------------------------------------------------
create or replace function public.cards_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  client   boolean := public.is_client_request();
  used     int;
  org      public.organizations%rowtype;
  per_user int;
begin
  if new.slug is null or new.slug = '' then
    new.slug := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;
  new.slug := lower(new.slug);
  new.deleted_at := null;
  new.created_at := now();
  new.updated_at := now();

  if client and new.owner_id is distinct from auth.uid() then
    raise exception 'card_owner_mismatch' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('cards:' || new.owner_id::text, 0));

  if new.org_id is null then
    select count(*) into used from public.cards c
     where c.owner_id = new.owner_id and c.org_id is null and c.deleted_at is null;
    if used >= public.card_quota(new.owner_id) then
      raise exception 'card_quota_exceeded' using errcode = '42501',
        hint = format('quota: %s', public.card_quota(new.owner_id));
    end if;
  else
    select * into org from public.organizations o where o.id = new.org_id;
    if not found then
      raise exception 'org_not_found' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.org_members m
                    where m.org_id = new.org_id and m.user_id = new.owner_id and m.status = 'active') then
      raise exception 'not_org_member' using errcode = '42501';
    end if;
    if not exists (select 1 from public.subscriptions s
                    where s.org_id = new.org_id and s.status = 'active' and s.current_period_end > now()) then
      raise exception 'plan_expired' using errcode = '42501';
    end if;
    select p.card_limit into per_user from public.plans p where p.id = 'team';
    select count(*) into used from public.cards c
     where c.owner_id = new.owner_id and c.org_id = new.org_id and c.deleted_at is null;
    if used >= coalesce(per_user, 1) then
      raise exception 'card_quota_exceeded' using errcode = '42501', hint = format('quota: %s', per_user);
    end if;
    if org.locked_template_id is not null then
      new.template_id := org.locked_template_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger cards_before_insert
  before insert on public.cards
  for each row execute function public.cards_before_insert();

-- Column-level guard. RLS already ensured can_edit_card() for client updates.
create or replace function public.cards_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  client   boolean := public.is_client_request();
  allowed  text[];
  changed  text[];
  bad      text[];
begin
  new.updated_at := now();

  if not client or current_setting('app.soft_delete', true) = 'on' then
    return new;
  end if;

  if new.owner_id is distinct from old.owner_id
     or new.org_id is distinct from old.org_id
     or new.created_at is distinct from old.created_at then
    raise exception 'card_field_immutable' using errcode = '42501';
  end if;

  -- Restoring a soft-deleted card is not allowed for clients.
  if old.deleted_at is not null and new.deleted_at is null then
    raise exception 'card_deleted' using errcode = '42501';
  end if;

  if old.org_id is not null and not public.is_org_admin(old.org_id) then
    -- Only org admins change the template of an organization card.
    if new.template_id is distinct from old.template_id then
      raise exception 'org_template_locked' using errcode = '42501';
    end if;

    select o.allow_employee_edit_fields into allowed from public.organizations o where o.id = old.org_id;

    select coalesce(array_agg(n.key), '{}') into changed
      from jsonb_each(to_jsonb(new)) n
      join jsonb_each(to_jsonb(old)) o using (key)
     where n.value is distinct from o.value
       and n.key not in ('updated_at', 'deleted_at');

    select coalesce(array_agg(x), '{}') into bad
      from unnest(changed) x
     where not (x = any (coalesce(allowed, '{}')));

    if cardinality(bad) > 0 then
      raise exception 'org_field_locked' using errcode = '42501', hint = array_to_string(bad, ',');
    end if;
  end if;

  return new;
end;
$$;

create trigger cards_before_update
  before update on public.cards
  for each row execute function public.cards_before_update();

-- Client DELETE becomes a soft delete. RLS DELETE policy decides who may do it
-- (owner or org admin) — even when the plan has expired.
create or replace function public.cards_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_client_request() then
    return old; -- service role / cascades: real delete
  end if;
  perform set_config('app.soft_delete', 'on', true);
  update public.cards set deleted_at = now(), is_published = false where id = old.id and deleted_at is null;
  perform set_config('app.soft_delete', 'off', true);
  insert into public.audit_log (actor_id, action, entity, entity_id)
  values (auth.uid(), 'card.soft_delete', 'cards', old.id::text);
  return null;
end;
$$;

create trigger cards_before_delete
  before delete on public.cards
  for each row execute function public.cards_before_delete();

-- -----------------------------------------------------------------------------
-- contacts
-- -----------------------------------------------------------------------------
create or replace function public.contacts_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  client  boolean := public.is_client_request();
  lim     int;
  used    int;
begin
  new.updated_at := now();

  if tg_op = 'INSERT' then
    new.created_at := now();

    if client and new.owner_id is distinct from auth.uid() then
      raise exception 'contact_owner_mismatch' using errcode = '42501';
    end if;
    if client and new.source = 'exchange' then
      raise exception 'exchange_source_forbidden' using errcode = '42501';
    end if;

    -- Contact limit applies to every insert path (REST, exchange, QR).
    perform pg_advisory_xact_lock(hashtextextended('contacts:' || new.owner_id::text, 0));
    lim := public.contact_limit(new.owner_id);
    if lim is not null then
      select count(*) into used from public.contacts c where c.owner_id = new.owner_id;
      if used >= lim then
        raise exception 'contact_limit_reached' using errcode = '42501', hint = format('limit: %s', lim);
      end if;
    end if;
  else
    if client and (new.owner_id is distinct from old.owner_id
                   or new.source is distinct from old.source
                   or new.consent_at is distinct from old.consent_at
                   or new.exchange_message is distinct from old.exchange_message) then
      raise exception 'contact_field_immutable' using errcode = '42501';
    end if;
  end if;

  -- CRM fields only for plans with crm_enabled.
  if client and not public.crm_enabled(new.owner_id) then
    if tg_op = 'INSERT' then
      if new.note is not null or cardinality(new.tags) > 0 or new.status <> 'new'
         or new.follow_up_at is not null or new.last_contacted_at is not null
         or new.met_at is not null or new.met_where_type is not null or new.met_where_text is not null then
        raise exception 'crm_not_enabled' using errcode = '42501';
      end if;
    elsif new.note is distinct from old.note
       or new.tags is distinct from old.tags
       or new.status is distinct from old.status
       or new.follow_up_at is distinct from old.follow_up_at
       or new.last_contacted_at is distinct from old.last_contacted_at
       or new.met_at is distinct from old.met_at
       or new.met_where_type is distinct from old.met_where_type
       or new.met_where_text is distinct from old.met_where_text then
      raise exception 'crm_not_enabled' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger contacts_before_write
  before insert or update on public.contacts
  for each row execute function public.contacts_before_write();

-- -----------------------------------------------------------------------------
-- Function privileges
-- -----------------------------------------------------------------------------
revoke execute on function public.accept_org_invite(uuid) from public, anon;
revoke execute on function public.active_plans(uuid) from public, anon;
revoke execute on function public.has_active_plan(uuid) from public, anon;
revoke execute on function public.card_quota(uuid) from public, anon;
revoke execute on function public.crm_enabled(uuid) from public, anon;
revoke execute on function public.contact_limit(uuid) from public, anon;
revoke execute on function public.is_personal_plan_expired(uuid) from public, anon;
revoke execute on function public.org_paid_seats(uuid) from public, anon;
grant execute on function public.accept_org_invite(uuid) to authenticated;
grant execute on function public.active_plans(uuid) to authenticated, service_role;
grant execute on function public.has_active_plan(uuid) to authenticated, service_role;
grant execute on function public.card_quota(uuid) to authenticated, service_role;
grant execute on function public.crm_enabled(uuid) to authenticated, service_role;
grant execute on function public.contact_limit(uuid) to authenticated, service_role;
grant execute on function public.is_personal_plan_expired(uuid) to authenticated, service_role;
grant execute on function public.org_paid_seats(uuid) to authenticated, service_role;
