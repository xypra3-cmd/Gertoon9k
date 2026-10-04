-- Privacy & analytics (acceptance criteria 9, 13 / PRIV-01, PRIV-02, SEC-06, FUN-03)
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- PRIV-01: no IP-like column anywhere in public schema
select is(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public'
      and (data_type in ('inet', 'cidr') or column_name ~* '(^ip$|^ip_|_ip$|ip_addr|remote_addr|x_forwarded)')),
  0, 'No IP address column exists in the public schema');
select hasnt_column('public', 'card_events', 'ip', 'card_events has no ip column');

insert into auth.users (id, email, aud, role) values
  ('88888888-0000-4000-8000-000000000001', 't-owner@test.mn',  'authenticated', 'authenticated'),
  ('88888888-0000-4000-8000-000000000002', 't-viewer@test.mn', 'authenticated', 'authenticated'),
  ('88888888-0000-4000-8000-000000000003', 't-optin@test.mn',  'authenticated', 'authenticated');
update public.profiles set show_name_to_owners = true where id = '88888888-0000-4000-8000-000000000003';
insert into public.subscriptions (owner_user_id, plan_id, status, current_period_start, current_period_end)
values ('88888888-0000-4000-8000-000000000001', 'pro', 'active', now(), now() + interval '1 month');
insert into public.cards (id, owner_id, slug, first_name, is_published) values
  ('88888888-0000-4000-8000-0000000000c1', '88888888-0000-4000-8000-000000000001', 'privacy-card', 'Owner', true);

-- PRIV-02: viewer without opt-in is stored anonymously
select is(public.track_card_event('privacy-card', 'view', null, repeat('a', 64), '88888888-0000-4000-8000-000000000002'), 'ok', 'tracked');
select is(public.track_card_event('privacy-card', 'qr_open', null, repeat('b', 64), '88888888-0000-4000-8000-000000000003'), 'ok', 'tracked');
select is((select array_agg(viewer_user_id::text order by visitor_hash) from public.card_events where card_id = '88888888-0000-4000-8000-0000000000c1'),
  array[null, '88888888-0000-4000-8000-000000000003'], 'Only the opted-in viewer identity is kept');

-- SEC-06: 100 events in a minute from one visitor → only 30 counted
select is((select count(*)::int from generate_series(1, 100) g
            where public.track_card_event('privacy-card', 'link_click', 'facebook', repeat('c', 64), null) = 'ok'),
  30, 'Rate limit: at most 30 events per visitor per card per minute');

-- FUN-03: stats ordering and total = view + qr_open
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"88888888-0000-4000-8000-000000000001","role":"authenticated"}', true);
select ok((select bool_and(total_opens = views + qr_opens) from public.get_card_stats(array['88888888-0000-4000-8000-0000000000c1'::uuid])),
  'total_opens = views + qr_opens');
select ok(
  (select a.total_opens >= d.total_opens
     from public.get_card_stats(array['88888888-0000-4000-8000-0000000000c1'::uuid], null) a,
          public.get_card_stats(array['88888888-0000-4000-8000-0000000000c1'::uuid], now() - interval '1 day') d),
  'All time >= today');

-- Criterion 13: follow-up digest at most once per user per day
reset role;
select set_config('request.jwt.claims', '{}', true);
insert into public.contacts (owner_id, name, follow_up_at, status)
values ('88888888-0000-4000-8000-000000000001', 'Due 1', current_date, 'follow_up'),
       ('88888888-0000-4000-8000-000000000001', 'Due 2', current_date - 1, 'follow_up');
select public.queue_followup_digests(current_date);
select public.queue_followup_digests(current_date);
select is((select count(*)::int from public.email_queue
            where user_id = '88888888-0000-4000-8000-000000000001' and kind = 'followup_digest'),
  1, 'followup-digest queues one e-mail per user per day even when run twice');

select * from finish();
rollback;
