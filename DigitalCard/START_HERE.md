# ▶ ЭНДЭЭС ЭХЭЛ — Digital Card

> **Уулзсан хүн бүрээ марталгүй.** Дижитал нэрийн хуудас + уулзалтын санах ой (CRM, follow-up) + AI туслах. Вэб (PWA), Android, iOS — нэг backend, нэг дизайн.

---

## 1. Танилцуулга (1 минут)

**Асуудал:** цаасан нэрийн хуудас дуусна, хуучирна; авсан хуудас овоорч, хэнтэй уулзсанаа мартана; follow-up хийхгүйгээс борлуулалт алдана.

**Шийдэл:**
- **Карт:** 60 секундэд үүсгэнэ, 10 загвар, QR / линк / NFC / Apple & Google Wallet / widget. Зочин апп суулгахгүй — хөтөч дээр нээгээд нэг товчоор утсандаа хадгална (.vcf, кирилл зөв).
- **Санах ой (CRM):** хоёр талын солилцоо, утас ойртуулж солилцох, нэрийн хуудас скан (төхөөрөмж дээрх OCR), тэмдэглэл, шошго, follow-up сануулга, эвент горим.
- **AI туслах:** био, follow-up захидал (өдрийн квоттой, чатботгүй).
- **Статистик:** хэдэн хүн нээсэн, QR уншсан, хадгалсан (IP хадгалахгүй).
- **Баг (Team):** нэгдсэн брэнд, админ самбар.

**Бизнес загвар:** Free (1 карт, 10 харилцагч) · **Pro 9,900₮/сар эсвэл 79,000₮/жил** · **Team 5,000₮/суудал/сар** (min 5). Төлбөр **зөвхөн вэбээр** QPay + e-barimt; мобайл апп дотор үнэ/төлбөр огт байхгүй (Apple 3.1.3(f)).

**Ялгарал:** Монгол хэл + QPay + e-barimt + CRM/follow-up + эвент горим + passkey + IP хадгалдаггүй. Дэлхийн өрсөлдөгчдөөс (Blinq, HiHello, Popl) 2–3.6 дахин хямд.

**Төлөв (2026-10):** код бэлэн, бүх тест ногоон (pgTAP 170, API, E2E, STORE-01, TAX-01). Production-д гаргахад үлдсэн: QPay production гэрээ, Apple Developer ($99) ба Wallet сертификат, домэйн, store илгээх — `docs/MIGRATIONS.md`, `docs/AUDIT_2026-10.md`.

Дэлгэрэнгүй танилцуулга: [`docs/INTRODUCTION.md`](docs/INTRODUCTION.md) · Гарын авлага: [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md)

---

## 2. Асаах — Windows (PowerShell / VS Code)

### Анх удаа (нэг удаа)
```powershell
# Администратороор PowerShell → Node 22, Git, Docker Desktop, Supabase CLI, VS Code суулгана → компьютерээ restart
powershell -ExecutionPolicy Bypass -File scripts\install-windows-prereqs.ps1
```

### Өдөр бүр — НЭГ КОМАНД
```powershell
cd <таны хавтас>\Gertoon9k\DigitalCard
powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1          # бүгдийг асаана
powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1 -Pull    # GitHub-аас шинэ код татаад асаана
powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1 -Reset   # өгөгдлийн санг demo-гоор шинэчилнэ
powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1 -Test    # асаагаад бүх тест
powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1 -Android # Expo-г Android emulator дээр нээнэ
```
`start-all.ps1` өөрөө: программ шалгана, Docker асаана, анх удаа бол `.env` + `npm install`, Wallet-ийн туршилтын сертификат, Supabase + mock + migration, web + Expo-г тусдаа цонхонд асааж хөтөч нээнэ.

**VS Code-оор:** `Ctrl+Shift+P` → **Tasks: Run Task** →
- `Digital Card: ▶ БҮГДИЙГ АСААХ (start-all)`
- `Digital Card: ▶ GitHub-аас татаад асаах (start-all -Pull)`
- `Digital Card: ■ бүгдийг зогсоох (stop-all)`
- `Digital Card: ✓ бүх тест (test-all)`
- `Digital Card: Git синк (татах + илгээх)`

