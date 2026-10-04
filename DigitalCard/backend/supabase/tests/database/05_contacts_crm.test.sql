-- CRM entitlement, contact limit, exchange rules (acceptance criteria 10, 11 / ENT-01, EXC-02)
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, aud, role) values
  ('66666666-0000-4000-8000-000000000001', 't-crmfree@test.mn', 'authenticated', 'authenticated'),
  ('66666666-0000-4000-8000-000000000002', 't-crmpro@test.mn',  'authenticated', 'authenticated');
insert into public.subscriptions (owner_user_id, plan_id, status, current_period_start, current_period_end)
values ('66666666-0000-4000-8000-000000000002', 'pro', 'active', now(), now() + interval '1 month');
insert into public.cards (owner_id, slug, first_name, is_published) values
  ('66666666-0000-4000-8000-000000000001', 'crm-free-card', 'Бат', true),
  ('66666666-0000-4000-8000-000000000002', 'crm-pro-card', 'Сараа', true);

-- ---------- Free ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"66666666-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok($$insert into public.contacts (owner_id, name, note) values (auth.uid(), 'X', 'secret note')$$,
  '42501', 'crm_not_enabled', 'Free user cannot insert a contact with a note');
insert into public.contacts (id, owner_id, name) values ('66666666-0000-4000-8000-0000000000f1', auth.uid(), 'Plain');
select throws_ok($$update public.contacts set follow_up_at = current_date + 3 where id = '66666666-0000-4000-8000-0000000000f1'$$,
  '42501', 'crm_not_enabled', 'Free user cannot set follow_up_at via REST');
select throws_ok($$update public.contacts set note = 'n' where id = '66666666-0000-4000-8000-0000000000f1'$$,
  '42501', 'crm_not_enabled', 'Free user cannot set note via REST');
select lives_ok($$update public.contacts set phone = '+97611111111' where id = '66666666-0000-4000-8000-0000000000f1'$$,
  'Free user can edit basic contact fields');
select throws_ok($$insert into public.contacts (owner_id, name, source, consent_at) values (auth.uid(), 'Fake', 'exchange', now())$$,
  '42501', 'exchange_source_forbidden', 'Clients cannot forge exchange contacts');

-- fill up to the Free limit (10) through the exchange path, then the 11th is refused
reset role;
select set_config('request.jwt.claims', '{}', true);
select is(
  (select count(*)::int from generate_series(1, 9) g
    where public.submit_contact_exchange('crm-free-card', encode(extensions.digest('guest' || g, 'sha256'), 'hex'),
            'Зочин ' || g, '+9769900000' || g, null, null, null, null) ->> 'status' = 'ok'),
  9, '9 exchanges stored (1 manual + 9 = 10 = Free limit)');
select is(
  public.submit_contact_exchange('crm-free-card', encode(extensions.digest('guest11', 'sha256'), 'hex'),
    'Зочин 11', '+97699000011', null, null, null, null) ->> 'status',
  'owner_limit_reached', '11th exchange is refused with owner_limit_reached');
select is((select count(*)::int from public.contacts where owner_id = '66666666-0000-4000-8000-000000000001'), 10,
  'Free owner has exactly 10 contacts');
select is((select count(*)::int from public.contacts where owner_id = '66666666-0000-4000-8000-000000000001'
             and source = 'exchange' and consent_at is not null and met_at is not null), 9,
  'Exchange contacts have source=exchange, consent_at and met_at');

-- per-visitor exchange rate limit (5 / hour)
select is(
  (select array_agg(public.submit_contact_exchange('crm-pro-card', repeat('e', 64), 'Spam ' || g, '+976' || g, null, null, null, null) ->> 'status' order by g)
     from generate_series(1, 6) g),
  array['ok', 'ok', 'ok', 'ok', 'ok', 'rate_limited'], '6th exchange from the same visitor within an hour is refused');

-- ---------- Pro ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"66666666-0000-4000-8000-000000000002","role":"authenticated"}', true);
select lives_ok($$insert into public.contacts (owner_id, name, note, follow_up_at, tags, status)
                  values (auth.uid(), 'Pro contact', 'note', current_date + 7, '{vip}', 'follow_up')$$,
  'Pro user can write CRM fields');
select lives_ok($$update public.contacts set last_contacted_at = now(), follow_up_at = null where owner_id = auth.uid()$$,
  'Pro user can mark contacts as contacted');

select * from finish();
rollback;
