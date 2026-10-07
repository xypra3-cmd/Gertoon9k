-- Security audit fixes (0012_hardening, docs/SECURITY_AUDIT.md A-01..A-05)
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- A-01 table privileges
select is((select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind in ('r', 'v')
              and (has_table_privilege('anon', c.oid, 'TRUNCATE') or has_table_privilege('authenticated', c.oid, 'TRUNCATE'))),
  0, 'No API role can TRUNCATE any table (TRUNCATE bypasses RLS)');
select is((select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind in ('r', 'v')
              and (has_table_privilege('anon', c.oid, 'INSERT') or has_table_privilege('anon', c.oid, 'UPDATE')
                   or has_table_privilege('anon', c.oid, 'DELETE'))),
  0, 'anon cannot write any table directly');
select is((select array_agg(c.relname::text order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind in ('r', 'v') and has_table_privilege('anon', c.oid, 'SELECT')),
  array['plans', 'public_cards'], 'anon can read only plans and public_cards');
select ok(not has_table_privilege('authenticated', 'public.email_queue', 'SELECT')
          and not has_table_privilege('authenticated', 'public.nearby_pulses', 'SELECT')
          and not has_table_privilege('authenticated', 'public.rate_buckets', 'SELECT'),
  'Server-only tables are closed to clients');
select ok(not has_table_privilege('authenticated', 'public.card_daily_stats', 'INSERT'), 'Stats view is read-only');

-- A-02 / A-03 function privileges
select ok(not has_function_privilege('authenticated', 'public.card_quota(uuid)', 'EXECUTE')
          and not has_function_privilege('authenticated', 'public.has_active_plan(uuid)', 'EXECUTE')
          and not has_function_privilege('authenticated', 'public.contact_limit(uuid)', 'EXECUTE')
          and not has_function_privilege('authenticated', 'public.org_paid_seats(uuid)', 'EXECUTE'),
  'Plan/quota helpers for arbitrary user ids are not callable by clients');
select ok(not has_function_privilege('anon', 'public.can_view_card(uuid)', 'EXECUTE')
          and not has_function_privilege('anon', 'public.is_platform_admin()', 'EXECUTE'),
  'Caller-scoped helpers are not exposed to anon');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
              and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'))),
  0, 'Trigger functions are not callable through the API');
select ok(has_function_privilege('anon', 'public.card_branding(uuid)', 'EXECUTE')
          and not has_function_privilege('anon', 'public.card_shows_branding(uuid, uuid)', 'EXECUTE'),
  'public_cards uses the card-scoped branding flag; the owner-scoped probe is closed (0014)');

-- Guards still work for clients after the revokes (definer triggers use the helpers).
insert into auth.users (id, email, aud, role) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'harden-a@test.mn', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'harden-b@test.mn', 'authenticated', 'authenticated');
insert into storage.objects (bucket_id, name, owner_id) values
  ('avatars', 'bbbbbbbb-0000-4000-8000-000000000001/a.jpg', 'bbbbbbbb-0000-4000-8000-000000000001'),
  ('avatars', 'bbbbbbbb-0000-4000-8000-000000000002/b.jpg', 'bbbbbbbb-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into public.cards (owner_id, slug, first_name) values (auth.uid(), 'harden-one', 'One');
select throws_ok($$insert into public.cards (owner_id, slug, first_name) values (auth.uid(), 'harden-two', 'Two')$$,
  '42501', 'card_quota_exceeded', 'Card quota still enforced for clients');
select is(public.get_my_entitlements()->>'personal_plan_id', 'free',
  'get_my_entitlements still reports the caller''s own plan');

-- A-04 storage listing
select is((select count(*)::int from storage.objects where bucket_id = 'avatars'), 1,
  'A user lists only their own avatar folder');
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*)::int from storage.objects where bucket_id = 'avatars'), 0,
  'Anonymous visitors cannot enumerate user folders');

-- A-05 rate buckets
reset role;
select is(public.rate_hit('test:k', 3600, 2), true, '1st hit allowed');
select is(public.rate_hit('test:k', 3600, 2), true, '2nd hit allowed');
select is(public.rate_hit('test:k', 3600, 2), false, '3rd hit over the limit');

select * from finish();
rollback;