### Тест, зогсоох
```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1 -Quick   # Docker-гүй хурдан (typecheck, lint, unit, STORE-01)
powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1          # бүгд: + pgTAP, API, E2E (PASS/FAIL хүснэгт)
powershell -ExecutionPolicy Bypass -File scripts\stop-all.ps1          # зогсооно (өгөгдөл устахгүй)
powershell -ExecutionPolicy Bypass -File scripts\sync.ps1              # Git: commit → pull → push
```

### Linux / macOS
```bash
scripts/dev-up.sh --reset        # Supabase + mock + seed
cd web && npm run dev            # 2-р терминал
cd mobile && npx expo start      # 3-р терминал
```
Дэлгэрэнгүй: [`README.md`](README.md).

### Нэвтрэх (зөвхөн local demo)

| Хэрэглэгч | Имэйл | Юу үзэх |
|---|---|---|
| Pro | `pro@demo.mn` | Бүх боломж, CRM, AI, статистик |
| Free | `basic@demo.mn` | Лимит, Free картын footer |
| Байгууллагын эзэн | `org-owner@demo.mn` | Team самбар, урилга |
| Ажилтан | `employee1@demo.mn` | Байгууллагын карт |
| Хугацаа дууссан | `expired@demo.mn` | Засах эрхгүй байдал |
| Админ | `admin@demo.mn` | Админ хуудас (2FA) |

Нууц үг бүгд `Demo1234!` (зөвхөн local seed — production-д байхгүй).

| Хаана | URL |
|---|---|
| Web | http://localhost:5173 |
| Ирсэн имэйл (Mailpit) | http://127.0.0.1:54324 |
| Өгөгдлийн сан (Supabase Studio) | http://127.0.0.1:54323 |
| Expo | http://localhost:8081 (утсан дээр Expo Go → QR) |

Бодит утсанд: `mobile\.env.local`-д `10.0.2.2`-ийн оронд компьютерийн LAN IP. Build ба store: [`docs/MOBILE_BUILD_WINDOWS.md`](docs/MOBILE_BUILD_WINDOWS.md).

---

## 3. Бүх чухал зам

### Ажиллуулах
| Зам | Юу |
|---|---|
| `scripts/start-all.ps1` | ▶ Бүгдийг асаах |
| `scripts/stop-all.ps1` | ■ Зогсоох |
| `scripts/test-all.ps1` | ✓ Бүх тест |
| `scripts/sync.ps1` | Git синк |
| `scripts/setup-windows.ps1`, `scripts/install-windows-prereqs.ps1` | Анхны бэлтгэл |
| `.vscode/tasks.json` | VS Code task-ууд |
| `.github/workflows/digitalcard.yml` (repo-ийн үндэст) | CI |

### Код
| Зам | Юу |
|---|---|
| `backend/supabase/migrations/` | Өгөгдлийн сангийн schema, эрх (0001–0014) |
| `backend/supabase/functions/` | Edge Functions (QPay, e-barimt, AI, Wallet, имэйл…) |
| `backend/supabase/tests/database/` | pgTAP тест |
| `backend/supabase/seed.sql` | **Үнэ, лимит (`plans`)**, demo өгөгдөл |
| `backend/supabase/config.toml` | Auth (passkey, 2FA), cron, функцийн тохиргоо |
| `packages/shared/src/` | Нийтлэг: vCard, загвар, дизайн токен, validation, i18n |
| `web/src/pages/` | Вэбийн хуудсууд (Landing, PublicCard, app/, auth/, admin/) |
| `web/src/templates/` | 10 картын загвар |
| `web/src/legal/` | Нууцлал, үйлчилгээний нөхцөл, буцаалт, бүртгэл устгах (MN/EN) |
| `web/public/sw.js`, `manifest.webmanifest` | PWA |
| `mobile/app/` | Мобайл дэлгэцүүд (Expo Router) |
| `mobile/lib/` | passkey, NFC, OCR, Wallet, widget, Live Activity |
| `mobile/targets/widget/`, `mobile/widgets/` | iOS / Android widget |
| `mobile/app.config.ts` | Апп тохиргоо, эрх, privacy manifest |
| `qa/api/`, `qa/e2e/`, `qa/mobile/`, `qa/load/` | Тестүүд |

