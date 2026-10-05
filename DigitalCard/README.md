# Digital Card

Үнэгүй дижитал нэрийн хуудас + уулзалтын санах ой (contact exchange, CRM, follow-up) + AI туслах (чатботгүй). Web-first, Supabase + QPay (сар/жил); Android, iOS нь нэг Expo source-оос. Web = Android = iOS: нэг дизайн токен, icon, хөдөлгөөн.

```
DigitalCard/
├── backend/          # Prompt 00 — Supabase: migrations, RLS, Edge Functions, seed, pgTAP     ✅
├── packages/shared/  # types, zod, vCard, templates, i18n (MN/EN)                            ✅
├── web/              # Prompt 01 — React + Vite (нийтийн карт, editor, CRM, QPay, админ)      ✅
├── mobile/           # Prompt 02/03 — Expo SDK 57 (Android + iOS), апп дотор төлбөргүй        ✅
├── qa/               # Prompt 04 — API, Playwright, Maestro, k6, STORE-01, тайлан            ✅
├── scripts/dev-up.sh # local stack-ийг нэг командаар асаана
└── docs/             # INTRODUCTION, USER_GUIDE (гарын авлага), MARKETING_PLAN, RESEARCH, PROJECT_OVERVIEW, LOGIC, DECISIONS, store/, screenshots/
```

## Windows + VS Code дээр ажиллуулах
Шаардлагатай программуудыг нэг командаар: администратороор PowerShell → `powershell -ExecutionPolicy Bypass -File scripts\install-windows-prereqs.ps1` → restart.
Шаардлага: Node.js 22 LTS, Docker Desktop (асаалттай), [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (`scoop install supabase`), Git, VS Code. Android-д: Android Studio (emulator).

1. VS Code → **File → Open Folder** → `DigitalCard` (санал болгосон extension-уудыг суулгана).
2. **Terminal → Run Task → `Digital Card: 0. бэлтгэл (нэг удаа)`** — `.env` файлууд (local mock), бүх `npm install`.
3. **Run Task → `Digital Card: бүгдийг асаах`** — Supabase + mock + seed → web (http://localhost:5173) + Expo (`a` дарвал Android emulator).
4. Нэвтрэх: `pro@demo.mn` / `Demo1234!`. Ирсэн имэйлүүд: http://127.0.0.1:54324.

Эсвэл PowerShell-ээр: `scripts\setup-windows.ps1`, дараа нь `scripts\dev-up-windows.ps1 -Reset`, `cd web; npm run dev`, `cd mobile; npx expo start`.
Mobile-ийг бодит утсанд: `mobile\.env.local`-д `10.0.2.2`-ийн оронд компьютерийн LAN IP. Build, store: [`docs/MOBILE_BUILD_WINDOWS.md`](docs/MOBILE_BUILD_WINDOWS.md).

## Хурдан эхлэх (Linux / macOS)
```bash
cp backend/supabase/.env.example backend/supabase/.env   # local утгууд (backend/README.md), ANTHROPIC_* = mock
npm --prefix backend run functions:deps                  # ai-assist-ийн Claude SDK
scripts/dev-up.sh --reset                                # Supabase + QPay/Turnstile mock + seed

cd web && cp .env.example .env.local && npm install && npm run dev       # http://localhost:5173
cd mobile && cp .env.example .env.local && npm install && npx expo start
```
Demo бүртгэл (зөвхөн local): `basic@demo.mn`, `pro@demo.mn`, `org-owner@demo.mn`, `employee1@demo.mn`, `expired@demo.mn`, `admin@demo.mn` — нууц үг `Demo1234!`.

## Тест
```bash
npm --prefix backend test                 # pgTAP (103) + Edge Function (19)
cd qa && npm install
npm run test:api                          # Critical + High API (35)
npm run test:e2e                          # Playwright (12, 20 visual baseline)
npm run test:store                        # STORE-01
npm run load                              # k6
```
CI: `.github/workflows/digitalcard.yml` (PR бүрт). Сүүлийн үр дүн: [qa/TEST_REPORT.md](qa/TEST_REPORT.md).

## Баримтууд
| | |
|---|---|
| [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) | Бизнес, зах зээл, үнэ, төлөвлөгөө, баг |
| [docs/LOGIC.md](docs/LOGIC.md) | Эрхийн матриц, төлөвийн машин, API, алдааны код |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Хэрэглэгчийн гарын авлага (вэб + апп) |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Шийдвэрийн бүртгэл (D-01…D-38) |
| [docs/store/android.md](docs/store/android.md), [ios.md](docs/store/ios.md) | Google Play, App Store бэлтгэл |
| `backend/`, `web/`, `mobile/` README | Ажиллуулах, deploy |

## Нийтлэг дүрэм
TypeScript strict · үнэ/лимит зөвхөн `plans` хүснэгтэд · эрх = RLS + DB функц · төлбөр зөвхөн веб (QPay v2) · mobile-д үнэ/төлбөр байхгүй · IP хадгалахгүй · нууц түлхүүр `.env`/secret-д. Дэлгэрэнгүй: [CLAUDE.md](CLAUDE.md).
