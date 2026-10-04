-- =============================================================================
-- Digital Card — 0007_app_rpc: read-only RPCs for the web / mobile apps
-- (entitlement summary for UI, link stats, platform admin lists)
-- =============================================================================

-- Everything the UI needs to show/hide features. The DB still enforces every rule.
create or replace function public.get_my_entitlements()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  personal public.subscriptions%rowtype;
  result jsonb;
begin
  if uid is null then
    return null;
  end if;

  select * into personal from public.subscriptions s where s.owner_user_id = uid;

  select jsonb_build_object(
    'has_active_plan', public.has_active_plan(uid),
    'plan_ids', coalesce((select jsonb_agg(distinct p.id) from public.active_plans(uid) p), '[]'::jsonb),
    'personal_plan_id', case when personal.status = 'active' and personal.current_period_end > now() then personal.plan_id else 'free' end,
    'personal_period_end', personal.current_period_end,
    'personal_expired', public.is_personal_plan_expired(uid),
    'card_quota', public.card_quota(uid),
    'personal_card_count', (select count(*) from public.cards c where c.owner_id = uid and c.org_id is null and c.deleted_at is null),
    'crm_enabled', public.crm_enabled(uid),
    'contact_limit', public.contact_limit(uid),
    'contact_count', (select count(*) from public.contacts c where c.owner_id = uid),
    'editable_card_ids', coalesce((
      select jsonb_agg(c.id) from public.cards c
       where c.deleted_at is null
         and (c.owner_id = uid or (c.org_id is not null and public.is_org_admin(c.org_id)))
         and public.can_edit_card(c.id)
    ), '[]'::jsonb),
    'orgs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'org_id', m.org_id, 'role', m.role, 'status', m.status, 'name', o.name,
        'active', public.org_has_active_plan(m.org_id),
        'allow_employee_edit_fields', o.allow_employee_edit_fields,
        'locked_template_id', o.locked_template_id))
        from public.org_members m join public.organizations o on o.id = m.org_id
       where m.user_id = uid
    ), '[]'::jsonb),
    'is_admin', exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin')
  ) into result;

  return result;
end;
$$;

-- Link clicks per link kind for the caller's cards.
create or replace function public.get_link_stats(p_card_ids uuid[], p_from timestamptz default null)
returns table (card_id uuid, link_kind text, clicks bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select e.card_id, coalesce(e.link_kind, 'custom'), count(*)
    from public.card_events e
   where e.card_id = any (p_card_ids)
     and public.can_view_card(e.card_id)
     and e.event = 'link_click'
     and (p_from is null or e.created_at >= p_from)
   group by e.card_id, coalesce(e.link_kind, 'custom')
   order by count(*) desc;
$$;

-- Org admin: member list with names/e-mails of their own organization.
create or replace function public.get_org_members(p_org_id uuid)
returns table (member_id uuid, user_id uuid, email text, full_name text, role text, status text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.user_id, coalesce(u.email, m.invited_email), p.full_name, m.role, m.status, m.created_at
    from public.org_members m
    left join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
   where m.org_id = p_org_id and public.is_org_admin(p_org_id)
   order by (m.role = 'owner') desc, m.created_at;
$$;

-- Platform admin (MFA/aal2 required by is_platform_admin): users with their plan.
create or replace function public.admin_list_users(p_search text default null, p_limit int default 200)
returns table (id uuid, email text, full_name text, role text, plan_id text, sub_status text,
               period_end timestamptz, card_count bigint, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'admin_mfa_required' using errcode = '42501';
  end if;
  return query
  select u.id, u.email::text, p.full_name, p.role, s.plan_id, s.status, s.current_period_end,
         (select count(*) from public.cards c where c.owner_id = u.id and c.deleted_at is null),
         u.created_at
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.subscriptions s on s.owner_user_id = u.id
   where p_search is null or u.email ilike '%' || p_search || '%' or p.full_name ilike '%' || p_search || '%'
   order by u.created_at desc
   limit least(greatest(p_limit, 1), 1000);
end;
$$;

-- Account deletion cascades to cards: those must be real deletes, not soft deletes.
create or replace function public.cards_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_client_request() or current_setting('app.account_delete', true) = 'on' then
    return old; -- service role / cascades / account deletion: real delete
  end if;
  perform set_config('app.soft_delete', 'on', true);
  update public.cards set deleted_at = now(), is_published = false where id = old.id and deleted_at is null;
  perform set_config('app.soft_delete', 'off', true);
  insert into public.audit_log (actor_id, action, entity, entity_id)
  values (auth.uid(), 'card.soft_delete', 'cards', old.id::text);
  return null;
end;
$$;

-- Users may delete their own account (store requirement); cascades remove their data.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if exists (select 1 from public.organizations o where o.owner_id = uid) then
    raise exception 'org_owner_must_transfer' using errcode = 'P0001';
  end if;
  insert into public.audit_log (actor_id, action, entity, entity_id) values (uid, 'account.delete', 'auth.users', uid::text);
  perform set_config('app.account_delete', 'on', true);
  delete from auth.users where id = uid;
  perform set_config('app.account_delete', 'off', true);
end;
$$;

revoke execute on function public.get_my_entitlements() from public, anon;
revoke execute on function public.get_link_stats(uuid[], timestamptz) from public, anon;
revoke execute on function public.get_org_members(uuid) from public, anon;
revoke execute on function public.admin_list_users(text, int) from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.get_my_entitlements() to authenticated;
grant execute on function public.get_link_stats(uuid[], timestamptz) to authenticated;
grant execute on function public.get_org_members(uuid) to authenticated;
grant execute on function public.admin_list_users(text, int) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
