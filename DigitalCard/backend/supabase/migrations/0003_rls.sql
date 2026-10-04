-- =============================================================================
-- Digital Card — 0003_rls: Row Level Security on every table + public views
-- =============================================================================

alter table public.plans          enable row level security;
alter table public.profiles       enable row level security;
alter table public.organizations  enable row level security;
alter table public.org_members    enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.cards          enable row level security;
alter table public.card_links     enable row level security;
alter table public.contacts       enable row level security;
alter table public.card_events    enable row level security;
alter table public.payments       enable row level security;
alter table public.audit_log      enable row level security;
alter table public.email_queue    enable row level security;

-- Defense in depth: tables that clients must never write.
revoke insert, update, delete, truncate on public.plans, public.subscriptions, public.payments,
  public.card_events, public.audit_log, public.email_queue from anon, authenticated;
revoke all on public.email_queue from anon, authenticated;
revoke usage, select on sequence public.card_events_id_seq, public.audit_log_id_seq, public.email_queue_id_seq
  from anon, authenticated;

-- -----------------------------------------------------------------------------
-- plans: public catalogue
-- -----------------------------------------------------------------------------
create policy plans_select_all on public.plans
  for select to anon, authenticated using (is_active);

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_platform_admin())
    -- org admins see their members' profiles
    or exists (
      select 1 from public.org_members m
      where m.user_id = profiles.id and m.status = 'active' and public.is_org_admin(m.org_id)
    )
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------
create policy organizations_select_member on public.organizations
  for select to authenticated
  using (public.is_org_member(id) or (select public.is_platform_admin()));

create policy organizations_insert_owner on public.organizations
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy organizations_update_admin on public.organizations
  for update to authenticated
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

create policy organizations_delete_owner on public.organizations
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- org_members: admins manage; members see their own row
-- (inserts normally go through the org-invite edge function; seats are enforced by trigger)
-- -----------------------------------------------------------------------------
create policy org_members_select on public.org_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_org_admin(org_id) or (select public.is_platform_admin()));

create policy org_members_insert_admin on public.org_members
  for insert to authenticated
  with check (public.is_org_admin(org_id) and role <> 'owner');

create policy org_members_update_admin on public.org_members
  for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

create policy org_members_delete_admin on public.org_members
  for delete to authenticated
  using ((public.is_org_admin(org_id) and role <> 'owner') or (user_id = (select auth.uid()) and role <> 'owner'));

-- -----------------------------------------------------------------------------
-- subscriptions / payments: read-only for their owners; writes only via service role
-- -----------------------------------------------------------------------------
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated
  using (
    owner_user_id = (select auth.uid())
    or (org_id is not null and public.is_org_admin(org_id))
    or (select public.is_platform_admin())
  );

create policy payments_select_own on public.payments
  for select to authenticated
  using (
    exists (
      select 1 from public.subscriptions s
      where s.id = payments.subscription_id
        and (s.owner_user_id = (select auth.uid()) or (s.org_id is not null and public.is_org_admin(s.org_id)))
    )
    or (select public.is_platform_admin())
  );

-- -----------------------------------------------------------------------------
-- cards
-- Public reads go through the public_cards view (no private columns).
-- -----------------------------------------------------------------------------
create policy cards_select_owner on public.cards
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (org_id is not null and public.is_org_admin(org_id))
    or (select public.is_platform_admin())
  );

-- quota / expiry / org rules are checked in cards_before_insert
create policy cards_insert_self on public.cards
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy cards_update_editor on public.cards
  for update to authenticated
  using (public.can_edit_card(id))
  with check (public.can_edit_card(id));

-- converted into a soft delete by cards_before_delete
create policy cards_delete_owner on public.cards
  for delete to authenticated
  using (owner_id = (select auth.uid()) or (org_id is not null and public.is_org_admin(org_id)));

