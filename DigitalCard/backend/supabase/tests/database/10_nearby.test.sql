-- Phone-to-phone exchange: bump (coarse geohash + 3 s window) and 6-digit code (0010_nearby)
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'near-a@test.mn', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'near-b@test.mn', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'near-c@test.mn', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'near-d@test.mn', 'authenticated', 'authenticated');
insert into public.cards (id, owner_id, slug, first_name, last_name, title, phone, is_published) values
  ('aaaaaaaa-0000-4000-8000-0000000000c1', 'aaaaaaaa-0000-4000-8000-000000000001', 'near-anu', 'Ану', 'Бат', 'Зөвлөх', '+97699110001', true),
  ('aaaaaaaa-0000-4000-8000-0000000000c2', 'aaaaaaaa-0000-4000-8000-000000000002', 'near-bold', 'Болд', null, null, null, true),
  ('aaaaaaaa-0000-4000-8000-0000000000c3', 'aaaaaaaa-0000-4000-8000-000000000003', 'near-chimeg', 'Чимэг', null, null, null, true),
  ('aaaaaaaa-0000-4000-8000-0000000000c4', 'aaaaaaaa-0000-4000-8000-000000000004', 'near-dorj', 'Дорж', null, null, null, true);
-- D is already at the free contact limit.
insert into public.contacts (owner_id, name)
select 'aaaaaaaa-0000-4000-8000-000000000004', 'Filler ' || g
from generate_series(1, (select contact_limit from public.plans where id = 'free')) g;

create temp table t (k text primary key, v jsonb);
grant all on t to authenticated;

-- ---------------- bump ----------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into t values ('a1', public.nearby_bump('aaaaaaaa-0000-4000-8000-0000000000c1', 'Y23J5C'));
select is((select v->>'status' from t where k = 'a1'), 'waiting', 'First bump waits for a partner');
select is(public.nearby_poll(((select v->>'pulse_id' from t where k = 'a1'))::uuid)->>'status', 'waiting',
  'Poll before a partner bumps: still waiting');
select throws_ok($$select * from public.nearby_pulses$$, '42501', null, 'Pulses are not readable by clients');
select is(public.nearby_bump('aaaaaaaa-0000-4000-8000-0000000000c2', 'y23j5c')->>'status', 'card_unavailable',
  'Cannot bump with someone else''s card');
select is(public.nearby_bump('aaaaaaaa-0000-4000-8000-0000000000c1', 'y23 ; drop')->>'status', 'invalid',
  'Malformed geohash is rejected');

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into t values ('b1', public.nearby_bump('aaaaaaaa-0000-4000-8000-0000000000c2', 'y23j5d'));
select is((select v->>'status' from t where k = 'b1'), 'matched', 'Second bump in the same ~5 km cell within 3 s matches');
select is((select v->'partner'->>'slug' from t where k = 'b1'), 'near-anu', 'Partner card is returned');
select is((select v->>'saved' from t where k = 'b1'), 'true', 'Matcher saves the partner as a contact');
select is((select source || '|' || name || '|' || coalesce(phone, '') from public.contacts
            where owner_id = auth.uid() and card_id = 'aaaaaaaa-0000-4000-8000-0000000000c1'),
  'nearby|Бат Ану|+97699110001', 'Contact has source nearby and the card''s public fields');

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into t values ('a2', public.nearby_poll(((select v->>'pulse_id' from t where k = 'a1'))::uuid));
select is((select v->>'status' || '|' || (v->'partner'->>'slug') || '|' || (v->>'duplicate') from t where k = 'a2'),
  'matched|near-bold|false', 'Waiting side learns the match and saves its own contact');
select is(public.nearby_poll(((select v->>'pulse_id' from t where k = 'a1'))::uuid)->>'duplicate', 'true',
  'Polling again does not save twice');
select is((select count(*)::int from public.contacts where owner_id = auth.uid() and source = 'nearby'), 1,
  'Exactly one contact for the waiting side');

-- ---------------- other users' pulses ----------------
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(public.nearby_poll(((select v->>'pulse_id' from t where k = 'a1'))::uuid)->>'status', 'not_found',
  'Cannot poll another user''s pulse');
select is(public.nearby_bump('aaaaaaaa-0000-4000-8000-0000000000c3', 'y23j5c')->>'status', 'waiting',
  'Already matched pulses are not matched again');

-- ---------------- cells ----------------
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(public.nearby_bump('aaaaaaaa-0000-4000-8000-0000000000c1', 'y23k00')->>'status', 'waiting',
  'A bump in another cell does not match the waiting pulse');

-- ---------------- code ----------------
insert into t values ('code', public.nearby_code_create('aaaaaaaa-0000-4000-8000-0000000000c1'));
select matches((select v->>'code' from t where k = 'code'), '^[0-9]{6}$', 'Code has 6 digits');
select is(public.nearby_code_claim((select v->>'code' from t where k = 'code'), 'aaaaaaaa-0000-4000-8000-0000000000c1')->>'status',
  'own_code', 'Own code cannot be claimed');

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(public.nearby_code_claim(case when (select v->>'code' from t where k = 'code') = '000000' then '000001' else '000000' end,
  'aaaaaaaa-0000-4000-8000-0000000000c3')->>'status', 'not_found', 'Wrong code → not_found');
select is(public.nearby_code_claim((select v->>'code' from t where k = 'code'), 'aaaaaaaa-0000-4000-8000-0000000000c3')->>'status',
  'matched', 'Right code → matched');
select is(public.nearby_code_claim((select v->>'code' from t where k = 'code'), 'aaaaaaaa-0000-4000-8000-0000000000c3')->>'status',
  'not_found', 'A code works only once');
select is((select count(*)::int from (select public.nearby_code_claim('123456', 'aaaaaaaa-0000-4000-8000-0000000000c3') r
             from generate_series(1, 8)) x where r->>'status' = 'rate_limited'), 1,
  'Brute force is limited to 10 attempts per 10 minutes');

-- ---------------- contact limit on the claiming side ----------------
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into t values ('code2', public.nearby_code_create('aaaaaaaa-0000-4000-8000-0000000000c1'));
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is((select r->>'status' || '|' || (r->>'saved') || '|' || (r->>'reason')
           from (select public.nearby_code_claim((select v->>'code' from t where k = 'code2'), 'aaaaaaaa-0000-4000-8000-0000000000c4') r) x),
  'matched|false|contact_limit_reached', 'Contact limit still applies (DB guard from 0002)');

-- ---------------- expiry + anon ----------------
reset role;
insert into public.nearby_pulses (id, user_id, card_id, kind, geohash, created_at) values
  ('aaaaaaaa-0000-4000-8000-0000000000f1', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-0000000000c2',
   'bump', 'y23j5c', now() - interval '1 minute');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is(public.nearby_poll('aaaaaaaa-0000-4000-8000-0000000000f1')->>'status', 'expired', 'Old bump pulse expires');
reset role;
set local role anon;
select throws_ok($$select public.nearby_bump('aaaaaaaa-0000-4000-8000-0000000000c1', 'y23j5c')$$, '42501', null,
  'Anonymous users cannot exchange');

select * from finish();
rollback;
