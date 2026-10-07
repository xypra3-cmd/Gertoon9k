# Хавтасны бүтэц — дэлгэрэнгүй тайлбар

> Git-ийн үндэс: `Gertoon9k/` (repo), төсөл: `Gertoon9k/DigitalCard/`. Доорх бүх зам `DigitalCard/`-ээс эхэлнэ.
> Git-д **ордоггүй** (`.gitignore`): `node_modules/`, `dist/`, `.env*` (`.env.example`-аас бусад), `backend/supabase/.wallet-dev/`, `mobile/dist-android/`, `qa/reports/`, `qa/test-results/`.
> Эхлэх газар: [`../START_HERE.md`](../START_HERE.md).

## 1. Ерөнхий зураг

```
Gertoon9k/
├── .github/workflows/digitalcard.yml   CI: typecheck, lint, unit, pgTAP, API, E2E, STORE-01 (push бүрт)
└── DigitalCard/
    ├── START_HERE.md       ← ЭНДЭЭС ЭХЭЛ: танилцуулга, бүх зам, асаах/тестлэх
    ├── README.md           Техникийн товч (суулгах, ажиллуулах)
    ├── CLAUDE.md           Хөгжүүлэлтийн хатуу дүрэм (AI туслах ба хүн аль алинд)
    ├── .vscode/            VS Code task-ууд (▶ асаах, ■ зогсоох, ✓ тест), санал болгох extension
    ├── scripts/            Асаах / зогсоох / тест / синк скриптүүд (PowerShell + bash)
    ├── backend/            Supabase: өгөгдлийн сан, эрх, Edge Functions, тест
    ├── packages/shared/    Web ба mobile-ийн нийтлэг TypeScript код
    ├── web/                Вэб апп (React + Vite) + PWA + нийтийн карт + төлбөр
    ├── mobile/             Android + iOS апп (Expo, нэг код), widget, Live Activity
    ├── qa/                 Бүх төрлийн тест (API, E2E, mobile, ачаалал, STORE-01)
    └── docs/               Бүх баримт бичиг (бизнес, техник, хууль, store)
```

**Өгөгдөл хэрхэн урсдаг:** `web/` ба `mobile/` → Supabase (Auth, Postgres + RLS, Storage) ба `backend/supabase/functions/` (QPay, AI, Wallet…). Эрх, квот, төлбөрийг **зөвхөн DB** шийднэ; UI нь нуудаг л.

---

## 2. `scripts/` — ажиллуулах скриптүүд

| Файл | Юу хийдэг | Хэзээ |
|---|---|---|
| `start-all.ps1` | **Бүгдийг асаана**: шалгалт → (Git синк) → .env/npm → Wallet сертификат → Supabase + mock + migration → web + Expo → хөтөч. `-Pull -Reset -Test -NoWeb -NoMobile -Android -NoBrowser` | Өдөр бүр |
| `stop-all.ps1` | Web/Expo/mock-ийн процесс (5173, 8081, 54399 порт) + `supabase stop`. Өгөгдөл устахгүй | Ажил дуусахад |
| `test-all.ps1` | Бүх тест, PASS/FAIL хүснэгт. `-Quick` = Docker-гүй хурдан шалгалт | Push хийхээс өмнө |
| `sync.ps1` | Git: commit → pull → push (таны ⇄ GitHub ⇄ Claude) | Код солилцох |
| `setup-windows.ps1` | Анхны бэлтгэл: `.env` файлууд (local mock утга), бүх `npm install` | Нэг удаа (start-all автоматаар) |
| `dev-up-windows.ps1` | Supabase + QPay/Turnstile/Claude mock (+ `-Reset` seed) | start-all дотроос |
| `install-windows-prereqs.ps1` | Node, Git, Docker Desktop, Supabase CLI, VS Code суулгана (winget/scoop) | Шинэ компьютер дээр нэг удаа |
| `dev-up.sh` / `dev-wallet-certs.sh` | Linux/macOS-ийн хувилбар; Wallet-ийн туршилтын сертификат | CI, Linux |

