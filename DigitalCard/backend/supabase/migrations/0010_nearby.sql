-- =============================================================================
-- Digital Card — 0010_nearby: phone-to-phone card exchange without scanning a QR.
--
--   * «Bump» (Ойртуулах): two phones are held/tapped together. Each app sends a
--     pulse with a coarse geohash (≈1 km cell, never stored beyond 10 minutes).
--     Two pulses from different users in the same cell within 3 seconds match.
--   * «Code» (6 оронтой код): fallback without location — one phone shows a code
--     valid for 2 minutes, the other types it.
--
-- Both sides get each other's card as a contact (source 'nearby'). Each side's
-- contact is inserted in that side's own request (owner = auth.uid()), so every
-- contact guard (limit, CRM) from 0002 keeps applying unchanged.
-- No IP, no precise location: the geohash is truncated to 6 characters on input.
-- =============================================================================

alter table public.contacts drop constraint if exists contacts_source_check;
alter table public.contacts
  add constraint contacts_source_check check (source in ('exchange', 'qr', 'manual', 'nearby'));

create table public.nearby_pulses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  card_id       uuid references public.cards (id) on delete cascade,
  kind          text not null check (kind in ('bump', 'code', 'attempt')),
  geohash       text check (geohash ~ '^[0-9b-hjkmnp-z]{5,6}$'),
  code          text check (code ~ '^[0-9]{6}$'),
  partner_pulse uuid references public.nearby_pulses (id) on delete set null,
  claimed_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index nearby_pulses_bump_idx on public.nearby_pulses (left(geohash, 5), created_at)
  where kind = 'bump' and partner_pulse is null;
create index nearby_pulses_code_idx on public.nearby_pulses (code, created_at)
  where kind = 'code' and partner_pulse is null;
create index nearby_pulses_user_idx on public.nearby_pulses (user_id, created_at);
create index nearby_pulses_created_idx on public.nearby_pulses (created_at);

-- RPC-only table: no policies, so clients can neither read nor write it directly.
alter table public.nearby_pulses enable row level security;
revoke all on public.nearby_pulses from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- Public facts about a card that the other side receives (same fields as public_cards).
create or replace function public.nearby_card_info(p_card uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'card_id', c.id, 'slug', c.slug, 'first_name', c.first_name, 'last_name', c.last_name,
    'title', c.title, 'company', c.company, 'avatar_path', c.avatar_path,
    'template_id', c.template_id, 'color_scheme', c.color_scheme)
  from public.cards c
  where c.id = p_card and c.is_published and c.deleted_at is null;
$$;

