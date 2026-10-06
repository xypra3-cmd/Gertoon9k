# Digital Card — локал код ба Claude (cloud)-ын кодыг GitHub-аар нэгтгэнэ.
#   1) Таны өөрчлөлтүүдийг commit хийнэ (.env, node_modules git-д ордоггүй)
#   2) GitHub-аас шинэ кодыг татна (rebase — түүх цэвэрхэн)
#   3) Таны commit-уудыг GitHub руу push хийнэ
#   4) Юу шинэчлэгдсэнийг харуулж, дараагийн алхмыг (npm install / -Reset) хэлнэ
# Ажиллуулах: VS Code → Terminal → Run Task → «Digital Card: Git синк»
#   эсвэл: powershell -ExecutionPolicy Bypass -File scripts\sync.ps1 [-Message "тайлбар"]
param([string]$Message = '')

$ErrorActionPreference = 'Continue'
function Fail($text) { Write-Host "`n✖ $text" -ForegroundColor Red; exit 1 }

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail 'git олдсонгүй. scripts\install-windows-prereqs.ps1-ийг ажиллуулна уу.' }
$root = (git rev-parse --show-toplevel 2>$null)
if (-not $root) { Fail 'Энэ хавтас git repo биш. DigitalCard хавтсанд ажиллуулна уу.' }
Set-Location $root
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -eq 'HEAD') { Fail 'Салбар сонгогдоогүй (detached HEAD). git checkout claude/awesome-ramanujan-6j82t4' }
Write-Host "Салбар: $branch" -ForegroundColor Cyan

# Дуусаагүй rebase/merge үлдсэн бол эхлээд түүнийг шийднэ.
if ((Test-Path "$root/.git/rebase-merge") -or (Test-Path "$root/.git/rebase-apply") -or (Test-Path "$root/.git/MERGE_HEAD")) {
  Fail 'Өмнөх синк дуусаагүй (conflict). Зөрчилтэй файлуудыг засаад: git add . ; git rebase --continue   эсвэл буцаах: git rebase --abort'
}

# 1) Локал өөрчлөлт → commit
git add -A
$pending = git status --porcelain
if ($pending) {
  $msg = if ($Message) { $Message } else { "local: $(Get-Date -Format 'yyyy-MM-dd HH:mm') ($env:COMPUTERNAME)" }
  git commit -q -m $msg
  if ($LASTEXITCODE -ne 0) { Fail 'commit амжилтгүй. git config --global user.name/user.email тохируулсан эсэхийг шалгана уу.' }
  Write-Host "✔ Локал өөрчлөлт commit хийгдлээ: $msg" -ForegroundColor Green
} else {
  Write-Host '• Локал өөрчлөлт алга' -ForegroundColor DarkGray
}

# 2) Татах
$before = (git rev-parse HEAD).Trim()
git fetch -q origin $branch
if ($LASTEXITCODE -ne 0) { Fail 'GitHub-тай холбогдож чадсангүй (интернэт эсвэл GitHub нэвтрэлт).' }
git rebase -q "origin/$branch"
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nЗөрчилтэй файлууд:" -ForegroundColor Yellow
  git diff --name-only --diff-filter=U
  Fail 'Нэг файлыг хоёр талд өөрчилсөн байна. VS Code дээр файлыг нээж «Accept Both/Current/Incoming» сонгоод: git add . ; git rebase --continue ; дахин sync. Эсвэл git rebase --abort'
}

# 3) Илгээх
$ahead = [int](git rev-list --count "origin/$branch..HEAD")
if ($ahead -gt 0) {
  git push -q -u origin $branch
  if ($LASTEXITCODE -ne 0) { Fail 'push амжилтгүй (GitHub эрх). Дахин оролдоно уу.' }
  Write-Host "✔ $ahead commit GitHub руу илгээгдлээ" -ForegroundColor Green
} else {
  Write-Host '• Илгээх шинэ commit алга' -ForegroundColor DarkGray
}

# 4) Юу шинэчлэгдэв
$changed = git diff --name-only $before HEAD
if ($changed) {
  $count = ($changed | Measure-Object).Count
  Write-Host "✔ GitHub-аас $count файл шинэчлэгдлээ" -ForegroundColor Green
  git log --oneline "$before..HEAD" | Select-Object -First 10
  Write-Host ''
  if ($changed -match 'backend/supabase/migrations/') { Write-Host '→ Шинэ migration ирсэн: .\scripts\dev-up-windows.ps1 -Reset' -ForegroundColor Yellow }
  if ($changed -match 'mobile/package(-lock)?\.json') { Write-Host '→ Апп-ын сан өөрчлөгдсөн: cd mobile; npm install; npx expo start -c' -ForegroundColor Yellow }
  if ($changed -match 'web/package(-lock)?\.json') { Write-Host '→ Вэбийн сан өөрчлөгдсөн: cd web; npm install' -ForegroundColor Yellow }
  if ($changed -match 'packages/shared/package(-lock)?\.json') { Write-Host '→ cd packages/shared; npm install' -ForegroundColor Yellow }
  if ($changed -match '^DigitalCard/mobile/') { Write-Host '→ Апп: Expo терминал дээр r (reload) дарна. Хуучин хэвээр бол npx expo start -c' -ForegroundColor Yellow }
} else {
  Write-Host '• GitHub дээр шинэ зүйл алга — аль хэдийн хамгийн сүүлийн хувилбар' -ForegroundColor DarkGray
}
Write-Host "`nОдоогийн хувилбар: $(git log --oneline -1)" -ForegroundColor Cyan
