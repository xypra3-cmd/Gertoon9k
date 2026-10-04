-- =============================================================================
-- Digital Card — 0001_init: core tables, constraints, indexes
-- Permissions/RLS live in later migrations (0002+).
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- plans: the single source of truth for prices and limits.
-- Prices are assumptions and are only changed via seed / migration, never in app code.
-- -----------------------------------------------------------------------------
create table public.plans (
  id                  text primary key check (id in ('free', 'pro', 'team')),
  name_mn             text not null,
  name_en             text not null,
  price_mnt           int  not null default 0 check (price_mnt >= 0),
  card_limit          int  not null check (card_limit >= 0),
  seat_limit          int  check (seat_limit is null or seat_limit > 0),
  contact_limit       int  check (contact_limit is null or contact_limit >= 0), -- null = unlimited
  crm_enabled         bool not null default false,
  price_per_seat_mnt  int  not null default 0 check (price_per_seat_mnt >= 0),
  min_seats           int  not null default 1 check (min_seats >= 1),
  features            jsonb not null default '{}'::jsonb,
  is_active           bool not null default true
);

insert into public.plans
  (id, name_mn, name_en, price_mnt, card_limit, seat_limit, contact_limit, crm_enabled, price_per_seat_mnt, min_seats, features)
values
  ('free', 'Үнэгүй', 'Free', 0,    1, 1,    10,   false, 0,    1, '{"stats": "basic"}'),
  ('pro',  'Pro',    'Pro',  9900, 5, 1,    null, true,  0,    1, '{"stats": "funnel", "followup": true}'),
  ('team', 'Team',   'Team', 0,    1, null, null, true,  5000, 5, '{"stats": "funnel", "followup": true, "branding": true, "team_dashboard": true}');

-- -----------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  full_name             text check (char_length(full_name) <= 120),
  phone                 text check (char_length(phone) <= 40),
  locale                text not null default 'mn' check (locale in ('mn', 'en')),
  role                  text not null default 'user' check (role in ('user', 'admin')),
  -- PRIV-02: a signed-in viewer's name is shown to card owners only when this is true
  show_name_to_owners   bool not null default false,
  created_at            timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- organizations / members
-- -----------------------------------------------------------------------------
create table public.organizations (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null check (char_length(name) between 1 and 120),
  logo_path                   text,
  brand_color                 text check (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  locked_template_id          text,
  allow_employee_edit_fields  text[] not null default array['title', 'phone', 'email', 'avatar_path', 'bio']::text[],
  owner_id                    uuid not null references auth.users (id) on delete restrict,
  created_at                  timestamptz not null default now()
);

create table public.org_members (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations (id) on delete cascade,
  user_id        uuid references auth.users (id) on delete cascade,
  role           text not null default 'member' check (role in ('owner', 'admin', 'member')),
  invited_email  text check (invited_email is null or invited_email = lower(invited_email)),
  status         text not null default 'invited' check (status in ('invited', 'active')),
  created_at     timestamptz not null default now(),
  unique (org_id, user_id),
  unique (org_id, invited_email),
  check (user_id is not null or invited_email is not null),
  check (status = 'invited' or user_id is not null)
);
create index org_members_user_idx on public.org_members (user_id);

-- -----------------------------------------------------------------------------
-- subscriptions: one row per owner (user or org); renewed in place.
-- -----------------------------------------------------------------------------
create table public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  owner_user_id         uuid references auth.users (id) on delete cascade,
  org_id                uuid references public.organizations (id) on delete cascade,
  plan_id               text not null references public.plans (id),
  seats                 int  not null default 1 check (seats >= 1),
  status                text not null default 'pending' check (status in ('pending', 'active', 'expired', 'canceled')),
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  created_at            timestamptz not null default now(),
  check ((owner_user_id is null) <> (org_id is null))
);
create unique index subscriptions_owner_user_uidx on public.subscriptions (owner_user_id) where owner_user_id is not null;
create unique index subscriptions_org_uidx on public.subscriptions (org_id) where org_id is not null;

