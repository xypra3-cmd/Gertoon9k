-- Payments: unpaid check does not activate; double application is idempotent; amount mismatch fails
-- (acceptance criteria 7, 8 / PAY-01, PAY-02, PAY-04). The HTTP layer is covered by tests/functions.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email, aud, role) values
  ('77777777-0000-4000-8000-000000000001', 't-pay@test.mn', 'authenticated', 'authenticated');

create temp table t_pay on commit drop as
select * from public.create_pending_payment('77777777-0000-4000-8000-000000000001', 'pro');

select is((select amount_mnt from t_pay), (select price_mnt from public.plans where id = 'pro'), 'Amount comes from plans table');
select is((select status from public.subscriptions where owner_user_id = '77777777-0000-4000-8000-000000000001'), 'pending',
  'Subscription starts pending');

-- Forged callback → server-side check says NOT PAID
select is(public.apply_payment_check((select sender_invoice_no from t_pay), false, null, null, '{"forged": true}'),
  'not_paid', 'Unpaid check result does not activate');
select is(public.has_active_plan('77777777-0000-4000-8000-000000000001'), false, 'Subscription still inactive');

-- Real payment, delivered twice
select is(public.apply_payment_check((select sender_invoice_no from t_pay), true, 9900, 'P-1', '{}'), 'paid', 'First paid check activates');
create temp table t_end on commit drop as
select current_period_end as e from public.subscriptions where owner_user_id = '77777777-0000-4000-8000-000000000001';
select is(public.apply_payment_check((select sender_invoice_no from t_pay), true, 9900, 'P-1', '{}'), 'already_paid', 'Second check is a no-op');
select is((select current_period_end from public.subscriptions where owner_user_id = '77777777-0000-4000-8000-000000000001'),
  (select e from t_end), 'Period extended only once');
select ok((select e from t_end) between now() + interval '1 month' - interval '1 minute' and now() + interval '1 month' + interval '1 minute',
  'Period end = now + 1 month');

-- Underpaid invoice
create temp table t_pay2 on commit drop as
select * from public.create_pending_payment('77777777-0000-4000-8000-000000000001', 'pro');
select is(public.apply_payment_check((select sender_invoice_no from t_pay2), true, 100, 'P-2', '{}'), 'amount_mismatch',
  'Underpaid invoice is not applied');
select is((select count(*)::int from public.audit_log where action = 'payment.amount_mismatch'
             and entity_id = (select payment_id::text from t_pay2)), 1, 'Mismatch is recorded in audit_log for admins');

select * from finish();
rollback;
