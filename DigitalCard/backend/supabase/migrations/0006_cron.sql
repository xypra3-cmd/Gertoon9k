-- =============================================================================
-- Digital Card — 0006_cron: scheduled Edge Function calls (pg_cron + pg_net)
--
-- The functions URL and the cron secret are read from Supabase Vault, so no secret is
-- stored in this migration. Set them once per environment (see backend/README.md):
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1', 'functions_url');
--   select vault.create_secret('<same value as CRON_SECRET>', 'cron_secret');
-- If they are missing the job only logs a notice.
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_edge_function(p_name text, p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  base   text;
  secret text;
begin
  select decrypted_secret into base from vault.decrypted_secrets where name = 'functions_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';
  if base is null or secret is null then
    raise notice 'invoke_edge_function(%): vault secrets functions_url / cron_secret not set, skipping', p_name;
    return null;
  end if;
  return net.http_post(
    url     := rtrim(base, '/') || '/' || p_name,
    body    := p_body,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
    timeout_milliseconds := 30000
  );
end;
$$;

revoke execute on function public.invoke_edge_function(text, jsonb) from public, anon, authenticated;

-- Every 5 minutes: verify pending QPay invoices server-side.
select cron.schedule('qpay-reconcile', '*/5 * * * *', $$select public.invoke_edge_function('qpay-reconcile')$$);

-- Daily 00:05 Asia/Ulaanbaatar (16:05 UTC): expire subscriptions + queue reminders.
select cron.schedule('expire-subscriptions', '5 16 * * *', $$select public.invoke_edge_function('expire-subscriptions')$$);

-- Daily 09:00 Asia/Ulaanbaatar (01:00 UTC, UB has no DST): follow-up digest.
select cron.schedule('followup-digest', '0 1 * * *', $$select public.invoke_edge_function('followup-digest')$$);
