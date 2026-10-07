# Digital Card — БҮХ ТЕСТ (CI-тэй ижил) ба эцэст нь PASS/FAIL хүснэгт.
#   powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1            # бүгд
#   powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1 -Quick     # зөвхөн typecheck/lint/unit/STORE-01 (Docker-гүй)
# Анхаар: backend тест өгөгдлийн санг demo өгөгдлөөр шинэчилнэ (db reset).
param([switch]$Quick)
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$results = New-Object System.Collections.Generic.List[object]

function Run($name, $dir, $command) {
  Write-Host "`n▶ $name" -ForegroundColor Cyan
  Push-Location (Join-Path $root $dir)
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  cmd /c $command
  $code = $LASTEXITCODE
  $sw.Stop()
  Pop-Location
  $results.Add([pscustomobject]@{ Тест = $name; Үр_дүн = $(if ($code -eq 0) { 'PASS' } else { 'FAIL' }); Хугацаа = ('{0:N0} с' -f $sw.Elapsed.TotalSeconds) })
}

Run 'shared: typecheck (TS 7) + unit' 'packages\shared' 'npm run typecheck && npx vitest run'
Run 'web: typecheck + lint + unit'     'web'             'npm run typecheck && npm run lint && npm test'
Run 'mobile: typecheck + lint'         'mobile'          'npm run typecheck && npm run lint'
Run 'STORE-01 (апп-д үнэ/төлбөр алга)' 'qa'              'npm run test:store'
if (-not $Quick) {
  docker info *> $null
  if ($LASTEXITCODE -ne 0) { Write-Host '✗ Docker асаагүй — эхлээд scripts\start-all.ps1' -ForegroundColor Red; exit 1 }
  Run 'backend: pgTAP + Edge Functions'  'backend' 'npm test'
  Run 'API (Critical + High)'            'qa'      'npm run test:api'
  Run 'E2E (Playwright)'                 'qa'      'npm run test:e2e'
}

Write-Host "`n================ ҮР ДҮН ================" -ForegroundColor Cyan
$results | Format-Table -AutoSize
$failed = @($results | Where-Object { $_.Үр_дүн -eq 'FAIL' }).Count
if ($failed -gt 0) {
  Write-Host "$failed тест амжилтгүй. E2E-ийн дэлгэрэнгүй: reports\e2e-html\index.html" -ForegroundColor Red
  exit 1
}
Write-Host 'Бүх тест PASS' -ForegroundColor Green
