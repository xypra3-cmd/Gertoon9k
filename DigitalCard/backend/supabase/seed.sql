-- =============================================================================
-- Digital Card — LOCAL seed data (runs only on `supabase db reset` locally).
-- Never run against production: `supabase db push` does not apply seed.sql.
-- Demo password for every account below: Demo1234!  (local only, not a secret)
-- =============================================================================

do $$
declare
  pw text := extensions.crypt('Demo1234!', extensions.gen_salt('bf'));
  u record;
begin
  for u in
    select * from (values
      ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@demo.mn',      'Админ Демо'),
      ('a0000000-0000-4000-8000-000000000002'::uuid, 'basic@demo.mn',      'Бат Болд'),
      ('a0000000-0000-4000-8000-000000000003'::uuid, 'pro@demo.mn',        'Сараа Ганбаатар'),
      ('a0000000-0000-4000-8000-000000000004'::uuid, 'org-owner@demo.mn',  'Тэмүүлэн Дорж'),
      ('a0000000-0000-4000-8000-000000000005'::uuid, 'employee1@demo.mn',  'Номин Эрдэнэ'),
      ('a0000000-0000-4000-8000-000000000006'::uuid, 'employee2@demo.mn',  'Ганзориг Цэрэн'),
      ('a0000000-0000-4000-8000-000000000007'::uuid, 'employee3@demo.mn',  'Оюунаа Мөнх'),
      ('a0000000-0000-4000-8000-000000000008'::uuid, 'expired@demo.mn',    'Хулан Батсүх')
    ) as t(id, email, full_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, pw, now(),
      '{"provider": "email", "providers": ["email"]}', jsonb_build_object('full_name', u.full_name),
      now() - interval '60 days', now(),
      '', '', '', '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text,
            jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
            'email', now(), now(), now());
  end loop;
end $$;

update public.profiles set role = 'admin' where id = 'a0000000-0000-4000-8000-000000000001';
update public.profiles set show_name_to_owners = true where id = 'a0000000-0000-4000-8000-000000000003';

-- -----------------------------------------------------------------------------
-- Subscriptions (pro: active; expired: was pro, ended 5 days ago — set after its cards)
-- -----------------------------------------------------------------------------
insert into public.subscriptions (id, owner_user_id, plan_id, status, current_period_start, current_period_end)
values
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'pro', 'active', now() - interval '10 days', now() + interval '20 days'),
  ('b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000008', 'pro', 'active', now() - interval '35 days', now() + interval '1 day');

-- -----------------------------------------------------------------------------
-- Organization (Team, 5 paid seats: owner + 3 employees used)
-- -----------------------------------------------------------------------------
insert into public.organizations (id, name, brand_color, locked_template_id, allow_employee_edit_fields, owner_id)
values ('c0000000-0000-4000-8000-000000000001', 'Демо Групп ХХК', '#1E40AF', 'corporate',
        array['title', 'phone', 'email', 'avatar_path', 'bio', 'links'], 'a0000000-0000-4000-8000-000000000004');

insert into public.subscriptions (id, org_id, plan_id, seats, status, current_period_start, current_period_end)
values ('b0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 'team', 5, 'active',
        now() - interval '5 days', now() + interval '25 days');

insert into public.org_members (org_id, user_id, role, invited_email, status) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005', 'member', 'employee1@demo.mn', 'active'),
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000006', 'member', 'employee2@demo.mn', 'active'),
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000007', 'member', 'employee3@demo.mn', 'active');

-- -----------------------------------------------------------------------------
-- Cards
-- -----------------------------------------------------------------------------
insert into public.cards (id, owner_id, org_id, slug, template_id, color_scheme, last_name, first_name, name_format,
                          title, company, phone, email, website, address, bio, slogan, is_published)
