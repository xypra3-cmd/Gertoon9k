# Digital Card

Үнэгүй дижитал нэрийн хуудас + уулзалтын санах ой (contact exchange, CRM, follow-up). Web-first, Supabase + QPay; Android, iOS нь нэг Expo source-оос.

```
DigitalCard/
├── backend/          # Prompt 00 — Supabase: migrations, RLS, Edge Functions, seed, pgTAP     ✅
├── packages/shared/  # types, zod, vCard, templates, i18n (MN/EN)                            ✅
├── web/              # Prompt 01 — React + Vite (нийтийн карт, editor, CRM, QPay, админ)      ✅
├── mobile/           # Prompt 02/03 — Expo SDK 57 (Android + iOS), апп дотор төлбөргүй        ✅
├── qa/               # Prompt 04 — API, Playwright, Maestro, k6, STORE-01, тайлан            ✅
├── scripts/dev-up.sh # local stack-ийг нэг командаар асаана
└── docs/             # PROJECT_OVERVIEW, LOGIC, USER_GUIDE, DECISIONS, store/
```

## Хурдан эхлэх
```bash
cp backend/supabase/.env.example backend/supabase/.env   # local утгууд (backend/README.md)
scripts/dev-up.sh --reset                                # Supabase + QPay/Turnstile mock + seed

cd web && cp .env.example .env.local && npm install && npm run dev       # http://localhost:5173
cd mobile && cp .env.example .env.local && npm install && npx expo start
```
Demo бүртгэл (зөвхөн local): `basic@demo.mn`, `pro@demo.mn`, `org-owner@demo.mn`, `employee1@demo.mn`, `expired@demo.mn`, `admin@demo.mn` — нууц үг `Demo1234!`.

## Тест
```bash
npm --prefix backend test                 # pgTAP (82) + Edge Function (15)
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