## 3. `backend/` — Supabase

```
backend/
├── package.json              npm test = pgTAP + Edge Functions тест; functions:deps
├── README.md
└── supabase/
    ├── config.toml           Local тохиргоо: auth (passkey/webauthn, 2FA), storage, cron, функцүүд; нууц утга env()-ээр
    ├── .env.example          Хэрэгтэй хувьсагчийн жагсаалт (жинхэнэ .env git-д орохгүй)
    ├── seed.sql              Demo хэрэглэгч, plans (үнэ, лимит), карт, харилцагч — зөвхөн local
    ├── migrations/           Schema-г ЗӨВХӨН энд, шинэ NNNN_*.sql-ээр (хуучныг засахгүй)
    ├── functions/            Deno Edge Functions
    └── tests/                pgTAP (database/), функцийн тест (functions/), mock сервер (mocks/)
```

### 3.1 Migration-ууд

| Файл | Агуулга |
|---|---|
| `0001_init.sql` | Хүснэгтүүд: profiles, plans, subscriptions, organizations, cards, contacts, card_events, payments, audit_log |
| `0002_permissions.sql` | Квот, эрхийн trigger, SECURITY DEFINER функцүүд |
| `0003_rls.sql` | Row Level Security бодлого, нийтийн картын view |
| `0004_storage.sql` | Аватар, лого (Storage bucket, эрх) |
| `0005_service_functions.sql` | Edge Function-ийн дууддаг гүйлгээний логик (зөвхөн service role) + статистикийн RPC |
| `0006_cron.sql` | pg_cron + pg_net: Edge Function-уудыг хуваарийн дагуу дуудах (URL, нууц нь Vault-д) |
| `0007_app_rpc.sql` | Апп-ын унших RPC: эрхийн товч (UI-д), линкийн статистик, админы жагсаалт |
| `0008_org_owner_select.sql` | Байгууллагын эзний харах эрх |
| `0009_growth.sql` | Жилийн төлбөр, урилга (referral), нийтэлсний дараа slug түгжээ, Free картын footer, AI-ийн өдрийн квот |
| `0010_nearby.sql` | Утас ойртуулж солилцох (geohash, 6 оронтой код) |
| `0011_scale.sql` | 1,000–5,000+ хэрэглэгчийн индекс, цэвэрлэгээ (`SCALING.md`) |
| `0012_hardening.sql` | Аюулгүй байдлын audit-ын засвар (хамгийн бага эрх, `SECURITY_AUDIT.md`) |
| `0013_event_mode.sql` | Эвент горим — идэвхтэй үед шинэ харилцагч бүрт эвентийн тэмдэг |
| `0014_ebarimt_and_hardening.sql` | **e-barimt** (НӨАТ-ын баримт), `card_branding` |

### 3.2 Edge Functions (`backend/supabase/functions/`)

| Функц | Үүрэг |
|---|---|
| `qpay-create-invoice` | QPay нэхэмжлэх үүсгэх (дүнг `plans`-аас, хэрэглэгчээс биш) |
| `qpay-callback` | QPay-ийн мэдэгдэл → төлбөр баталгаажуулах → захиалга сунгах → e-barimt |
| `qpay-reconcile` | Хүлээгдэж буй төлбөр, амжилтгүй e-barimt-ыг дахин шалгах (cron) |
| `expire-subscriptions` | Хугацаа дууссан захиалгыг Free руу (cron) |
| `followup-digest` | Өглөөний «өнөөдөр холбогдох» имэйл |
| `contact-exchange` | Зочин мэдээллээ үлдээх (Turnstile, rate limit) |
| `org-invite` | Байгууллагын урилга |
| `track-event` | Картын нээлт, QR, click (IP хадгалахгүй) |
| `ai-assist` | Claude API: био, follow-up захидал (өдрийн квот DB-д) |
| `wallet-pass` | Apple .pkpass, Google Wallet линк |
| `_shared/` | Нийтлэг: `db.ts`, `http.ts` (CORS), `qpay.ts`, `ebarimt.ts`, `mailer.ts`, `ratelimit.ts`, `turnstile.ts`, `visitor.ts`, `zip.ts` |

