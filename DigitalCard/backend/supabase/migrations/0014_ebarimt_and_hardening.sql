-- 0014: Electronic VAT receipt (e-barimt) for every paid invoice + an audit fix.
--
-- Mongolian tax law requires an e-barimt for B2C/B2B sales. QPay issues it for a paid payment
-- (POST /v2/ebarimt_v3/create). The receipt state lives on the payment row; the Edge Functions
-- issue it right after the payment is confirmed and qpay-reconcile retries failures.

alter table public.payments
  add column ebarimt_status   text not null default 'none'
    check (ebarimt_status in ('none', 'pending', 'issued', 'failed')),
  add column ebarimt_id       text,
  add column ebarimt_qr       text,
  add column ebarimt_attempts int  not null default 0 check (ebarimt_attempts >= 0),
  -- Company register number (7 digits) when a business wants a B2B receipt; null = citizen.
  add column ebarimt_receiver text check (ebarimt_receiver is null or ebarimt_receiver ~ '^[0-9]{7}$'),
  add column ebarimt_at       timestamptz;

create index payments_ebarimt_todo_idx on public.payments (paid_at)
  where status = 'paid' and ebarimt_status in ('pending', 'failed');

-- A payment that becomes paid always needs a receipt.
create or replace function public.payments_require_ebarimt()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' and new.ebarimt_status = 'none' then
    new.ebarimt_status := 'pending';
  end if;
  return new;
end;
$$;

revoke execute on function public.payments_require_ebarimt() from public, anon, authenticated;

create trigger payments_require_ebarimt
  before update of status on public.payments
  for each row execute function public.payments_require_ebarimt();

-- Service role only: record the outcome of one issuing attempt.
create or replace function public.record_ebarimt(p_payment_id uuid, p_ok boolean, p_ebarimt_id text, p_qr text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  st text;
begin
  update public.payments
     set ebarimt_attempts = ebarimt_attempts + 1,
         ebarimt_status   = case when p_ok then 'issued' else 'failed' end,
         ebarimt_id       = case when p_ok then left(p_ebarimt_id, 200) else ebarimt_id end,
         ebarimt_qr       = case when p_ok then left(p_qr, 2000) else ebarimt_qr end,
         ebarimt_at       = case when p_ok then now() else ebarimt_at end
   where id = p_payment_id
     and status = 'paid'
     and ebarimt_status in ('pending', 'failed')
  returning ebarimt_status into st;
  return coalesce(st, 'skipped');
end;
$$;

revoke execute on function public.record_ebarimt(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.record_ebarimt(uuid, boolean, text, text) to service_role;

-- Audit fix: card_shows_branding(owner, org) had to stay executable by anon because functions inside
-- a view are checked against the caller — but then anyone could ask «does user X have a paid plan?».
-- The view now uses card_branding(card_id), which only answers for published cards (already public).
create or replace function public.card_branding(p_card_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select c.org_id is null and not public.has_active_plan(c.owner_id)
  from public.cards c
  where c.id = p_card_id and c.is_published and c.deleted_at is null;
$$;
revoke execute on function public.card_branding(uuid) from public;
grant execute on function public.card_branding(uuid) to anon, authenticated, service_role;

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
  c.updated_at,
  public.card_branding(c.id) as show_branding
from public.cards c
left join public.organizations o on o.id = c.org_id
where c.is_published and c.deleted_at is null;

revoke execute on function public.card_shows_branding(uuid, uuid) from public, anon, authenticated;
