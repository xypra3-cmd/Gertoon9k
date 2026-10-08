#!/usr/bin/env bash
# Brings up the full local stack: Docker (if needed), Supabase, QPay/Turnstile mock, migrations + seed.
# Usage: scripts/dev-up.sh [--reset]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! docker info >/dev/null 2>&1; then
  if command -v dockerd >/dev/null; then
    (dockerd >/tmp/dockerd.log 2>&1 &)
    for _ in $(seq 1 40); do docker info >/dev/null 2>&1 && break; sleep 1; done
  fi
fi
docker info >/dev/null 2>&1 || { echo "Docker is not running"; exit 1; }

cd "$ROOT/backend"
[ -f supabase/.env ] || { echo "Create backend/supabase/.env from supabase/.env.example first"; exit 1; }
# ai-assist imports the Claude SDK from a local node_modules (nodeModulesDir: manual)
{ [ -d supabase/functions/ai-assist/node_modules ] && [ -d supabase/functions/wallet-pass/node_modules ]; } || npm run functions:deps >/dev/null
# Self-signed Wallet test chain (only fills empty values; real certificates are never overwritten)
"$ROOT/scripts/dev-wallet-certs.sh" >/dev/null || true
# config.toml reads SENTRY_* with env(): add the keys to an older .env (local mock DSN, never a real one)
grep -q '^SENTRY_DSN=' supabase/.env || printf '\nSENTRY_DSN=http://mocksentrykey@host.docker.internal:54399/1\n' >> supabase/.env
grep -q '^SENTRY_ENVIRONMENT=' supabase/.env || printf 'SENTRY_ENVIRONMENT=local\n' >> supabase/.env
EXCLUDE="studio,logflare,vector,imgproxy,supavisor,realtime,postgres-meta"
# A cold start can time out while Postgres boots, or skip the edge runtime: retry until healthy.
for attempt in 1 2 3; do
  if timeout 60 supabase status >/dev/null 2>&1 && ! timeout 60 supabase status 2>&1 | grep -q "edge_runtime"; then break; fi
  timeout 120 supabase stop >/dev/null 2>&1 || true
  # Host variables must not leak into the edge runtime (they override supabase/.env).
  env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL -u SSL_CERT_FILE -u DENO_CERT -u DENO_TLS_CA_STORE \
    supabase start -x "$EXCLUDE" || sleep 5
done

if ! curl -s -o /dev/null http://127.0.0.1:54399/__mock/state; then
  (node supabase/tests/mocks/mock-server.mjs >/tmp/dc-mock.log 2>&1 &)
fi
[ "${1:-}" = "--reset" ] && supabase db reset
echo "Stack is up."
