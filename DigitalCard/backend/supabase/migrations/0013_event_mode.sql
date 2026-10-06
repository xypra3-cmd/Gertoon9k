-- =============================================================================
-- Digital Card — 0013_event_mode: «Эвент горим».
-- While an event is active (CRM plans only), every new contact of that user — guest
-- exchange, nearby bump/code, QR "add to my contacts", manual — is stamped with
-- met_where = the event, met_at = today and the event name as a tag. No UI can forget it.
-- Event state is changed only through RPCs (validated here); clients cannot write the columns.
-- =============================================================================

alter table public.profiles
  add column event_name       text check (char_length(event_name) between 1 and 80),
  add column event_started_at timestamptz,
  add column event_until      timestamptz;

-- Clients may not write event (or the earlier protected) columns directly.
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
       or new.referral_rewarded_at is distinct from old.referral_rewarded_at
       or ((new.event_name is distinct from old.event_name
            or new.event_started_at is distinct from old.event_started_at
            or new.event_until is distinct from old.event_until)
           and coalesce(current_setting('app.event_rpc', true), '') <> 'on')) then
    raise exception 'role_change_forbidden' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Stamp new contacts. Fires before contacts_before_write (trigger names sort alphabetically),
-- and only for CRM plans, so the CRM guard there never sees fields the plan may not use.
create or replace function public.contacts_event_stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev  public.profiles%rowtype;
  tag text;
begin
  select * into ev from public.profiles p where p.id = new.owner_id;
  if ev.event_name is null or ev.event_until is null or ev.event_until <= now()
     or not public.crm_enabled(new.owner_id) then
    return new;
  end if;
  if new.met_where_text is null then
    new.met_where_type := 'event';
    new.met_where_text := ev.event_name;
  end if;
  new.met_at := coalesce(new.met_at, (now() at time zone 'Asia/Ulaanbaatar')::date);
  tag := left(ev.event_name, 40);
  if not (tag = any (new.tags)) then
    new.tags := array_append(new.tags, tag);
  end if;
  return new;
end;
$$;
revoke execute on function public.contacts_event_stamp() from public, anon, authenticated;

create trigger contacts_aa_event_stamp
  before insert on public.contacts
  for each row execute function public.contacts_event_stamp();

-- -----------------------------------------------------------------------------
-- RPCs
-- -----------------------------------------------------------------------------
create or replace function public.start_event(p_name text, p_hours int default 12)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  n   text := btrim(coalesce(p_name, ''));
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not public.crm_enabled(uid) then
    raise exception 'crm_not_enabled' using errcode = '42501';
  end if;
  if char_length(n) not between 1 and 80 or coalesce(p_hours, 0) not between 1 and 72 then
    raise exception 'invalid_event' using errcode = 'P0001';
  end if;
  perform set_config('app.event_rpc', 'on', true);
  update public.profiles
     set event_name = n, event_started_at = now(), event_until = now() + make_interval(hours => p_hours)
   where id = uid;
  perform set_config('app.event_rpc', 'off', true);
  return public.get_my_event();
end;
$$;

create or replace function public.stop_event()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.event_rpc', 'on', true);
  update public.profiles set event_until = now() where id = auth.uid() and event_until > now();
  perform set_config('app.event_rpc', 'off', true);
end;
$$;

-- Current (or last) event with the number of people met there.
create or replace function public.get_my_event()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when p.event_name is null then null else jsonb_build_object(
    'name', p.event_name,
    'started_at', p.event_started_at,
    'until', p.event_until,
    'active', p.event_until > now(),
    'contacts', (select count(*) from public.contacts c
                  where c.owner_id = p.id and c.created_at >= p.event_started_at
                    and c.met_where_type = 'event' and c.met_where_text = p.event_name)
  ) end
  from public.profiles p where p.id = auth.uid();
$$;

revoke execute on function public.start_event(text, int) from public, anon;
revoke execute on function public.stop_event() from public, anon;
revoke execute on function public.get_my_event() from public, anon;
grant execute on function public.start_event(text, int) to authenticated;
grant execute on function public.stop_event() to authenticated;
grant execute on function public.get_my_event() to authenticated;
