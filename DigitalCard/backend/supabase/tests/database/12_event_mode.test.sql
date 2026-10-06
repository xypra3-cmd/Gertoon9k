-- Event mode (0013): new contacts are stamped with the active event — CRM plans only
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email, aud, role) values
  ('cccccccc-0000-4000-8000-000000000001', 'event-pro@test.mn', 'authenticated', 'authenticated'),
  ('cccccccc-0000-4000-8000-000000000002', 'event-free@test.mn', 'authenticated', 'authenticated');
insert into public.subscriptions (owner_user_id, plan_id, status, current_period_start, current_period_end) values
  ('cccccccc-0000-4000-8000-000000000001', 'pro', 'active', now() - interval '1 day', now() + interval '30 days');
insert into public.cards (id, owner_id, slug, first_name, is_published) values
  ('cccccccc-0000-4000-8000-0000000000c1', 'cccccccc-0000-4000-8000-000000000001', 'event-pro-card', 'Pro', true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is(public.get_my_event(), null, 'No event yet');
select throws_ok($$select public.start_event('', 12)$$, 'P0001', 'invalid_event', 'Empty name is rejected');
select throws_ok($$select public.start_event('Expo', 500)$$, 'P0001', 'invalid_event', 'More than 72 hours is rejected');
select is(public.start_event('Startup Mongolia 2026', 8)->>'active', 'true', 'Event starts');

insert into public.contacts (owner_id, name) values (auth.uid(), 'Met At Expo');
select is((select met_where_type || '|' || met_where_text || '|' || array_to_string(tags, ',') || '|' || (met_at is not null)::text
            from public.contacts where name = 'Met At Expo'),
  'event|Startup Mongolia 2026|Startup Mongolia 2026|true', 'Manual contact is stamped with the event');

insert into public.contacts (owner_id, name, met_where_type, met_where_text, tags)
values (auth.uid(), 'Own Place', 'office', 'Their office', array['vip']);
select is((select met_where_text || '|' || array_to_string(tags, ',') from public.contacts where name = 'Own Place'),
  'Their office|vip,Startup Mongolia 2026', 'An explicit place is kept; the event tag is still added');

select is((public.get_my_event()->>'contacts')::int, 1, 'Event counts the people met there');
select throws_ok($$update public.profiles set event_until = now() + interval '30 days' where id = auth.uid()$$,
  '42501', 'role_change_forbidden', 'Event columns cannot be written directly');

-- Guest exchange (server path, called by the Edge Function as service_role) is stamped too.
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is(public.submit_contact_exchange('event-pro-card', repeat('e', 64), 'Guest At Booth', '+97699001234', null, null, null, null)->>'status',
  'ok', 'Guest leaves details at the booth');
select is((select met_where_text from public.contacts where name = 'Guest At Booth'), 'Startup Mongolia 2026',
  'Exchange contact is stamped with the event');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-4000-8000-000000000001","role":"authenticated"}', true);
select public.stop_event();
insert into public.contacts (owner_id, name) values (auth.uid(), 'After Event');
select is((select met_where_text from public.contacts where name = 'After Event'), null, 'Stopped event no longer stamps');
select is(public.get_my_event()->>'active', 'false', 'Event shows as finished');

-- Free plan: no event mode, and contacts are never stamped.
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok($$select public.start_event('Expo', 4)$$, '42501', 'crm_not_enabled', 'Free plan cannot start an event');
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set event_name = 'Sneaky', event_started_at = now(), event_until = now() + interval '1 hour'
 where id = 'cccccccc-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into public.contacts (owner_id, name) values (auth.uid(), 'Free Contact');
select is((select met_where_text from public.contacts where name = 'Free Contact'), null,
  'Free contacts are not stamped (CRM guard stays intact)');

select * from finish();
rollback;