### 3.3 Тест (`backend/supabase/tests/`)
- `database/01…13_*.test.sql` — pgTAP: квот, хугацаа дуусалт, тусгаарлалт (RLS), байгууллага, CRM, төлбөр, нууцлал, RPC, growth, nearby, hardening, эвент, e-barimt.
- `functions/functions.test.mjs`, `wallet.test.mjs` — Edge Function-уудыг mock-той.
- `mocks/mock-server.mjs` — QPay, Turnstile, Claude, e-barimt-ын хуурамч сервер (порт 54399).

## 4. `packages/shared/` — нийтлэг код

| Файл (`src/`) | Агуулга |
|---|---|
| `database.types.ts` | Supabase-ээс үүсгэсэн DB төрлүүд |
| `types.ts`, `validation.ts` | Домэйн төрөл, zod шалгалт |
| `vcard.ts` | .vcf үүсгэх (кирилл зөв) |
| `templates.ts`, `design.ts`, `icons.ts` | 10 загвар, дизайн токен (web = mobile) |
| `cardText.ts`, `format.ts` | Нэр, утас форматлах, урт нэрийн тохиргоо |
| `plans.ts` | Багцын төрөл (үнэ БИШ — үнэ `plans` хүснэгтэд) |
| `ics.ts`, `geohash.ts`, `errors.ts` | Календарь, nearby, алдааны код |
| `i18n/mn.json`, `en.json` | Нийтлэг орчуулга |

Дэд замаар импортлоно: `@digitalcard/shared/vcard` (нийтийн картын bundle жижиг).

## 5. `web/` — вэб апп

```
web/
├── index.html, vite.config.ts, tsconfig*.json, eslint.config.js
├── netlify.toml                    Хостинг, header (CSP), redirect
├── netlify/edge-functions/card-og.ts   Нийтийн картын OG зураг (Facebook/Messenger preview)
├── public/                         manifest.webmanifest, sw.js (PWA офлайн), icons/, robots.txt, theme-init.js
└── src/
    ├── main.tsx, App.tsx           Router 7 (маршрут), provider-ууд
    ├── index.css                   Tailwind 4 @theme (дизайн токен)
    ├── pages/
    │   ├── Landing.tsx             Нүүр хуудас (маркетинг)
    │   ├── PublicCard.tsx          /c/:slug — нийтийн карт (зочин)
    │   ├── Legal.tsx, NotFound.tsx
    │   ├── auth/                   Login, Register, Forgot, ResetPassword
    │   ├── app/                    Dashboard, CardEditor, CardPrint, Contacts, Stats, Org, Billing (QPay), Settings, Welcome
    │   └── admin/Admin.tsx         Системийн админ
    ├── components/                 AppLayout, PayModal, Passkeys, TwoFactor, WalletButton, EventMode, ExchangeForm, QrCode, Turnstile…
    ├── templates/                  10 картын загвар (Classic, Modern, … Premium)
    ├── lib/                        supabase, auth, queries, payments, ai, print, pwa, growth, publicApi…
    ├── i18n/                       Вэбийн орчуулга (MN/EN)
    └── legal/                      privacy, terms, refund, delete-account (.mn.md / .en.md)
```

## 6. `mobile/` — Android + iOS (нэг код)

