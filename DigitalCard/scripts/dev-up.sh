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
EXCLUDE="studio,logflare,vector,imgproxy,supavisor,realtime,postgres-meta"
# A cold start can time out while Postgres boots, or skip the edge runtime: retry until healthy.
for attempt in 1 2 3; do
  if supabase status >/dev/null 2>&1 && ! supabase status 2>&1 | grep -q "edge_runtime"; then break; fi
  supabase stop >/dev/null 2>&1 || true
  supabase start -x "$EXCLUDE" || sleep 5
done

if ! curl -s -o /dev/null http://127.0.0.1:54399/__mock/state; then
  (node supabase/tests/mocks/mock-server.mjs >/tmp/dc-mock.log 2>&1 &)
fi
[ "${1:-}" = "--reset" ] && supabase db reset
echo "Stack is up."
