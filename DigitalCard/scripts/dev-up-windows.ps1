# Digital Card — local stack-ийг асаах (Windows PowerShell): Supabase + QPay/Turnstile/Claude mock + seed,
# дараа нь web, mobile-ийн .env.local-д local anon key-г бичнэ.
#   powershell -ExecutionPolicy Bypass -File scripts\dev-up-windows.ps1 [-Reset]
param([switch]$Reset)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $root 'backend')

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
# Supabase/Vite нь BOM-той .env-ийг уншихгүй → BOM байвал арилгана
foreach ($f in 'supabase\.env', '..\web\.env.local', '..\mobile\.env.local') {
  if (Test-Path $f) { $full = (Resolve-Path $f).Path; [System.IO.File]::WriteAllText($full, [System.IO.File]::ReadAllText($full).TrimStart([char]0xFEFF), $utf8NoBom) }
}
if (-not (Test-Path 'supabase\.env')) { Write-Host 'backend\supabase\.env байхгүй → эхлээд scripts\setup-windows.ps1' -ForegroundColor Red; exit 1 }

# Edge Function-ийн сангууд (Claude SDK, Wallet pass гарын үсэг)
foreach ($fn in 'ai-assist', 'wallet-pass') { if (-not (Test-Path "supabase\functions\$fn\node_modules")) { npm ci --no-audit --no-fund --prefix "supabase\functions\$fn" | Out-Null } }

# Mock сервер (QPay v2, Turnstile, Claude API) — :54399
$mockUp = $false
try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:54399/__mock/state -TimeoutSec 2 | Out-Null; $mockUp = $true } catch {}
if (-not $mockUp) { Start-Process -WindowStyle Minimized node 'supabase\tests\mocks\mock-server.mjs'; Write-Host '✓ mock :54399' }

# Компьютерийн ANTHROPIC_* / TLS хувьсагч edge runtime руу орохгүй байх (supabase/.env-ийг давж бичдэг)
foreach ($v in 'ANTHROPIC_API_KEY','ANTHROPIC_BASE_URL','SSL_CERT_FILE','DENO_CERT') { Remove-Item "Env:$v" -ErrorAction SilentlyContinue }

# Docker Desktop асаагүй бол асааж, daemon бэлэн болтол хүлээнэ (≤ 3 мин)
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  $dd = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
  if (Test-Path $dd) { Write-Host '… Docker Desktop-ийг асааж байна'; Start-Process $dd }
  for ($i = 0; $i -lt 36; $i++) { Start-Sleep 5; docker info *> $null; if ($LASTEXITCODE -eq 0) { break } }
}

# Docker дөнгөж асахад хуучин контейнерууд "starting" төлөвтэй байж supabase start унадаг → дахин оролдоно
for ($try = 1; $try -le 3; $try++) {
  supabase start -x studio,logflare,vector,imgproxy,supavisor,realtime,postgres-meta
  if ($LASTEXITCODE -eq 0) { break }
  if ($try -lt 3) { Write-Host "… supabase start дахин оролдож байна ($try/3)"; Start-Sleep 15 }
}
if ($LASTEXITCODE -ne 0) { Write-Host "`nsupabase start амжилтгүй (дээрх алдааг үз). Docker Desktop асаалттай эсэхийг шалгана уу." -ForegroundColor Red; exit 1 }
if ($Reset) {
  supabase db reset
  if ($LASTEXITCODE -ne 0) { Write-Host 'supabase db reset амжилтгүй' -ForegroundColor Red; exit 1 }
}

$status = (supabase status -o json) -join "`n" | ConvertFrom-Json
$anon = $status.ANON_KEY
function SetKey($file, $name, $value) {
  $lines = if (Test-Path $file) { Get-Content $file } else { @() }
  $found = $false
  $lines = $lines | ForEach-Object { if ($_ -match "^$name=") { $found = $true; "$name=$value" } else { $_ } }
  if (-not $found) { $lines += "$name=$value" }
  [System.IO.File]::WriteAllLines((Resolve-Path $file).Path, [string[]]$lines, $utf8NoBom)
}
SetKey '..\web\.env.local' 'VITE_SUPABASE_ANON_KEY' $anon
SetKey '..\web\.env.local' 'VITE_DEMO_MODE' 'true'
SetKey '..\mobile\.env.local' 'EXPO_PUBLIC_SUPABASE_ANON_KEY' $anon

if (-not (Get-NetFirewallRule -DisplayName 'DigitalCard local mock 54399' -ErrorAction SilentlyContinue)) {
  Write-Host "`n! AI / QPay mock-д Docker-оос хандахын тулд (нэг удаа, админ PowerShell):" -ForegroundColor Yellow
  Write-Host "  New-NetFirewallRule -DisplayName 'DigitalCard local mock 54399' -Direction Inbound -Protocol TCP -LocalPort 54399 -Action Allow"
}
Write-Host "`nStack бэлэн:" -ForegroundColor Green
Write-Host '  API        http://127.0.0.1:54321'
Write-Host '  Имэйл (Mailpit) http://127.0.0.1:54324'
Write-Host '  Web:    cd web;    npm run dev            → http://localhost:5173'
Write-Host '  Mobile: cd mobile; npx expo start         → Android emulator (a) эсвэл Expo QR'
Write-Host '  Demo: pro@demo.mn / Demo1234!  (бусад: basic@, org-owner@, employee1@, expired@, admin@demo.mn)'
