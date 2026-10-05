-- Growth features: annual billing, referral reward, slug lock, branding flag, AI quota (0009_growth)
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('99999999-0000-4000-8000-000000000001', 't-ref-a@test.mn', 'authenticated', 'authenticated', '{}');
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('99999999-0000-4000-8000-000000000002', 't-ref-b@test.mn', 'authenticated', 'authenticated',
   jsonb_build_object('ref', (select referral_code from public.profiles where id = '99999999-0000-4000-8000-000000000001')));

-- ---------------- annual billing ----------------
create temp table t_year on commit drop as
select * from public.create_pending_payment('99999999-0000-4000-8000-000000000002', 'pro', null, null, 'year');
select is((select amount_mnt from t_year), (select price_annual_mnt from public.plans where id = 'pro'),
  'Annual amount comes from plans.price_annual_mnt');
select ok((select price_annual_mnt from public.plans where id = 'pro') < 12 * (select price_mnt from public.plans where id = 'pro'),
  'Annual price is cheaper than 12 months');
select throws_ok($$select * from public.create_pending_payment('99999999-0000-4000-8000-000000000002', 'pro', null, null, 'week')$$,
  'P0001', 'invalid_period', 'Unknown period is rejected');

-- ---------------- referral ----------------
select is((select referred_by from public.profiles where id = '99999999-0000-4000-8000-000000000002'),
  '99999999-0000-4000-8000-000000000001'::uuid, 'Sign-up with ?ref= links the referrer');
select is(public.has_active_plan('99999999-0000-4000-8000-000000000001'), false, 'Referrer has no plan before the payment');

select is(public.apply_payment_check((select sender_invoice_no from t_year), true,
  (select amount_mnt from t_year), 'P-Y1', '{}'), 'paid', 'Annual payment applies');
select ok((select current_period_end from public.subscriptions where owner_user_id = '99999999-0000-4000-8000-000000000002')
  between now() + interval '1 year' - interval '1 minute' and now() + interval '1 year' + interval '1 minute',
  'Annual payment extends by 1 year');
select is(public.has_active_plan('99999999-0000-4000-8000-000000000001'), true, 'Referrer gets Pro after first payment');
select ok((select current_period_end from public.subscriptions where owner_user_id = '99999999-0000-4000-8000-000000000001')
  between now() + interval '1 month' - interval '1 minute' and now() + interval '1 month' + interval '1 minute',
  'Reward = +1 month');

create temp table t_m on commit drop as
select * from public.create_pending_payment('99999999-0000-4000-8000-000000000002', 'pro');
select is(public.apply_payment_check((select sender_invoice_no from t_m), true, (select amount_mnt from t_m), 'P-M1', '{}'), 'paid',
  'Second payment applies');
select is((select count(*)::int from public.audit_log where action = 'referral.reward'
           and entity_id = '99999999-0000-4000-8000-000000000001'), 1, 'Reward is granted only once');

insert into auth.users (id, email, aud, role) values
  ('99999999-0000-4000-8000-000000000003', 't-free-c@test.mn', 'authenticated', 'authenticated');
insert into public.cards (owner_id, slug, first_name, is_published) values
  ('99999999-0000-4000-8000-000000000003', 'growth-free-c', 'Free', true);

-- ---------------- client cannot forge referral fields ----------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok($$update public.profiles set referral_code = 'forged01' where id = auth.uid()$$,
  '42501', 'role_change_forbidden', 'Referral fields are not client-writable');
select throws_ok($$select public.claim_referral((select referral_code from public.profiles where id = auth.uid()))$$,
  'P0001', 'referral_invalid', 'Self-referral is rejected');

-- ---------------- slug lock ----------------
insert into public.cards (id, owner_id, slug, first_name) values
  ('99999999-0000-4000-8000-0000000000c1', auth.uid(), 'growth-draft', 'Draft');
update public.cards set slug = 'growth-renamed' where id = '99999999-0000-4000-8000-0000000000c1';
select is((select slug from public.cards where id = '99999999-0000-4000-8000-0000000000c1'), 'growth-renamed',
  'Draft card slug can change');
update public.cards set is_published = true where id = '99999999-0000-4000-8000-0000000000c1';
select ok((select published_at from public.cards where id = '99999999-0000-4000-8000-0000000000c1') is not null,
  'Publishing sets published_at');
select throws_ok($$update public.cards set slug = 'growth-again' where id = '99999999-0000-4000-8000-0000000000c1'$$,
  '42501', 'slug_locked', 'Slug is locked after publishing');
update public.cards set is_published = false where id = '99999999-0000-4000-8000-0000000000c1';
select throws_ok($$update public.cards set slug = 'growth-again' where id = '99999999-0000-4000-8000-0000000000c1'$$,
  '42501', 'slug_locked', 'Unpublishing does not unlock the slug');

-- ---------------- branding flag ----------------
select is((select show_branding from public.public_cards where slug = 'growth-free-c'), true, 'Free card shows «Made with Digital Card»');
select is((select show_branding from public.public_cards where slug = 'saraa-g'), false, 'Pro cards hide branding');

-- ---------------- AI quota ----------------
reset role;
select throws_ok($$select public.consume_ai_credit('99999999-0000-4000-8000-000000000003', 'note')$$,
  '42501', 'crm_not_enabled', 'Free user cannot use CRM AI tasks');

select * from finish();
rollback;