values
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', null, 'bat-bold', 'classic', 'a',
   'Болд', 'Бат', 'initial', 'Борлуулалтын менежер', 'Номин Трейд', '+97699112233', 'basic@demo.mn',
   'https://example.mn', 'Улаанбаатар, СБД', 'Барилгын материалын борлуулалт.', null, true),
  ('d0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000003', null, 'saraa-g', 'modern', 'a',
   'Ганбаатар', 'Сараа', 'full', 'Даатгалын зөвлөх', 'Мандал Даатгал', '+97688001122', 'pro@demo.mn',
   'https://saraa.example.mn', 'Улаанбаатар, ХУД', 'Амь нас, эрүүл мэндийн даатгалын зөвлөгөө.', 'Таны ирээдүйн төлөө', true),
  ('d0000000-0000-4000-8000-000000000032', 'a0000000-0000-4000-8000-000000000003', null, 'saraa-realestate', 'premium', 'b',
   'Ганбаатар', 'Сараа', 'initial', 'Үл хөдлөхийн агент', 'Сараа Realty', '+97688001122', 'pro@demo.mn',
   null, null, null, null, true),
  ('d0000000-0000-4000-8000-000000000033', 'a0000000-0000-4000-8000-000000000003', null, 'saraa-draft', 'minimal', 'a',
   'Ганбаатар', 'Сараа', 'initial', 'Зөвлөх', null, null, 'pro@demo.mn', null, null, null, null, false),
  ('d0000000-0000-4000-8000-000000000081', 'a0000000-0000-4000-8000-000000000008', null, 'khulan-b', 'creative', 'a',
   'Батсүх', 'Хулан', 'initial', 'График дизайнер', 'Freelance', '+97695554433', 'expired@demo.mn',
   null, null, 'Брэнд, лого, постер.', null, true),
  ('d0000000-0000-4000-8000-000000000082', 'a0000000-0000-4000-8000-000000000008', null, 'khulan-studio', 'dark', 'b',
   'Батсүх', 'Хулан', 'full', 'Creative director', 'Khulan Studio', '+97695554433', 'expired@demo.mn',
   null, null, null, null, true),
  ('d0000000-0000-4000-8000-000000000041', 'a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 'temuulen-demo', 'corporate', 'a',
   'Дорж', 'Тэмүүлэн', 'initial', 'Гүйцэтгэх захирал', 'Демо Групп ХХК', '+97699000001', 'org-owner@demo.mn',
   'https://demo-group.example.mn', 'Улаанбаатар, ЧД', null, null, true),
  ('d0000000-0000-4000-8000-000000000051', 'a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001', 'nomin-demo', 'corporate', 'a',
   'Эрдэнэ', 'Номин', 'initial', 'Борлуулалтын ахлах', 'Демо Групп ХХК', '+97699000002', 'employee1@demo.mn',
   null, null, null, null, true),
  ('d0000000-0000-4000-8000-000000000061', 'a0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000001', 'ganzorig-demo', 'corporate', 'a',
   'Цэрэн', 'Ганзориг', 'initial', 'Борлуулагч', 'Демо Групп ХХК', '+97699000003', 'employee2@demo.mn',
   null, null, null, null, true),
  ('d0000000-0000-4000-8000-000000000071', 'a0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000001', 'oyunaa-demo', 'corporate', 'a',
   'Мөнх', 'Оюунаа', 'initial', 'Маркетинг', 'Демо Групп ХХК', '+97699000004', 'employee3@demo.mn',
   null, null, null, null, true);

-- Make creation order deterministic (first card = editable on Free)
update public.cards set created_at = now() - interval '50 days' where id = 'd0000000-0000-4000-8000-000000000081';
update public.cards set created_at = now() - interval '40 days' where id = 'd0000000-0000-4000-8000-000000000082';

-- expired@demo.mn: plan ended 5 days ago → falls back to Free
update public.subscriptions
   set status = 'expired', current_period_start = now() - interval '35 days', current_period_end = now() - interval '5 days'
 where id = 'b0000000-0000-4000-8000-000000000008';

insert into public.card_links (card_id, kind, label, url, sort) values
  ('d0000000-0000-4000-8000-000000000002', 'facebook',  'Facebook',  'https://facebook.com/demo.bat', 1),
  ('d0000000-0000-4000-8000-000000000002', 'telegram',  'Telegram',  'https://t.me/demobat', 2),
  ('d0000000-0000-4000-8000-000000000031', 'linkedin',  'LinkedIn',  'https://linkedin.com/in/demo-saraa', 1),
  ('d0000000-0000-4000-8000-000000000031', 'instagram', 'Instagram', 'https://instagram.com/demo.saraa', 2),
  ('d0000000-0000-4000-8000-000000000031', 'website',   'Вэбсайт',   'https://saraa.example.mn', 3),
  ('d0000000-0000-4000-8000-000000000032', 'facebook',  'Facebook',  'https://facebook.com/demo.realty', 1),
  ('d0000000-0000-4000-8000-000000000041', 'linkedin',  'LinkedIn',  'https://linkedin.com/company/demo-group', 1),
  ('d0000000-0000-4000-8000-000000000051', 'viber',     'Viber',     'tel:+97699000002', 1),
  ('d0000000-0000-4000-8000-000000000081', 'instagram', 'Instagram', 'https://instagram.com/demo.khulan', 1);

-- -----------------------------------------------------------------------------
-- Contacts
-- -----------------------------------------------------------------------------
insert into public.contacts (owner_id, via_card_id, name, title, company, phone, email, source, met_at,
                             met_where_type, met_where_text, note, tags, status, follow_up_at, last_contacted_at, consent_at)
