# Digital Card — БҮГДИЙГ НЭГ КОМАНДААР АСААНА (Windows PowerShell 5.1 / PowerShell 7).
#
#   powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1            # энгийн асаалт
#   powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1 -Pull      # эхлээд GitHub-аас шинэ код татна
#   powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1 -Reset     # өгөгдлийн санг demo өгөгдлөөр шинэчилнэ
#   powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1 -Test      # асаагаад бүх тестийг ажиллуулна
#   нэмэлт: -NoWeb, -NoMobile, -Android (Expo-г Android emulator дээр шууд нээнэ), -NoBrowser
#
# Юу хийдэг вэ:
#   1. Шаардлагатай программ (Node 22+, npm, Git, Docker, Supabase CLI) байгаа, Docker асаалттай эсэхийг шалгана
#   2. (-Pull) Git синк: таны өөрчлөлтийг хадгалаад GitHub-аас татна
#   3. Анх удаа бол .env файлууд, бүх npm сан (scripts\setup-windows.ps1)
#      Дараа нь: package-lock.json өөрчлөгдсөн төслийн санг л дахин суулгана
#   4. Wallet-ийн туршилтын сертификат (openssl байвал; Git for Windows-д багтдаг)
#   5. Supabase + QPay/Turnstile/Claude mock + шинэ migration (scripts\dev-up-windows.ps1)
#   6. Web (http://localhost:5173), Expo (mobile)-г тусдаа цонхонд асааж, хөтөч нээнэ
#   7. (-Test) scripts\test-all.ps1
param(
  [switch]$Pull,
  [switch]$Reset,
  [switch]$Test,
  [switch]$NoWeb,
  [switch]$NoMobile,
  [switch]$Android,
  [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Step($n, $text) { Write-Host "`n[$n] $text" -ForegroundColor Cyan }
function Ok($text) { Write-Host "  ✓ $text" -ForegroundColor Green }
function Warn($text) { Write-Host "  ! $text" -ForegroundColor Yellow }
function Fail($text) { Write-Host "`n✗ $text" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- 1. Шаардлага
Step 1 'Шаардлагатай программууд'
$need = @(
  @{ cmd = 'node';     hint = 'scripts\install-windows-prereqs.ps1 (эсвэл https://nodejs.org 22 LTS)' },
  @{ cmd = 'npm';      hint = 'Node.js-тэй хамт суудаг' },
  @{ cmd = 'git';      hint = 'https://git-scm.com' },
  @{ cmd = 'docker';   hint = 'Docker Desktop' },
  @{ cmd = 'supabase'; hint = 'scoop install supabase' }
)
foreach ($n in $need) {
  if (-not (Get-Command $n.cmd -ErrorAction SilentlyContinue)) { Fail "$($n.cmd) олдсонгүй → $($n.hint)" }
}
$nodeMajor = [int]((node -v).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 22) { Fail "Node.js $((node -v)) — 22 эсвэл түүнээс дээш хэрэгтэй (winget upgrade OpenJS.NodeJS.LTS)" }
Ok "Node $(node -v), npm $(npm -v), $(git --version)"

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Warn 'Docker асаагүй байна — Docker Desktop-ийг асааж байна...'
  $dd = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
  if (Test-Path $dd) { Start-Process $dd }
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 3
    docker info *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  }
  if (-not $ready) { Fail 'Docker 3 минутад асахгүй байна. Docker Desktop-ийг гараар нээгээд дахин ажиллуулна уу.' }
}
Ok 'Docker асаалттай'

# ---------------------------------------------------------------- 2. Git
Step 2 'Git'
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($Pull) {
  & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'sync.ps1')
  if ($LASTEXITCODE -ne 0) { Fail 'Git синк амжилтгүй (дээрх зааврыг дагана уу).' }
} else {
  $dirty = (git status --porcelain | Measure-Object).Count
  git fetch -q origin $branch 2>$null
  $behind = 0
  if ($LASTEXITCODE -eq 0) { $behind = [int](git rev-list --count "HEAD..origin/$branch") }
  Ok "Салбар $branch, өөрчлөгдсөн файл: $dirty, GitHub дээр шинэ commit: $behind"
  if ($behind -gt 0) { Warn "GitHub дээр $behind шинэ commit байна → дараа нь: scripts\start-all.ps1 -Pull" }
}

