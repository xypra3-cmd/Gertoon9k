-- =============================================================================
-- Digital Card — 0012_hardening: security audit fixes (docs/SECURITY_AUDIT.md).
--   A-01 Least privilege on tables: no TRUNCATE/TRIGGER/REFERENCES for API roles, anon reads
--        only plans + public_cards and writes nothing directly.
--   A-02 Entitlement helpers (plan, quota, limits of ANY user id) are no longer callable
--        through the API; only SECURITY DEFINER functions/triggers use them.
--   A-03 Future functions are not executable by anon unless granted explicitly.
--   A-04 Storage: listing the public buckets no longer reveals every user's folder (user id).
--   A-05 Network-level rate limit buckets (keyed by a daily-rotating HMAC of the IP, never
--        the IP itself) so rotating the User-Agent cannot bypass visitor limits.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A-01 Table privileges
-- -----------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p')
  loop
    execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', t.relname);
    execute format('revoke insert, update, delete on public.%I from anon', t.relname);
    if t.relname not in ('plans', 'public_cards') then
      execute format('revoke select on public.%I from anon', t.relname);
    end if;
  end loop;
end;
$$;
-- Read-only aggregate view.
revoke insert, update, delete on public.card_daily_stats from authenticated;
-- Server-only tables: clients never touch them, not even through RLS.
revoke all on public.email_queue, public.nearby_pulses from anon, authenticated;

alter default privileges in schema public revoke truncate, trigger, references on tables from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon;

-- -----------------------------------------------------------------------------
-- A-02 / A-03 Function privileges
-- -----------------------------------------------------------------------------
revoke execute on function public.active_plans(uuid) from public, anon, authenticated;
revoke execute on function public.has_active_plan(uuid) from public, anon, authenticated;
revoke execute on function public.card_quota(uuid) from public, anon, authenticated;
revoke execute on function public.contact_limit(uuid) from public, anon, authenticated;
revoke execute on function public.crm_enabled(uuid) from public, anon, authenticated;
revoke execute on function public.is_personal_plan_expired(uuid) from public, anon, authenticated;
revoke execute on function public.org_paid_seats(uuid) from public, anon, authenticated;
revoke execute on function public.org_has_active_plan(uuid) from public, anon, authenticated;
revoke execute on function public.ai_daily_limit(uuid) from public, anon, authenticated;

-- Caller-scoped helpers used by RLS policies: authenticated only.
revoke execute on function public.can_view_card(uuid) from public, anon;
revoke execute on function public.can_edit_card(uuid) from public, anon;
revoke execute on function public.can_edit_card_links(uuid) from public, anon;
revoke execute on function public.is_org_admin(uuid) from public, anon;
revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.is_platform_admin() from public, anon;

-- Trigger functions are never called directly.
do $$
declare
  f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end;
$$;

alter default privileges in schema public revoke execute on functions from public, anon;

-- -----------------------------------------------------------------------------
-- A-04 Storage: public URLs keep working (public buckets); listing is owner-only.
-- -----------------------------------------------------------------------------
drop policy if exists "card images: public read" on storage.objects;
create policy "card images: owner list"
  on storage.objects for select to authenticated
  using (bucket_id in ('avatars', 'logos') and (storage.foldername(name))[1] = (select auth.uid())::text);

-- -----------------------------------------------------------------------------
-- A-05 Rate limit buckets (service role only)
-- -----------------------------------------------------------------------------
create table public.rate_buckets (
  key          text not null check (char_length(key) <= 200),
  window_start timestamptz not null,
  hits         int not null default 0,
  primary key (key, window_start)
);
alter table public.rate_buckets enable row level security;
revoke all on public.rate_buckets from anon, authenticated;

-- Counts one hit for `p_key` in the current fixed window; true while hits <= p_max.
create or replace function public.rate_hit(p_key text, p_window_seconds int, p_max int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  w    timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n    int;
begin
  insert into public.rate_buckets as b (key, window_start, hits) values (left(p_key, 200), w, 1)
  on conflict (key, window_start) do update set hits = b.hits + 1
  returning b.hits into n;
  return n <= p_max;
end;
$$;
revoke execute on function public.rate_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_hit(text, int, int) to service_role;

select cron.schedule('rate-buckets-cleanup', '17 * * * *',
  $$delete from public.rate_buckets where window_start < now() - interval '1 day'$$);
