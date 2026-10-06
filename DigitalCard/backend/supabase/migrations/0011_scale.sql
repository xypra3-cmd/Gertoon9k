-- =============================================================================
-- Digital Card — 0011_scale: indexes and housekeeping for 1,000–5,000+ active users.
-- See docs/SCALING.md. Only additive changes (no locks on hot paths beyond index builds,
-- which are instant on today's table sizes).
-- =============================================================================

-- Contacts list (web + mobile): `where owner_id = auth.uid() order by created_at desc`.
create index if not exists contacts_owner_created_idx on public.contacts (owner_id, created_at desc);

-- Duplicate check when a platform card is saved again (nearby exchange, QR scan of a card link).
create index if not exists contacts_owner_card_idx on public.contacts (owner_id, card_id) where card_id is not null;

-- Org dashboards: members of one org by status.
create index if not exists org_members_org_status_idx on public.org_members (org_id, status);

-- Sent/failed e-mails are only needed for a short audit window.
select cron.schedule('email-queue-cleanup', '30 17 * * *',
  $$delete from public.email_queue where status <> 'queued' and created_at < now() - interval '30 days'$$);
