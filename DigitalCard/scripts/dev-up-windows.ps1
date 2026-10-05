# Digital Card — local stack-ийг асаах (Windows PowerShell): Supabase + QPay/Turnstile/Claude mock + seed,
# дараа нь web, mobile-ийн .env.local-д local anon key-г бичнэ.
#   powershell -ExecutionPolicy Bypass -File scripts\dev-up-windows.ps1 [-Reset]
param([switch]$Reset)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $root 'backend')

# Mock сервер (QPay v2, Turnstile, Claude API) — :54399
$mockUp = $false
try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:54399/__mock/state -TimeoutSec 2 | Out-Null; $mockUp = $true } catch {}
if (-not $mockUp) { Start-Process -WindowStyle Minimized node 'supabase\tests\mocks\mock-server.mjs'; Write-Host '✓ mock :54399' }

# Компьютерийн ANTHROPIC_* / TLS хувьсагч edge runtime руу орохгүй байх (supabase/.env-ийг давж бичдэг)
foreach ($v in 'ANTHROPIC_API_KEY','ANTHROPIC_BASE_URL','SSL_CERT_FILE','DENO_CERT') { Remove-Item "Env:$v" -ErrorAction SilentlyContinue }

supabase start -x studio,logflare,vector,imgproxy,supavisor,realtime,postgres-meta
if ($Reset) { supabase db reset }

$status = supabase status -o json | ConvertFrom-Json
$anon = $status.ANON_KEY
function SetKey($file, $name, $value) {
  $lines = if (Test-Path $file) { Get-Content $file } else { @() }
  $found = $false
  $lines = $lines | ForEach-Object { if ($_ -match "^$name=") { $found = $true; "$name=$value" } else { $_ } }
  if (-not $found) { $lines += "$name=$value" }
  $lines | Set-Content -Encoding utf8 $file
}
SetKey '..\web\.env.local' 'VITE_SUPABASE_ANON_KEY' $anon
SetKey '..\web\.env.local' 'VITE_DEMO_MODE' 'true'
SetKey '..\mobile\.env.local' 'EXPO_PUBLIC_SUPABASE_ANON_KEY' $anon

Write-Host "`nStack бэлэн:" -ForegroundColor Green
Write-Host '  API        http://127.0.0.1:54321'
Write-Host '  Имэйл (Mailpit) http://127.0.0.1:54324'
Write-Host '  Web:    cd web;    npm run dev            → http://localhost:5173'
Write-Host '  Mobile: cd mobile; npx expo start         → Android emulator (a) эсвэл Expo QR'
Write-Host '  Demo: pro@demo.mn / Demo1234!  (бусад: basic@, org-owner@, employee1@, expired@, admin@demo.mn)'