### Нууц тохиргоо (git-д ОРОХГҮЙ)
| Зам | Юу |
|---|---|
| `backend/supabase/.env` | Local нууц/тохиргоо (`.env.example`-аас) |
| `web/.env.local`, `mobile/.env.local` | Апп-ын local тохиргоо |
| `backend/supabase/.wallet-dev/` | Wallet-ийн туршилтын сертификат |
| Production | QPay, e-barimt, Anthropic түлхүүр → **зөвхөн Supabase Edge Function secret** |

### Баримт бичиг (`docs/`)
| Файл | Юуны тухай |
|---|---|
| [`docs/FOLDER_STRUCTURE.md`](docs/FOLDER_STRUCTURE.md) | **Хавтас бүрийн дэлгэрэнгүй тайлбар** |
| [`docs/MONITORING.md`](docs/MONITORING.md) | Алдааны мэдээ (Sentry, EU) ба uptime (`health`) — тохируулах заавар |
| [`docs/INTRODUCTION.md`](docs/INTRODUCTION.md) | Бүтээгдэхүүний танилцуулга |
| [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) | Хэрэглэгчийн гарын авлага |
| [`docs/BUSINESS_PLAN.md`](docs/BUSINESS_PLAN.md) | **Маркетинг алхам алхмаар + орлого/зардал/ашиг (12 сарын P&L, 3 сценари)** |
| [`docs/finance/financial_model.xlsx`](docs/finance/financial_model.xlsx) | **Excel санхүүгийн загвар** (шар нүдийг өөрчил) |
| [`docs/COMPARATIVE_STUDY_2026.md`](docs/COMPARATIVE_STUDY_2026.md) | **Харьцуулсан судалгаа — албан ёсны холбоостой** |
| [`docs/MARKET_RESEARCH_2026.md`](docs/MARKET_RESEARCH_2026.md) | Зах зээлийн судалгаа, SWOT |
| [`docs/MARKETING_PLAN.md`](docs/MARKETING_PLAN.md) | Маркетингийн стратеги, KPI, суваг |
| [`docs/COSTS.md`](docs/COSTS.md) | Домэйн, сервер, store-ийн зардал |
| [`docs/AUDIT_2026-10.md`](docs/AUDIT_2026-10.md) | Системийн audit (аюулгүй байдал, хууль, store) |
| [`docs/LOGIC.md`](docs/LOGIC.md), [`docs/DECISIONS.md`](docs/DECISIONS.md) | Бизнес логик, шийдвэрийн бүртгэл |
| [`docs/TECH_STACK.md`](docs/TECH_STACK.md), [`docs/ROADMAP.md`](docs/ROADMAP.md) | Технологи, цаашдын төлөвлөгөө |
| [`docs/MIGRATIONS.md`](docs/MIGRATIONS.md), [`docs/SCALING.md`](docs/SCALING.md) | Production deploy, өсөлт |
| [`docs/store/ios.md`](docs/store/ios.md), [`docs/store/android.md`](docs/store/android.md) | App Store / Google Play |
| [`docs/INCIDENT_RESPONSE.md`](docs/INCIDENT_RESPONSE.md), [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md) | Аюулгүй байдал |
| [`qa/TEST_PLAN.md`](qa/TEST_PLAN.md), [`qa/TEST_REPORT.md`](qa/TEST_REPORT.md) | Тестийн төлөвлөгөө, тайлан |
| [`CLAUDE.md`](CLAUDE.md) | Хөгжүүлэлтийн хатуу дүрэм |

---

## 4. Хатуу дүрэм (товч)

1. Нууц түлхүүр, нууц үгийг хэзээ ч код, лог, commit-д бичихгүй (`.env`, Edge Function secret).
2. Эрх, квот, төлбөрийг зөвхөн DB (RLS, trigger, SECURITY DEFINER). Үнэ зөвхөн `plans` хүснэгтэд.
3. Schema-г зөвхөн шинэ `migrations/NNNN_*.sql` + pgTAP тестээр; шийдвэрийг `docs/DECISIONS.md`-д.
4. Мобайл апп-д үнэ, «₮», «QPay», төлбөрийн линк байхгүй (STORE-01).
5. IP хаяг хадгалахгүй. Төлбөр бүр e-barimt-тэй (TAX-01).
