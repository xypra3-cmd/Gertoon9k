#!/usr/bin/env bash
# Local development only: a self-signed certificate chain so the wallet-pass function can be
# exercised and tested without Apple/Google accounts. Real devices reject these passes.
# Writes PEMs to backend/supabase/.wallet-dev/ (gitignored) and fills EMPTY keys in supabase/.env.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV="$ROOT/backend/supabase/.env"
DIR="$ROOT/backend/supabase/.wallet-dev"
command -v openssl >/dev/null || { echo "openssl not found — wallet stays 'not configured' locally"; exit 0; }
[ -f "$ENV" ] || exit 0

current() { grep -E "^$1=" "$ENV" | head -1 | cut -d= -f2- || true; }
setkey() {
  if grep -qE "^$1=" "$ENV"; then
    [ -n "$(current "$1")" ] && return 0 # never overwrite a real value
    sed -i.bak "s|^$1=.*|$1=$2|" "$ENV" && rm -f "$ENV.bak"
  else
    printf '%s=%s\n' "$1" "$2" >>"$ENV"
  fi
}

mkdir -p "$DIR"
if [ ! -f "$DIR/pass.pem" ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj "/CN=Dev WWDR (not Apple)" -keyout "$DIR/ca.key" -out "$DIR/ca.pem" 2>/dev/null
  openssl req -newkey rsa:2048 -nodes -subj "/CN=Pass Type ID: pass.mn.digitalcard.dev/OU=DEVTEAM01" -keyout "$DIR/pass.key" -out "$DIR/pass.csr" 2>/dev/null
  openssl x509 -req -in "$DIR/pass.csr" -CA "$DIR/ca.pem" -CAkey "$DIR/ca.key" -CAcreateserial -days 3650 -out "$DIR/pass.pem" 2>/dev/null
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$DIR/google.key" 2>/dev/null
  openssl pkey -in "$DIR/google.key" -pubout -out "$DIR/google.pub" 2>/dev/null
fi
b64() { base64 <"$1" | tr -d '\n'; }
setkey PUBLIC_WEB_URL "http://localhost:5173"
setkey APPLE_PASS_TYPE_ID "pass.mn.digitalcard.dev"
setkey APPLE_TEAM_ID "DEVTEAM01"
setkey APPLE_PASS_CERT_B64 "$(b64 "$DIR/pass.pem")"
setkey APPLE_PASS_KEY_B64 "$(b64 "$DIR/pass.key")"
setkey APPLE_PASS_KEY_PASSWORD ""
setkey APPLE_WWDR_CERT_B64 "$(b64 "$DIR/ca.pem")"
setkey GOOGLE_WALLET_ISSUER_ID "3388000000000000000"
setkey GOOGLE_WALLET_SA_EMAIL "wallet-dev@digitalcard-dev.iam.gserviceaccount.com"
setkey GOOGLE_WALLET_SA_KEY_B64 "$(b64 "$DIR/google.key")"
echo "wallet dev certificates ready ($DIR)"
