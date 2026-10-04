-- Expired plan: editing locked (falls back to Free → only the first card), public card still visible
-- (acceptance criterion 3 / SEC-03 / PUB-01)
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email, aud, role) values
  ('33333333-0000-4000-8000-000000000001', 't-exp@test.mn', 'authenticated', 'authenticated');
insert into public.subscriptions (id, owner_user_id, plan_id, status, current_period_start, current_period_end)
values ('33333333-0000-4000-8000-0000000000aa', '33333333-0000-4000-8000-000000000001', 'pro', 'active', now() - interval '1 month', now() + interval '1 day');
insert into public.cards (id, owner_id, slug, first_name, is_published, created_at) values
  ('33333333-0000-4000-8000-0000000000c1', '33333333-0000-4000-8000-000000000001', 'exp-card-1', 'One', true, now()),
  ('33333333-0000-4000-8000-0000000000c2', '33333333-0000-4000-8000-000000000001', 'exp-card-2', 'Two', true, now());
update public.cards set created_at = now() - interval '2 days' where id = '33333333-0000-4000-8000-0000000000c1';
-- plan ends
update public.subscriptions set status = 'expired', current_period_end = now() - interval '1 day'
 where id = '33333333-0000-4000-8000-0000000000aa';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is(public.can_edit_card('33333333-0000-4000-8000-0000000000c2'), false, 'Expired user cannot edit the 2nd card');

with u as (
  update public.cards set title = 'hacked' where id = '33333333-0000-4000-8000-0000000000c2' returning 1
) select is((select count(*)::int from u), 0, 'Direct REST UPDATE of a locked card changes 0 rows');

select throws_ok(
  $$insert into public.cards (owner_id, slug, first_name) values (auth.uid(), 'exp-card-3', 'Three')$$,
  '42501', 'card_quota_exceeded', 'Expired user cannot create a new card');

select is(public.has_active_plan(auth.uid()), false, 'has_active_plan() is false after expiry');
select is(public.can_edit_card('33333333-0000-4000-8000-0000000000c1'), true, 'First card remains editable (Free fallback)');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*)::int from public.public_cards where slug in ('exp-card-1', 'exp-card-2')), 2,
  'Both cards remain visible via public_cards');
select is((select count(*)::int from public.cards), 0, 'anon cannot read the cards table directly');

select * from finish();
rollback;