```
mobile/
├── app.config.ts                   Апп нэр, bundle id, эрх (permission), privacyManifests, plugin-ууд
├── eas.json                        EAS build профайл (store-д гаргах)
├── AGENTS.md                       Expo API-г node_modules-ээс шалгах дүрэм
├── app/                            Expo Router (дэлгэц = файл)
│   ├── _layout.tsx, welcome.tsx, login.tsx, register.tsx, forgot.tsx, nearby.tsx
│   ├── (tabs)/                     index (миний карт), contacts, scan, stats, settings
│   ├── c/[slug].tsx                Скан хийсэн карт
│   ├── contact/[id].tsx            Харилцагчийн дэлгэрэнгүй
│   └── edit/[id].tsx               Карт засах
├── components/                     CardView, FlipCard, WalletCard, EventMode, GettingStarted, TabBar, ui…
├── lib/                            supabase, auth, passkey, nfc, ocr, wallet, widgets, liveActivity, nearby, reminders, i18n…
│                                   (*.web.ts = вэб хувилбар)
├── locales/                        mn.json, en.json
├── widgets/                        Android widget (react-native-android-widget)
├── targets/widget/                 iOS WidgetKit + Live Activity (SwiftUI)
├── modules/event-activity/         Өөрийн ActivityKit модуль (Live Activity)
└── assets/                         Icon, splash
```

**Хориг:** mobile-д үнэ, «₮», «QPay», «/billing», upsell текст байхгүй (STORE-01).

## 7. `qa/` — тест

| Хавтас / файл | Юу | Команд |
|---|---|---|
| `api/critical.test.ts`, `high.test.ts` | API-ийн Critical/High тест (Vitest) | `npm run test:api` |
| `e2e/*.spec.ts` | Playwright: бүрэн урсгал, загвар (snapshot), vCard/хэвлэх, growth, passkey, PWA, XSS, эрх, wallet | `npm run test:e2e` |
| `mobile/flows/*.yaml` | Maestro: нэвтрэх, QR, скан, CRM, хугацаа дууссан, бүртгэл устгах | `maestro test qa/mobile/flows` |
| `mobile/store-check.mjs` | **STORE-01** — апп-д үнэ/төлбөр байхгүйг шалгана | `npm run test:store` |
| `load/*.js` | k6 ачааллын тест (нийтийн карт, апп хэрэглэгч) | `k6 run qa/load/public-card.js` |
| `TEST_PLAN.md`, `TEST_REPORT.md` | Тестийн төлөвлөгөө, сүүлийн тайлан | — |
| `reports/` (git-гүй) | E2E HTML тайлан: `reports/e2e-html/index.html` | — |

## 8. `docs/` — баримт бичиг

| Ангилал | Файл |
|---|---|
| **Танилцуулга, хэрэглэгч** | `INTRODUCTION.md` (бүтээгдэхүүн), `USER_GUIDE.md` (гарын авлага), `PROJECT_OVERVIEW.md` |
| **Бизнес** | `BUSINESS_PLAN.md` (маркетинг алхам, P&L), `finance/financial_model.xlsx` (Excel загвар), `finance/build_model.py`, `MARKETING_PLAN.md`, `COSTS.md`, `NAMING.md` |
| **Судалгаа** | `COMPARATIVE_STUDY_2026.md` (албан ёсны холбоостой), `MARKET_RESEARCH_2026.md` (SWOT), `RESEARCH.md` (анхны) |
| **Техник** | `LOGIC.md` (бизнес логик), `TECH_STACK.md`, `DECISIONS.md` (шийдвэрийн бүртгэл), `MIGRATIONS.md` (production deploy), `SCALING.md`, `ROADMAP.md`, `MOBILE_BUILD_WINDOWS.md`, `FOLDER_STRUCTURE.md` (энэ) |
| **Аюулгүй байдал, хууль** | `AUDIT_2026-10.md` (системийн audit), `SECURITY_AUDIT.md`, `INCIDENT_RESPONSE.md`; хуулийн текст `web/src/legal/` |
| **Store** | `store/ios.md`, `store/android.md` (тайлбар, privacy label, Data safety) |
| **Зураг** | `screenshots/` (web-*, app-*) |

## 9. Порт ба URL (local)

| Үйлчилгээ | URL |
|---|---|
| Web | http://localhost:5173 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio (DB-г харах) | http://127.0.0.1:54323 |
| Mailpit (ирсэн имэйл) | http://127.0.0.1:54324 |
| Postgres | 127.0.0.1:54322 |
| Mock (QPay/Turnstile/Claude) | http://127.0.0.1:54399 |
| Expo / Metro | http://localhost:8081 |
