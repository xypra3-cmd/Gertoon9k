# Digital Card — Windows дээр шаардлагатай бүх программыг суулгана (winget + scoop).
# Администратороор PowerShell нээгээд:
#   powershell -ExecutionPolicy Bypass -File scripts\install-windows-prereqs.ps1
# Суулгасны дараа компьютераа НЭГ удаа restart хийнэ (WSL2, Docker-т шаардлагатай).
$ErrorActionPreference = 'Continue'

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  Write-Host 'winget олдсонгүй → Microsoft Store-оос "App Installer"-ийг суулгаад дахин ажиллуулна уу.' -ForegroundColor Red
  exit 1
}

$apps = @(
  @{ id = 'Git.Git';                 name = 'Git' },
  @{ id = 'OpenJS.NodeJS.LTS';       name = 'Node.js LTS' },
  @{ id = 'Microsoft.VisualStudioCode'; name = 'VS Code' },
  @{ id = 'Docker.DockerDesktop';    name = 'Docker Desktop' },
  @{ id = 'Google.AndroidStudio';    name = 'Android Studio (emulator)' }
)
foreach ($a in $apps) {
  Write-Host "→ $($a.name)" -ForegroundColor Cyan
  winget install --id $a.id -e --accept-source-agreements --accept-package-agreements --silent
}

# WSL2 (Docker Desktop-д хэрэгтэй)
Write-Host '→ WSL2' -ForegroundColor Cyan
wsl --install --no-distribution

# Supabase CLI — scoop-оор. Scoop нь RemoteSigned execution policy шаарддаг.
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not (Get-Command scoop -ErrorAction SilentlyContinue)) {
  Write-Host '→ scoop' -ForegroundColor Cyan
  Invoke-Expression "& {$(Invoke-RestMethod https://get.scoop.sh)} -RunAsAdmin"
}
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') + ";$env:USERPROFILE\scoop\shims"
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Docker (WSL2) доторх Edge Function нь компьютер дээрх mock сервер (QPay/Turnstile/Claude, :54399) руу
# хандана. Windows Firewall үүнийг "Public" сүлжээ гэж хаадаг тул зөвхөн энэ портыг нээнэ.
New-NetFirewallRule -DisplayName 'DigitalCard local mock 54399' -Direction Inbound -Protocol TCP -LocalPort 54399 -Action Allow -ErrorAction SilentlyContinue | Out-Null

# Expo / EAS CLI (mobile build)
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
npm install -g eas-cli

Write-Host "`nСуулгаж дууслаа. Дараагийн алхам:" -ForegroundColor Green
Write-Host '  1. Компьютераа restart хийнэ.'
Write-Host '  2. Docker Desktop-ийг нээж асаана (анх удаа нөхцөлийг зөвшөөрнө).'
Write-Host '  3. Android Studio → More Actions → Virtual Device Manager → утас үүсгэнэ.'
Write-Host '  4. VS Code → DigitalCard хавтсыг нээгээд Run Task → "Digital Card: 0. бэлтгэл", дараа нь "бүгдийг асаах".'
