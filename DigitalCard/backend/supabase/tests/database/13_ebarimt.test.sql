-- e-barimt (0014): paid payments need a VAT receipt; only the service role records it;
-- card_shows_branding is no longer callable directly.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, aud, role) values
  ('dddddddd-0000-4000-8000-000000000001', 'ebarimt@test.mn', 'authenticated', 'authenticated');
insert into public.subscriptions (id, owner_user_id, plan_id, status) values
  ('dddddddd-0000-4000-8000-0000000000a1', 'dddddddd-0000-4000-8000-000000000001', 'pro', 'expired');
insert into public.payments (id, subscription_id, plan_id, sender_invoice_no, amount_mnt) values
  ('dddddddd-0000-4000-8000-0000000000b1', 'dddddddd-0000-4000-8000-0000000000a1', 'pro', 'EB-TEST-1', 19900);

select is((select ebarimt_status from public.payments where sender_invoice_no = 'EB-TEST-1'), 'none', 'Pending invoice needs no receipt yet');
select is(public.record_ebarimt('dddddddd-0000-4000-8000-0000000000b1', true, 'X', 'Q'), 'skipped', 'No receipt for an unpaid invoice');

update public.payments set status = 'paid', paid_at = now() where sender_invoice_no = 'EB-TEST-1';
select is((select ebarimt_status from public.payments where sender_invoice_no = 'EB-TEST-1'), 'pending', 'Paying marks the receipt as pending');

select is(public.record_ebarimt('dddddddd-0000-4000-8000-0000000000b1', false, null, null), 'failed', 'A failed attempt is recorded');
select is(public.record_ebarimt('dddddddd-0000-4000-8000-0000000000b1', true, 'EB-1', 'qr-data'), 'issued', 'Retry issues the receipt');
select is((select ebarimt_id || '|' || ebarimt_qr || '|' || ebarimt_attempts from public.payments where sender_invoice_no = 'EB-TEST-1'),
  'EB-1|qr-data|2', 'Receipt id, QR data and attempt count are stored');
select is(public.record_ebarimt('dddddddd-0000-4000-8000-0000000000b1', true, 'EB-2', 'other'), 'skipped', 'An issued receipt is never replaced');

select throws_ok($$insert into public.payments (subscription_id, plan_id, sender_invoice_no, amount_mnt, ebarimt_receiver)
  values ('dddddddd-0000-4000-8000-0000000000a1', 'pro', 'EB-TEST-2', 19900, '12AB')$$, '23514', null, 'Company register must be 7 digits');

select ok(not has_function_privilege('authenticated', 'public.record_ebarimt(uuid, boolean, text, text)', 'execute'), 'Users cannot record receipts');
select ok(not has_function_privilege('anon', 'public.card_shows_branding(uuid, uuid)', 'execute'), 'Anonymous callers cannot probe plan status');

select is(public.card_branding('dddddddd-0000-4000-8000-0000000000b1'), null, 'card_branding answers nothing for an id that is not a published card');

set local role anon;
select ok((select count(*) from public.public_cards) >= 0, 'public_cards view still works for anonymous visitors');

select * from finish();
rollback;