-- -----------------------------------------------------------------------------
-- card_links
-- -----------------------------------------------------------------------------
create policy card_links_select on public.card_links
  for select to authenticated
  using (public.can_view_card(card_id));

create policy card_links_insert on public.card_links
  for insert to authenticated
  with check (public.can_edit_card_links(card_id));

create policy card_links_update on public.card_links
  for update to authenticated
  using (public.can_edit_card_links(card_id))
  with check (public.can_edit_card_links(card_id));

create policy card_links_delete on public.card_links
  for delete to authenticated
  using (public.can_edit_card_links(card_id));

-- -----------------------------------------------------------------------------
-- contacts: strictly private to the owner. CRM columns guarded by trigger.
-- -----------------------------------------------------------------------------
create policy contacts_select_own on public.contacts
  for select to authenticated using (owner_id = (select auth.uid()));

create policy contacts_insert_own on public.contacts
  for insert to authenticated with check (owner_id = (select auth.uid()));

create policy contacts_update_own on public.contacts
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy contacts_delete_own on public.contacts
  for delete to authenticated using (owner_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- card_events: no client INSERT (only the track-event / contact-exchange functions).
-- Card owner sees own card's events; org admin sees every employee's org card events.
-- -----------------------------------------------------------------------------
create policy card_events_select on public.card_events
  for select to authenticated
  using (
    exists (
      select 1 from public.cards c
      where c.id = card_events.card_id
        and (c.owner_id = (select auth.uid()) or (c.org_id is not null and public.is_org_admin(c.org_id)))
    )
  );

-- -----------------------------------------------------------------------------
-- audit_log: platform admins only (with MFA)
-- -----------------------------------------------------------------------------
create policy audit_log_select_admin on public.audit_log
  for select to authenticated using ((select public.is_platform_admin()));

-- email_queue: no policies → service role only.

-- =============================================================================
-- Views
-- =============================================================================

-- Public card: only published, not deleted; no owner/org ids, no timestamps of private nature.
create or replace view public.public_cards
with (security_invoker = false, security_barrier = true)
as
select
  c.id,
  c.slug,
  c.template_id,
  c.color_scheme,
  c.last_name,
  c.first_name,
  c.name_format,
  c.title,
  c.company,
  c.phone,
  c.email,
  c.website,
  c.address,
  c.bio,
  c.slogan,
  c.avatar_path,
  c.logo_path,
  o.name        as org_name,
  o.brand_color as org_brand_color,
  o.logo_path   as org_logo_path,
  coalesce((
    select jsonb_agg(jsonb_build_object('kind', l.kind, 'label', l.label, 'url', l.url) order by l.sort, l.id)
    from public.card_links l where l.card_id = c.id
  ), '[]'::jsonb) as links,
  c.updated_at
from public.cards c
left join public.organizations o on o.id = c.org_id
where c.is_published and c.deleted_at is null;

revoke all on public.public_cards from anon, authenticated;
grant select on public.public_cards to anon, authenticated, service_role;

-- Daily statistics per card (Asia/Ulaanbaatar days). security_invoker → card_events RLS applies.
-- Plain view instead of a rollup table: always consistent with raw events (see docs/DECISIONS.md).
create or replace view public.card_daily_stats
with (security_invoker = true)
as
select
  e.card_id,
  (e.created_at at time zone 'Asia/Ulaanbaatar')::date as day,
  count(*) filter (where e.event = 'view')          as views,
  count(*) filter (where e.event = 'qr_open')       as qr_opens,
  count(*) filter (where e.event = 'link_click')    as link_clicks,
  count(*) filter (where e.event = 'contact_save')  as contact_saves,
  count(*) filter (where e.event = 'exchange')      as exchanges,
  count(distinct e.visitor_hash)                    as unique_visitors
from public.card_events e
group by e.card_id, (e.created_at at time zone 'Asia/Ulaanbaatar')::date;

revoke all on public.card_daily_stats from anon;
grant select on public.card_daily_stats to authenticated, service_role;