# ---------------------------------------------------------------- 3. Сангууд
Step 3 'Сангууд ба .env файлууд'
$firstRun = -not (Test-Path 'backend\supabase\.env') -or -not (Test-Path 'web\node_modules') -or -not (Test-Path 'mobile\node_modules')
if ($firstRun) {
  Warn 'Анхны бэлтгэл (хэдэн минут болно)...'
  & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'setup-windows.ps1')
  if ($LASTEXITCODE -ne 0) { Fail 'setup-windows.ps1 амжилтгүй' }
} else {
  # package-lock.json нь суусан сангаас шинэ бол л дахин суулгана
  $projects = @('packages\shared', 'web', 'mobile', 'qa', 'backend\supabase\functions\ai-assist', 'backend\supabase\functions\wallet-pass')
  foreach ($p in $projects) {
    $lock = Join-Path $p 'package-lock.json'
    $marker = Join-Path $p 'node_modules\.package-lock.json'
    if (-not (Test-Path $lock)) { continue }
    $stale = -not (Test-Path $marker)
    if (-not $stale) { $stale = (Get-Item $lock).LastWriteTimeUtc -gt (Get-Item $marker).LastWriteTimeUtc }
    if ($stale) {
      Write-Host "  → npm install ($p)"
      npm install --no-audit --no-fund --prefix $p | Out-Null
      if ($LASTEXITCODE -ne 0) { Fail "npm install амжилтгүй: $p" }
    }
  }
  Ok 'Бүх сан шинэ'
}

# ---------------------------------------------------------------- 4. Wallet туршилтын сертификат
Step 4 'Wallet-ийн туршилтын сертификат (local)'
$openssl = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $openssl) {
  foreach ($c in @("$env:ProgramFiles\Git\usr\bin\openssl.exe", "${env:ProgramFiles(x86)}\Git\usr\bin\openssl.exe")) {
    if (Test-Path $c) { $openssl = Get-Item $c; break }
  }
}
$envFile = Join-Path $root 'backend\supabase\.env'
$devDir = Join-Path $root 'backend\supabase\.wallet-dev'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
# .env-д түлхүүр байхгүй бол нэмнэ, ХООСОН бол бөглөнө — жинхэнэ утгыг хэзээ ч дарж бичихгүй
function EnsureEnv($values) {
  $lines = [System.Collections.Generic.List[string]]([System.IO.File]::ReadAllLines($envFile))
  foreach ($k in $values.Keys) {
    $idx = -1
    for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match "^$k=") { $idx = $i; break } }
    if ($idx -lt 0) { $lines.Add("$k=$($values[$k])") }
    elseif ($lines[$idx] -eq "$k=") { $lines[$idx] = "$k=$($values[$k])" }
  }
  [System.IO.File]::WriteAllLines($envFile, $lines.ToArray(), $utf8NoBom)
}
$walletKeys = @('APPLE_PASS_TYPE_ID', 'APPLE_TEAM_ID', 'APPLE_PASS_CERT_B64', 'APPLE_PASS_KEY_B64', 'APPLE_PASS_KEY_PASSWORD',
  'APPLE_WWDR_CERT_B64', 'GOOGLE_WALLET_ISSUER_ID', 'GOOGLE_WALLET_SA_EMAIL', 'GOOGLE_WALLET_SA_KEY_B64')
if (-not $openssl) {
  # config.toml эдгээрийг env()-ээр уншдаг тул түлхүүр нь (хоосон ч) заавал байх ёстой
  $empty = [ordered]@{ PUBLIC_WEB_URL = 'http://localhost:5173' }
  foreach ($k in $walletKeys) { $empty[$k] = '' }
  EnsureEnv $empty
  Warn 'openssl олдсонгүй → Wallet локалд «тохируулагдаагүй» гэж хариулна (бусад нь бүрэн ажиллана)'
} else {
  $ossl = if ($openssl.Source) { $openssl.Source } else { $openssl.FullName }
  New-Item -ItemType Directory -Force -Path $devDir | Out-Null
  if (-not (Test-Path (Join-Path $devDir 'pass.pem'))) {
    Push-Location $devDir
    & $ossl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj '/CN=Dev WWDR (not Apple)' -keyout ca.key -out ca.pem 2>$null
    & $ossl req -newkey rsa:2048 -nodes -subj '/CN=Pass Type ID: pass.mn.digitalcard.dev/OU=DEVTEAM01' -keyout pass.key -out pass.csr 2>$null
    & $ossl x509 -req -in pass.csr -CA ca.pem -CAkey ca.key -CAcreateserial -days 3650 -out pass.pem 2>$null
    & $ossl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out google.key 2>$null
    & $ossl pkey -in google.key -pubout -out google.pub 2>$null
    Pop-Location
  }
  function B64($f) { [Convert]::ToBase64String([System.IO.File]::ReadAllBytes((Join-Path $devDir $f))) }
  EnsureEnv ([ordered]@{
    PUBLIC_WEB_URL = 'http://localhost:5173'; APPLE_PASS_TYPE_ID = 'pass.mn.digitalcard.dev'; APPLE_TEAM_ID = 'DEVTEAM01'
    APPLE_PASS_CERT_B64 = (B64 'pass.pem'); APPLE_PASS_KEY_B64 = (B64 'pass.key'); APPLE_PASS_KEY_PASSWORD = ''
    APPLE_WWDR_CERT_B64 = (B64 'ca.pem'); GOOGLE_WALLET_ISSUER_ID = '3388000000000000000'
    GOOGLE_WALLET_SA_EMAIL = 'wallet-dev@digitalcard-dev.iam.gserviceaccount.com'; GOOGLE_WALLET_SA_KEY_B64 = (B64 'google.key')
  })
  Ok 'Wallet туршилтын сертификат бэлэн (жинхэнэ iPhone хүлээж авахгүй — зөвхөн туршилт)'
}

