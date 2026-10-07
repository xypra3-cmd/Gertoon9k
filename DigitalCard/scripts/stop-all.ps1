# Digital Card — бүгдийг зогсооно: web/Expo/mock-ийн процесс (портоор), Supabase контейнерүүд.
# Өгөгдөл устахгүй (дараагийн start-all.ps1 үргэлжлүүлнэ).
#   powershell -ExecutionPolicy Bypass -File scripts\stop-all.ps1
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot

# 5173 web · 8081 Expo/Metro · 54399 mock
foreach ($port in 5173, 8081, 54399) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop; Write-Host "✓ :$port зогслоо (PID $($c.OwningProcess))" -ForegroundColor Green } catch {}
  }
}
Set-Location (Join-Path $root 'backend')
supabase stop
Write-Host "`nБүгд зогслоо. Дахин асаах: scripts\start-all.ps1" -ForegroundColor Green
