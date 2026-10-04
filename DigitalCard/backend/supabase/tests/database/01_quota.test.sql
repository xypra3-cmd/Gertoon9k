-- Quotas: Free 2nd card, Pro 6th card, Team seats (acceptance criterion 2 / SEC-02)
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, aud, role) values
  ('11111111-0000-4000-8000-000000000001', 't-free@test.mn', 'authenticated', 'authenticated'),
  ('11111111-0000-4000-8000-000000000002', 't-pro@test.mn',  'authenticated', 'authenticated'),
  ('11111111-0000-4000-8000-000000000003', 't-team@test.mn', 'authenticated', 'authenticated');

insert into public.subscriptions (owner_user_id, plan_id, status, current_period_start, current_period_end)
values ('11111111-0000-4000-8000-000000000002', 'pro', 'active', now(), now() + interval '1 month');

-- ---------- Free ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-0000-4000-8000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.cards (owner_id, slug, first_name) values (auth.uid(), 'free-card-1', 'A')$$,
  'Free user creates the 1st card');
select throws_ok(
  $$insert into public.cards (owner_id, slug, first_name) values (auth.uid(), 'free-card-2', 'A')$$,
  '42501', 'card_quota_exceeded', 'Free user is refused a 2nd card (direct REST insert)');

-- ---------- Pro ----------
select set_config('request.jwt.claims', '{"sub":"11111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.cards (owner_id, slug, first_name)
    select auth.uid(), 'pro-card-' || g, 'P' from generate_series(1, 5) g$$,
  'Pro user creates 5 cards');
select throws_ok(
  $$insert into public.cards (owner_id, slug, first_name) values (auth.uid(), 'pro-card-6', 'P')$$,
  '42501', 'card_quota_exceeded', 'Pro user is refused the 6th card');

-- Cannot create a card for somebody else
select throws_ok(
  $$insert into public.cards (owner_id, slug, first_name) values ('11111111-0000-4000-8000-000000000001', 'someone-else', 'X')$$,
  '42501', null, 'Cannot insert a card owned by another user');

-- ---------- Team seats ----------
select set_config('request.jwt.claims', '{"sub":"11111111-0000-4000-8000-000000000003","role":"authenticated"}', true);
insert into public.organizations (id, name, owner_id)
values ('22222222-0000-4000-8000-000000000001', 'Test Org', '11111111-0000-4000-8000-000000000003');

reset role;
select set_config('request.jwt.claims', '{}', true);
insert into public.subscriptions (org_id, plan_id, seats, status, current_period_start, current_period_end)
values ('22222222-0000-4000-8000-000000000001', 'team', 5, 'active', now(), now() + interval '1 month');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-0000-4000-8000-000000000003","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.org_members (org_id, invited_email, role, status)
    select '22222222-0000-4000-8000-000000000001', 'emp' || g || '@test.mn', 'member', 'invited' from generate_series(1, 4) g$$,
  'Team admin invites 4 employees (owner + 4 = 5 paid seats)');
select throws_ok(
  $$insert into public.org_members (org_id, invited_email, role, status)
    values ('22222222-0000-4000-8000-000000000001', 'emp5@test.mn', 'member', 'invited')$$,
  '42501', 'seat_limit_reached', 'Inviting beyond paid seats is refused (REST)');

reset role;
select set_config('request.jwt.claims', '{}', true);
select throws_ok(
  $$select public.invite_org_member('11111111-0000-4000-8000-000000000003', '22222222-0000-4000-8000-000000000001', 'emp6@test.mn')$$,
  '42501', 'seat_limit_reached', 'Inviting beyond paid seats is refused (org-invite function path)');

select * from finish();
rollback;
