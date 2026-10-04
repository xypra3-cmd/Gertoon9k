-- Org: employee sees only own stats; admin sees all; employee cannot change template or locked fields
-- (acceptance criteria 5, 6 / ORG-01)
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email, aud, role) values
  ('55555555-0000-4000-8000-00000000000a', 't-orgadmin@test.mn', 'authenticated', 'authenticated'),
  ('55555555-0000-4000-8000-000000000001', 't-emp1@test.mn',     'authenticated', 'authenticated'),
  ('55555555-0000-4000-8000-000000000002', 't-emp2@test.mn',     'authenticated', 'authenticated');
insert into public.organizations (id, name, owner_id, locked_template_id, allow_employee_edit_fields)
values ('55555555-0000-4000-8000-0000000000aa', 'Org T', '55555555-0000-4000-8000-00000000000a', 'corporate', array['phone', 'title']);
insert into public.subscriptions (org_id, plan_id, seats, status, current_period_start, current_period_end)
values ('55555555-0000-4000-8000-0000000000aa', 'team', 5, 'active', now(), now() + interval '1 month');
insert into public.org_members (org_id, user_id, role, status) values
  ('55555555-0000-4000-8000-0000000000aa', '55555555-0000-4000-8000-000000000001', 'member', 'active'),
  ('55555555-0000-4000-8000-0000000000aa', '55555555-0000-4000-8000-000000000002', 'member', 'active');
insert into public.cards (id, owner_id, org_id, slug, first_name, template_id, is_published) values
  ('55555555-0000-4000-8000-0000000000c1', '55555555-0000-4000-8000-000000000001', '55555555-0000-4000-8000-0000000000aa', 'org-emp-one', 'E1', 'modern', true),
  ('55555555-0000-4000-8000-0000000000c2', '55555555-0000-4000-8000-000000000002', '55555555-0000-4000-8000-0000000000aa', 'org-emp-two', 'E2', 'modern', true);
insert into public.card_events (card_id, event, visitor_hash) values
  ('55555555-0000-4000-8000-0000000000c1', 'view', repeat('1', 64)),
  ('55555555-0000-4000-8000-0000000000c2', 'view', repeat('2', 64)),
  ('55555555-0000-4000-8000-0000000000c2', 'qr_open', repeat('2', 64));

select is((select template_id from public.cards where id = '55555555-0000-4000-8000-0000000000c1'), 'corporate',
  'Org card insert is forced to the locked template');

-- Employee 1
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"55555555-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from public.card_events), 1, 'Employee sees only own card events');
select is((select count(*)::int from public.card_events where card_id = '55555555-0000-4000-8000-0000000000c2'), 0,
  'Employee cannot see another employee events');
select is((select count(*)::int from public.cards), 1, 'Employee sees only own card');
select throws_ok($$update public.cards set template_id = 'dark' where id = '55555555-0000-4000-8000-0000000000c1'$$,
  '42501', 'org_template_locked', 'Employee cannot change org card template_id');
select throws_ok($$update public.cards set company = 'Other' where id = '55555555-0000-4000-8000-0000000000c1'$$,
  '42501', 'org_field_locked', 'Employee cannot change fields outside allow_employee_edit_fields');
select lives_ok($$update public.cards set phone = '+97699999999' where id = '55555555-0000-4000-8000-0000000000c1'$$,
  'Employee can change allowed fields');

-- Org admin
select set_config('request.jwt.claims', '{"sub":"55555555-0000-4000-8000-00000000000a","role":"authenticated"}', true);
select is((select count(*)::int from public.card_events), 3, 'Org admin sees all employees events');
select is((select sum(total_opens)::int from public.get_card_stats(array['55555555-0000-4000-8000-0000000000c1','55555555-0000-4000-8000-0000000000c2']::uuid[])),
  3, 'Org admin gets stats for all employee cards');
select lives_ok($$update public.cards set template_id = 'dark' where id = '55555555-0000-4000-8000-0000000000c1'$$,
  'Org admin can change the template');

select * from finish();
rollback;