-- -----------------------------------------------------------------------------
-- cards
-- -----------------------------------------------------------------------------
create table public.cards (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  org_id        uuid references public.organizations (id) on delete set null,
  slug          text not null unique check (slug ~ '^[a-z0-9-]{6,40}$'),
  template_id   text not null default 'classic' check (template_id in
                  ('classic', 'modern', 'minimal', 'corporate', 'creative', 'dark', 'profile', 'business', 'executive', 'premium')),
  color_scheme  text not null default 'a' check (color_scheme in ('a', 'b')),
  last_name     text check (char_length(last_name) <= 60),
  first_name    text not null default '' check (char_length(first_name) <= 60),
  name_format   text not null default 'initial' check (name_format in ('initial', 'full')),
  title         text check (char_length(title) <= 80),
  company       text check (char_length(company) <= 80),
  phone         text check (char_length(phone) <= 40),
  email         text check (char_length(email) <= 254),
  website       text check (website is null or website ~ '^https://'),
  address       text check (char_length(address) <= 200),
  bio           text check (char_length(bio) <= 500),
  slogan        text check (char_length(slogan) <= 120),
  avatar_path   text,
  logo_path     text,
  is_published  bool not null default false,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index cards_owner_idx on public.cards (owner_id, created_at) where deleted_at is null;
create index cards_org_idx on public.cards (org_id) where org_id is not null;

alter table public.organizations
  add constraint organizations_locked_template_chk check (locked_template_id is null or locked_template_id in
    ('classic', 'modern', 'minimal', 'corporate', 'creative', 'dark', 'profile', 'business', 'executive', 'premium'));

create table public.card_links (
  id       uuid primary key default gen_random_uuid(),
  card_id  uuid not null references public.cards (id) on delete cascade,
  kind     text not null check (kind in
             ('facebook', 'instagram', 'linkedin', 'telegram', 'whatsapp', 'viber', 'tiktok', 'youtube', 'website', 'custom')),
  label    text check (char_length(label) <= 60),
  -- only https://, mailto:, tel: (also validated in packages/shared)
  url      text not null check (char_length(url) <= 500 and url ~* '^(https://|mailto:|tel:)'),
  sort     int  not null default 0
);
create index card_links_card_idx on public.card_links (card_id, sort);

-- -----------------------------------------------------------------------------
-- contacts (owner's CRM)
-- -----------------------------------------------------------------------------
create table public.contacts (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users (id) on delete cascade,
  card_id            uuid references public.cards (id) on delete set null, -- contact's own card if on the platform
  via_card_id        uuid references public.cards (id) on delete set null, -- owner's card the contact came through (funnel)
  name               text not null check (char_length(name) between 1 and 120),
  title              text check (char_length(title) <= 80),
  company            text check (char_length(company) <= 80),
  phone              text check (char_length(phone) <= 40),
  email              text check (char_length(email) <= 254),
  website            text check (char_length(website) <= 500),
  source             text not null default 'manual' check (source in ('exchange', 'qr', 'manual')),
  exchange_message   text check (char_length(exchange_message) <= 300), -- message left by a guest via exchange
  met_at             date,
  met_where_type     text check (met_where_type in ('event', 'office', 'online', 'other')),
  met_where_text     text check (char_length(met_where_text) <= 200),
  note               text check (char_length(note) <= 5000),
  tags               text[] not null default '{}',
  status             text not null default 'new' check (status in ('new', 'follow_up', 'customer', 'partner', 'closed')),
  follow_up_at       date,
  last_contacted_at  timestamptz,
  consent_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (source <> 'exchange' or consent_at is not null)
);
create index contacts_owner_followup_idx on public.contacts (owner_id, follow_up_at);
create index contacts_owner_status_idx on public.contacts (owner_id, status);
create index contacts_via_card_idx on public.contacts (via_card_id) where via_card_id is not null;

-- -----------------------------------------------------------------------------
-- card_events: anonymous analytics. NO IP address column, ever.
-- visitor_hash = sha256(ip + user_agent + daily salt), computed in the edge function.
-- -----------------------------------------------------------------------------
create table public.card_events (
  id              bigserial primary key,
  card_id         uuid not null references public.cards (id) on delete cascade,
  event           text not null check (event in ('view', 'qr_open', 'link_click', 'contact_save', 'exchange')),
  link_kind       text,
  visitor_hash    text not null check (visitor_hash ~ '^[0-9a-f]{64}$'),
  viewer_user_id  uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index card_events_card_created_idx on public.card_events (card_id, created_at);
create index card_events_visitor_idx on public.card_events (visitor_hash, created_at);

-- -----------------------------------------------------------------------------
-- payments (QPay v2)
-- -----------------------------------------------------------------------------
create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  subscription_id    uuid not null references public.subscriptions (id) on delete cascade,
  plan_id            text not null references public.plans (id),
  seats              int  not null default 1 check (seats >= 1),
  qpay_invoice_id    text unique,
  sender_invoice_no  text not null unique,
  amount_mnt         int  not null check (amount_mnt > 0),
  status             text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  qpay_payment_id    text,
  paid_amount_mnt    int,
  failure_reason     text,
  raw_callback       jsonb,
  paid_at            timestamptz,
  created_at         timestamptz not null default now()
);
create index payments_pending_idx on public.payments (created_at) where status = 'pending';
create index payments_subscription_idx on public.payments (subscription_id);

-- -----------------------------------------------------------------------------
-- audit_log
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id          bigserial primary key,
  actor_id    uuid,
  action      text not null,
  entity      text not null,
  entity_id   text,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- -----------------------------------------------------------------------------
-- email_queue: outgoing notifications. dedupe_key guarantees "at most one" semantics
-- (e.g. one follow-up digest per user per day, one expiry reminder per period).
-- -----------------------------------------------------------------------------
create table public.email_queue (
  id          bigserial primary key,
  user_id     uuid references auth.users (id) on delete cascade,
  to_email    text not null,
  kind        text not null check (kind in ('subscription_expiring', 'followup_digest', 'exchange_received', 'org_invite')),
  payload     jsonb not null default '{}'::jsonb,
  dedupe_key  text not null unique,
  status      text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  attempts    int  not null default 0,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index email_queue_queued_idx on public.email_queue (created_at) where status = 'queued';