-- Saves the partner's card as the caller's contact (dedup by card). Returns the contact id or an error key.
create or replace function public.nearby_save_contact(p_my_card uuid, p_partner_card uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c        public.cards%rowtype;
  existing uuid;
  new_id   uuid;
begin
  select * into c from public.cards x where x.id = p_partner_card and x.is_published and x.deleted_at is null;
  if not found then
    return jsonb_build_object('saved', false, 'reason', 'card_unavailable');
  end if;
  select k.id into existing from public.contacts k where k.owner_id = auth.uid() and k.card_id = c.id limit 1;
  if existing is not null then
    return jsonb_build_object('saved', true, 'contact_id', existing, 'duplicate', true);
  end if;
  begin
    insert into public.contacts (owner_id, card_id, via_card_id, name, title, company, phone, email, website, source)
    values (auth.uid(), c.id, p_my_card,
            left(coalesce(nullif(btrim(concat_ws(' ', c.last_name, c.first_name)), ''), c.slug), 120),
            c.title, c.company, c.phone, c.email, c.website, 'nearby')
    returning id into new_id;
  exception when insufficient_privilege then
    if sqlerrm = 'contact_limit_reached' then
      return jsonb_build_object('saved', false, 'reason', 'contact_limit_reached');
    end if;
    raise;
  end;
  return jsonb_build_object('saved', true, 'contact_id', new_id, 'duplicate', false);
end;
$$;

-- Caller's own published card, or null.
create or replace function public.nearby_my_card(p_card uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id from public.cards c
  where c.id = p_card and c.owner_id = auth.uid() and c.is_published and c.deleted_at is null;
$$;

-- At most 20 pulses (bump + code + attempts) per user per minute.
create or replace function public.nearby_rate_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) < 20 from public.nearby_pulses p
  where p.user_id = auth.uid() and p.created_at > now() - interval '1 minute';
$$;

create or replace function public.nearby_matched(p_partner_card uuid, p_save jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('status', 'matched', 'partner', public.nearby_card_info(p_partner_card)) || p_save;
$$;

-- -----------------------------------------------------------------------------
-- Bump
-- -----------------------------------------------------------------------------
create or replace function public.nearby_bump(p_card_id uuid, p_geohash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me       uuid := auth.uid();
  my_card  uuid := public.nearby_my_card(p_card_id);
  cell     text := left(lower(btrim(coalesce(p_geohash, ''))), 6);
  cands    uuid[];
  partner  public.nearby_pulses%rowtype;
  mine     uuid;
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if my_card is null then
    return jsonb_build_object('status', 'card_unavailable');
  end if;
  if cell !~ '^[0-9b-hjkmnp-z]{5,6}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  if not public.nearby_rate_ok() then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  -- Serialize bumps inside one cell so two simultaneous pulses can't both "wait".
  perform pg_advisory_xact_lock(hashtextextended('bump:' || left(cell, 5), 0));

  -- One candidate per other user (a double tap from the same phone is not ambiguity).
  select array_agg(distinct p.user_id) into cands
  from public.nearby_pulses p
  where p.kind = 'bump' and p.partner_pulse is null
    and left(p.geohash, 5) = left(cell, 5)
    and p.created_at > now() - interval '3 seconds'
    and p.user_id <> me;

  if coalesce(cardinality(cands), 0) > 1 then
    return jsonb_build_object('status', 'ambiguous');
  end if;

  if coalesce(cardinality(cands), 0) = 0 then
    insert into public.nearby_pulses (user_id, card_id, kind, geohash) values (me, my_card, 'bump', cell)
    returning id into mine;
    return jsonb_build_object('status', 'waiting', 'pulse_id', mine);
  end if;

  select * into partner from public.nearby_pulses p
  where p.kind = 'bump' and p.partner_pulse is null and p.user_id = cands[1]
    and left(p.geohash, 5) = left(cell, 5) and p.created_at > now() - interval '3 seconds'
  order by p.created_at desc
  limit 1;
  insert into public.nearby_pulses (user_id, card_id, kind, geohash, partner_pulse, claimed_at)
  values (me, my_card, 'bump', cell, partner.id, now())
  returning id into mine;
  update public.nearby_pulses set partner_pulse = mine where id = partner.id;

  return public.nearby_matched(partner.card_id, public.nearby_save_contact(my_card, partner.card_id));
end;
$$;

-- -----------------------------------------------------------------------------
-- Code
-- -----------------------------------------------------------------------------
create or replace function public.nearby_code_create(p_card_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me      uuid := auth.uid();
  my_card uuid := public.nearby_my_card(p_card_id);
  c       text;
  mine    uuid;
  tries   int := 0;
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if my_card is null then
    return jsonb_build_object('status', 'card_unavailable');
  end if;
  if not public.nearby_rate_ok() then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('nearby-code', 0));
  loop
    c := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (
      select 1 from public.nearby_pulses p
      where p.kind = 'code' and p.code = c and p.created_at > now() - interval '2 minutes');
    tries := tries + 1;
    if tries > 20 then
      return jsonb_build_object('status', 'rate_limited');
    end if;
  end loop;
  insert into public.nearby_pulses (user_id, card_id, kind, code) values (me, my_card, 'code', c)
  returning id into mine;
  return jsonb_build_object('status', 'waiting', 'pulse_id', mine, 'code', c, 'expires_in', 120);
end;
$$;

create or replace function public.nearby_code_claim(p_code text, p_card_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me      uuid := auth.uid();
  my_card uuid := public.nearby_my_card(p_card_id);
  host    public.nearby_pulses%rowtype;
  mine    uuid;
  fails   int;
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if my_card is null then
    return jsonb_build_object('status', 'card_unavailable');
  end if;
  -- Brute-force guard: 10 claim attempts per 10 minutes per user.
  select count(*) into fails from public.nearby_pulses p
  where p.user_id = me and p.kind = 'attempt' and p.created_at > now() - interval '10 minutes';
  if fails >= 10 or not public.nearby_rate_ok() then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  insert into public.nearby_pulses (user_id, kind) values (me, 'attempt');

  if coalesce(p_code, '') !~ '^[0-9]{6}$' then
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into host from public.nearby_pulses p
  where p.kind = 'code' and p.code = p_code and p.partner_pulse is null
    and p.created_at > now() - interval '2 minutes'
  order by p.created_at desc
  limit 1
  for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if host.user_id = me then
    return jsonb_build_object('status', 'own_code');
  end if;

  insert into public.nearby_pulses (user_id, card_id, kind, partner_pulse, claimed_at)
  values (me, my_card, 'code', host.id, now())
  returning id into mine;
  update public.nearby_pulses set partner_pulse = mine where id = host.id;

  return public.nearby_matched(host.card_id, public.nearby_save_contact(my_card, host.card_id));
end;
$$;

-- -----------------------------------------------------------------------------
-- Poll: the waiting side learns about the match and saves its own contact once.
-- -----------------------------------------------------------------------------
create or replace function public.nearby_poll(p_pulse_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me      uuid := auth.uid();
  p       public.nearby_pulses%rowtype;
  partner public.nearby_pulses%rowtype;
  ttl     interval;
begin
  select * into p from public.nearby_pulses x where x.id = p_pulse_id and x.user_id = me for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p.partner_pulse is null then
    ttl := case when p.kind = 'code' then interval '2 minutes' else interval '8 seconds' end;
    if p.created_at < now() - ttl then
      return jsonb_build_object('status', 'expired');
    end if;
    return jsonb_build_object('status', 'waiting');
  end if;
  select * into partner from public.nearby_pulses x where x.id = p.partner_pulse;
  if p.claimed_at is not null then
    return jsonb_build_object('status', 'matched', 'partner', public.nearby_card_info(partner.card_id), 'saved', true,
                              'duplicate', true);
  end if;
  update public.nearby_pulses set claimed_at = now() where id = p.id;
  return public.nearby_matched(partner.card_id, public.nearby_save_contact(p.card_id, partner.card_id));
end;
$$;

-- -----------------------------------------------------------------------------
-- Privileges + cleanup (pulses live at most 10 minutes)
-- -----------------------------------------------------------------------------
revoke execute on function public.nearby_card_info(uuid) from public, anon, authenticated;
revoke execute on function public.nearby_save_contact(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.nearby_my_card(uuid) from public, anon, authenticated;
revoke execute on function public.nearby_rate_ok() from public, anon, authenticated;
revoke execute on function public.nearby_matched(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.nearby_bump(uuid, text) from public, anon;
revoke execute on function public.nearby_code_create(uuid) from public, anon;
revoke execute on function public.nearby_code_claim(text, uuid) from public, anon;
revoke execute on function public.nearby_poll(uuid) from public, anon;
grant execute on function public.nearby_bump(uuid, text) to authenticated;
grant execute on function public.nearby_code_create(uuid) to authenticated;
grant execute on function public.nearby_code_claim(text, uuid) to authenticated;
grant execute on function public.nearby_poll(uuid) to authenticated;

select cron.schedule('nearby-cleanup', '*/10 * * * *',
  $$delete from public.nearby_pulses where created_at < now() - interval '10 minutes'$$);
