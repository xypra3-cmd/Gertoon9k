-- User A cannot read or write user B's cards, links, contacts, events, payments, subscriptions
-- (acceptance criterion 4 / SEC-01)
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email, aud, role) values
  ('44444444-0000-4000-8000-00000000000a', 't-a@test.mn', 'authenticated', 'authenticated'),
  ('44444444-0000-4000-8000-00000000000b', 't-b@test.mn', 'authenticated', 'authenticated');
insert into public.subscriptions (id, owner_user_id, plan_id, status, current_period_start, current_period_end)
values ('44444444-0000-4000-8000-0000000000b5', '44444444-0000-4000-8000-00000000000b', 'pro', 'active', now(), now() + interval '1 month');
insert into public.cards (id, owner_id, slug, first_name, is_published) values
  ('44444444-0000-4000-8000-0000000000bc', '44444444-0000-4000-8000-00000000000b', 'user-b-card', 'B', true);
insert into public.card_links (card_id, kind, url) values ('44444444-0000-4000-8000-0000000000bc', 'website', 'https://b.example.mn');
insert into public.contacts (id, owner_id, name) values ('44444444-0000-4000-8000-0000000000bd', '44444444-0000-4000-8000-00000000000b', 'B contact');
insert into public.card_events (card_id, event, visitor_hash) values
  ('44444444-0000-4000-8000-0000000000bc', 'view', encode(extensions.digest('v', 'sha256'), 'hex'));
insert into public.payments (subscription_id, plan_id, sender_invoice_no, amount_mnt) values
  ('44444444-0000-4000-8000-0000000000b5', 'pro', 'TEST-B-1', 9900);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-0000-4000-8000-00000000000a","role":"authenticated"}', true);

-- SELECT
select is((select count(*)::int from public.cards where owner_id = '44444444-0000-4000-8000-00000000000b'), 0, 'A cannot select B cards');
select is((select count(*)::int from public.card_links), 0, 'A cannot select B card links');
select is((select count(*)::int from public.contacts), 0, 'A cannot select B contacts');
select is((select count(*)::int from public.card_events), 0, 'A cannot select B events');
select is((select count(*)::int from public.card_daily_stats), 0, 'A cannot select B daily stats');
select is((select count(*)::int from public.payments), 0, 'A cannot select B payments');
select is((select count(*)::int from public.subscriptions), 0, 'A cannot select B subscriptions');
select is((select count(*)::int from public.get_card_stats(array['44444444-0000-4000-8000-0000000000bc'::uuid])), 0, 'A gets no stats for B card');

-- UPDATE / DELETE (RLS filters → 0 rows)
with u as (update public.cards set title = 'x' where id = '44444444-0000-4000-8000-0000000000bc' returning 1)
select is((select count(*)::int from u), 0, 'A cannot update B card');
with u as (update public.contacts set name = 'x' where id = '44444444-0000-4000-8000-0000000000bd' returning 1)
select is((select count(*)::int from u), 0, 'A cannot update B contact');
with d as (delete from public.contacts where id = '44444444-0000-4000-8000-0000000000bd' returning 1)
select is((select count(*)::int from d), 0, 'A cannot delete B contact');
with d as (delete from public.card_links where card_id = '44444444-0000-4000-8000-0000000000bc' returning 1)
select is((select count(*)::int from d), 0, 'A cannot delete B links');

-- INSERT
select throws_ok($$insert into public.contacts (owner_id, name) values ('44444444-0000-4000-8000-00000000000b', 'spam')$$,
  '42501', null, 'A cannot insert a contact into B account');
select throws_ok($$insert into public.card_links (card_id, kind, url) values ('44444444-0000-4000-8000-0000000000bc', 'custom', 'https://evil.example')$$,
  '42501', null, 'A cannot add links to B card');
select throws_ok($$insert into public.card_events (card_id, event, visitor_hash) values ('44444444-0000-4000-8000-0000000000bc', 'view', repeat('a', 64))$$,
  '42501', null, 'Clients cannot insert card_events directly');
select throws_ok($$update public.payments set status = 'paid'$$, '42501', null, 'Clients cannot update payments');
select throws_ok($$insert into public.subscriptions (owner_user_id, plan_id, status) values (auth.uid(), 'pro', 'active')$$,
  '42501', null, 'Clients cannot create subscriptions');

-- B still sees its own data
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select is((select count(*)::int from public.contacts), 1, 'B sees its own contact (sanity)');

select * from finish();
rollback;