values
  -- basic (Free): no CRM fields
  ('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'Энхжин Б.', 'Худалдан авалт', 'Барилга ХХК',
   '+97699887766', null, 'exchange', current_date - 3, null, null, null, '{}', 'new', null, null, now() - interval '3 days'),
  ('a0000000-0000-4000-8000-000000000002', null, 'Мөнхбат Д.', null, null, '+97688776655', null, 'manual', null, null, null, null, '{}', 'new', null, null, null),
  -- pro: CRM with follow-ups (today, overdue, future)
  ('a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000031', 'Батзориг Т.', 'Санхүүгийн менежер', 'Говь ХК',
   '+97699110011', 'batzorig@example.mn', 'exchange', current_date - 7, 'event', 'Startup Mongolia 2026',
   'Гэр бүлийн эрүүл мэндийн даатгал сонирхсон.', '{event,hot}', 'follow_up', current_date, null, now() - interval '7 days'),
  ('a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000031', 'Солонго Э.', 'HR', 'Хаан Логистик',
   '+97699110022', 'solongo@example.mn', 'exchange', current_date - 14, 'office', 'Тэдний оффис',
   'Ажилчдын бүлгийн даатгал — 40 хүн.', '{b2b}', 'follow_up', current_date - 2, now() - interval '10 days', now() - interval '14 days'),
  ('a0000000-0000-4000-8000-000000000003', null, 'Дорж П.', 'Захирал', 'Дорж Констракшн',
   '+97699110033', null, 'qr', current_date - 20, 'other', 'Найзын хурим', null, '{}', 'customer', current_date + 5, now() - interval '15 days', null),
  ('a0000000-0000-4000-8000-000000000003', null, 'Alice Smith', 'Partner', 'Nomad Ventures',
   null, 'alice@example.com', 'manual', current_date - 30, 'online', 'Zoom', null, '{investor}', 'partner', null, null, null),
  -- employee contacts
  ('a0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000051', 'Цэцгээ Л.', 'Худалдан авалт', 'Эрдэнэт Үйлдвэр',
   '+97699330011', null, 'exchange', current_date - 1, 'event', 'Mining Week', 'Үнийн санал илгээх', '{mining}', 'follow_up', current_date + 1, null, now() - interval '1 day');

-- -----------------------------------------------------------------------------
-- 30 days of sample events for every published card (anonymous visitor hashes, no IPs)
-- -----------------------------------------------------------------------------
select setseed(0.42);

insert into public.card_events (card_id, event, link_kind, visitor_hash, viewer_user_id, created_at)
select
  c.id,
  ev.event,
  case when ev.event = 'link_click' then (array['facebook', 'instagram', 'linkedin', 'telegram', 'website'])[1 + floor(random() * 5)::int] end,
  encode(extensions.digest('demo-visitor-' || c.slug || '-' || floor(random() * 40)::int, 'sha256'), 'hex'),
  null,
  (now() - (d || ' days')::interval) - (floor(random() * 600) || ' minutes')::interval
from public.cards c
cross join generate_series(0, 29) d
cross join lateral (
  select unnest(array_cat(
    array_fill('view'::text,         array[1 + floor(random() * 6)::int]),
    array_cat(
      array_fill('qr_open'::text,      array[floor(random() * 4)::int]),
      array_cat(
        array_fill('link_click'::text,   array[floor(random() * 3)::int]),
        array_fill('contact_save'::text, array[floor(random() * 2)::int])
      )
    )
  )) as event
) ev
where c.is_published and c.deleted_at is null;

-- A named viewer (pro@demo.mn opted in) on the basic card
insert into public.card_events (card_id, event, visitor_hash, viewer_user_id, created_at)
values ('d0000000-0000-4000-8000-000000000002', 'view',
        encode(extensions.digest('demo-named-viewer', 'sha256'), 'hex'),
        'a0000000-0000-4000-8000-000000000003', now() - interval '2 hours');

-- Exchange events matching the seeded exchange contacts
insert into public.card_events (card_id, event, visitor_hash, created_at) values
  ('d0000000-0000-4000-8000-000000000002', 'exchange', encode(extensions.digest('demo-exch-1', 'sha256'), 'hex'), now() - interval '3 days'),
  ('d0000000-0000-4000-8000-000000000031', 'exchange', encode(extensions.digest('demo-exch-2', 'sha256'), 'hex'), now() - interval '7 days'),
  ('d0000000-0000-4000-8000-000000000031', 'exchange', encode(extensions.digest('demo-exch-3', 'sha256'), 'hex'), now() - interval '14 days'),
  ('d0000000-0000-4000-8000-000000000051', 'exchange', encode(extensions.digest('demo-exch-4', 'sha256'), 'hex'), now() - interval '1 day');

-- A paid payment history row for pro@demo.mn
insert into public.payments (subscription_id, plan_id, seats, qpay_invoice_id, sender_invoice_no, amount_mnt, status, paid_amount_mnt, paid_at, created_at)
values ('b0000000-0000-4000-8000-000000000003', 'pro', 1, 'demo-invoice-1', 'DEMO-SEED-0001', 9900, 'paid', 9900,
        now() - interval '10 days', now() - interval '10 days');
