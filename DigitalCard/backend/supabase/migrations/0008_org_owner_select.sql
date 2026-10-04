-- =============================================================================
-- Digital Card — 0008: the organization owner can always read their organization.
-- Fixes INSERT … RETURNING for a freshly created org (the owner membership row is
-- added by an AFTER trigger and is not yet visible to the RETURNING policy check).
-- =============================================================================
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations
  for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_org_member(id) or (select public.is_platform_admin()));
