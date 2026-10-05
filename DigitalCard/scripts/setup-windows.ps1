# Digital Card — Windows дээр нэг удаагийн бэлтгэл (PowerShell).
# Шаардлага: Node.js 22 LTS, Docker Desktop (асаалттай), Supabase CLI (scoop install supabase), Git.
# Ажиллуулах:  powershell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Need($cmd, $hint) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { Write-Host "✗ $cmd олдсонгүй → $hint" -ForegroundColor Red; exit 1 }
  Write-Host "✓ $cmd"
}
Need node     'https://nodejs.org (22 LTS)'
Need npm      'Node.js-тэй хамт суудаг'
Need docker   'Docker Desktop суулгаад асаана'
Need supabase 'scoop bucket add supabase https://github.com/supabase/scoop-bucket.git; scoop install supabase'

function RandomSecret { -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ }) }

# backend/supabase/.env — зөвхөн local mock утгууд, санамсаргүй нууц (git-д орохгүй)
$envFile = 'backend\supabase\.env'
if (-not (Test-Path $envFile)) {
  @"
QPAY_BASE_URL=http://host.docker.internal:54399
QPAY_USERNAME=local
QPAY_PASSWORD=local
QPAY_INVOICE_CODE=LOCAL_INVOICE
STATS_SALT_SECRET=$(RandomSecret)
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
TURNSTILE_VERIFY_URL=http://host.docker.internal:54399/turnstile/v0/siteverify
PUBLIC_FUNCTIONS_URL=http://127.0.0.1:54321/functions/v1
CRON_SECRET=$(RandomSecret)
ANTHROPIC_API_KEY=local-mock
ANTHROPIC_BASE_URL=http://host.docker.internal:54399
"@ | Set-Content -Encoding utf8 $envFile
  Write-Host "✓ $envFile үүсгэлээ (QPay/Turnstile/Claude = local mock)"
}
if (-not (Test-Path 'web\.env.local'))    { Copy-Item 'web\.env.example' 'web\.env.local' }
if (-not (Test-Path 'mobile\.env.local')) { Copy-Item 'mobile\.env.example' 'mobile\.env.local' }

foreach ($p in @('packages\shared', 'web', 'mobile', 'qa', 'backend\supabase\functions\ai-assist')) {
  Write-Host "→ npm install ($p)"
  npm install --no-audit --no-fund --prefix $p | Out-Null
}
Write-Host "`nБэлэн. Дараа нь: scripts\dev-up-windows.ps1  (эсвэл VS Code → Terminal → Run Task → 'Digital Card: бүгдийг асаах')" -ForegroundColor Green