# Алдааны мэдээг local mock руу (production-д SENTRY_DSN нь Edge Function secret)
EnsureEnv ([ordered]@{ SENTRY_DSN = 'http://mocksentrykey@host.docker.internal:54399/1'; SENTRY_ENVIRONMENT = 'local' })

# ---------------------------------------------------------------- 5. Backend
Step 5 'Backend: Supabase + mock + migration'
$devUp = Join-Path $PSScriptRoot 'dev-up-windows.ps1'
if ($Reset) { & powershell -ExecutionPolicy Bypass -File $devUp -Reset } else { & powershell -ExecutionPolicy Bypass -File $devUp }
if ($LASTEXITCODE -ne 0) { Fail 'Backend асаагүй (дээрх алдааг үзнэ үү)' }
Set-Location $root
# Шинэ migration ирсэн бол (жишээ нь git pull-ийн дараа) өгөгдлийн санд хэрэглэнэ
Push-Location backend
supabase migration up --local *> $null
Pop-Location
Ok 'Supabase http://127.0.0.1:54321, имэйл http://127.0.0.1:54324'

# ---------------------------------------------------------------- 6. Web, mobile
function PortOpen($port) {
  try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1', $port); $c.Close(); return $true } catch { return $false }
}
$shell = if (Get-Command pwsh -ErrorAction SilentlyContinue) { 'pwsh' } else { 'powershell' }
if (-not $NoWeb) {
  Step 6 'Web'
  if (PortOpen 5173) { Ok 'Web аль хэдийн ажиллаж байна: http://localhost:5173' }
  else {
    Start-Process $shell -ArgumentList '-NoExit', '-Command', "`$Host.UI.RawUI.WindowTitle='Digital Card — WEB'; Set-Location '$root\web'; npm run dev"
    for ($i = 0; $i -lt 40 -and -not (PortOpen 5173); $i++) { Start-Sleep -Seconds 1 }
    if (PortOpen 5173) { Ok 'Web: http://localhost:5173 (тусдаа цонхонд)' } else { Warn 'Web цонхонд алдаа гарсан эсэхийг шалгана уу' }
  }
}
if (-not $NoMobile) {
  Step 7 'Mobile (Expo)'
  $expoCmd = if ($Android) { 'npx expo start --android' } else { 'npx expo start' }
  Start-Process $shell -ArgumentList '-NoExit', '-Command', "`$Host.UI.RawUI.WindowTitle='Digital Card — MOBILE'; Set-Location '$root\mobile'; $expoCmd"
  Ok "Expo тусдаа цонхонд: 'a' = Android emulator, QR = утасны Expo Go. Passkey/Wallet/NFC/widget-д: npx expo run:android"
}
if (-not $NoBrowser -and -not $NoWeb) { Start-Process 'http://localhost:5173/login'; Start-Process 'http://127.0.0.1:54324' }

# ---------------------------------------------------------------- Хураангуй
Write-Host "`n================ БЭЛЭН ================" -ForegroundColor Green
Write-Host '  Web            http://localhost:5173        (нэвтрэх: pro@demo.mn / Demo1234!)'
Write-Host '  Нийтийн карт   http://localhost:5173/c/saraa-g'
Write-Host '  Имэйл (Mailpit) http://127.0.0.1:54324'
Write-Host '  API            http://127.0.0.1:54321'
Write-Host '  Бусад demo:    basic@ · org-owner@ · employee1@ · expired@ · admin@demo.mn (нууц үг ижил)'
Write-Host '  Зогсоох:       scripts\stop-all.ps1    Тест: scripts\test-all.ps1    Танилцуулга: START_HERE.md'

if ($Test) { & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'test-all.ps1') }
