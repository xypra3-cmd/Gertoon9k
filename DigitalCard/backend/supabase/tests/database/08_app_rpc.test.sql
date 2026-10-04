-- App RPCs: entitlements summary, admin MFA gate, account deletion
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, aud, role) values
  ('99999999-0000-4000-8000-000000000001', 't-ent@test.mn', 'authenticated', 'authenticated'),
  ('99999999-0000-4000-8000-000000000002', 't-adm@test.mn', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '99999999-0000-4000-8000-000000000002';
insert into public.cards (id, owner_id, slug, first_name) values
  ('99999999-0000-4000-8000-0000000000c1', '99999999-0000-4000-8000-000000000001', 'ent-card-1', 'E');
insert into public.contacts (owner_id, name) values ('99999999-0000-4000-8000-000000000001', 'C');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((public.get_my_entitlements() ->> 'card_quota')::int, 1, 'Free quota = 1');
select is((public.get_my_entitlements() ->> 'crm_enabled')::boolean, false, 'Free has no CRM');
select is(public.get_my_entitlements() -> 'editable_card_ids', '["99999999-0000-4000-8000-0000000000c1"]'::jsonb, 'First card editable');
select throws_ok($$select * from public.admin_list_users()$$, '42501', 'admin_mfa_required', 'Non-admin cannot list users');

select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select * from public.admin_list_users()$$, '42501', 'admin_mfa_required', 'Admin without MFA (aal1) is refused');
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}', true);
select ok((select count(*) from public.admin_list_users()) >= 2, 'Admin with MFA (aal2) lists users');

select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok($$select public.delete_my_account()$$, 'User deletes own account');
reset role;
select set_config('request.jwt.claims', '{}', true);
select is((select count(*)::int from public.cards where owner_id = '99999999-0000-4000-8000-000000000001'), 0, 'Account data is removed');

select * from finish();
rollback;
