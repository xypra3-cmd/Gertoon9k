# Digital Card — Тестийн тайлан (local)

| | |
|---|---|
| Хувилбар (git) | салбар `claude/awesome-ramanujan-6j82t4`, энэ тайлантай commit |
| Огноо | 2026-10-07 |
| Орчин | ☑ Local (Linux container) ☐ Staging ☐ Production |
| Supabase | CLI 2.120 local stack (Postgres 17, Auth + passkey, Storage, Edge Runtime) |
| Web build | Vite production build, `vite preview` :5173 |
| Mobile | Expo SDK 57 — `expo export` (Android, iOS, web bundle), `expo prebuild` Android + iOS (widget target, App Group, NFC, Live Activity шалгасан). EAS build хийгээгүй |
| QPay / Turnstile | ☑ Mock (`backend/supabase/tests/mocks`) |
| Browser | Chromium (Playwright), desktop + Pixel 7 эмуляц |

## 1. Үр дүн

| ID | Түвшин | Тест | Үр дүн | Нотолгоо |
|---|---|---|---|---|
| SEC-01 | Critical | A ↛ B (12 хүснэгт/view, UPDATE/DELETE/INSERT, service RPC) | **PASS** | api/critical (16 тест), pgTAP 03 |
| SEC-02 | Critical | Free 2 дахь, Pro 6 дахь карт, Team илүү суудал (REST + org-invite) | **PASS** | api/critical, pgTAP 01 |
| SEC-03 | Critical | Хугацаа дууссан UPDATE → 0 мөр, шинэ карт татгалзана | **PASS** | api/critical, pgTAP 02 |
| PAY-01 | Critical | Хуурамч callback | **PASS** | api/critical, functions |
| PAY-02 | Critical | Давхар (×3) callback → 1 удаа | **PASS** | api/critical, pgTAP 06 |
| PAY-03 | Critical | Reconcile | **PASS** | api/critical, functions |
| PAY-04 | Critical | Дутуу дүн → failed + audit | **PASS** | api/critical, pgTAP 06 |
| ORG-01 | Critical | Ажилтан ↛ бусдын статистик / template / org тохиргоо | **PASS** | api/critical, pgTAP 04, E2E |
| PUB-01 | Critical | Багц дууссан ч public_cards + track-event | **PASS** | api/critical, E2E |
| PRIV-01 | Critical | IP card_events-д болон edge log-д байхгүй | **PASS** | api/critical, pgTAP 07, functions |
| PRIV-02 | Critical | Зөвшөөрөөгүй viewer нэргүй | **PASS** | api/critical, pgTAP 07 |
| EXC-01 | Critical | consent / Turnstile-гүй | **PASS** | api/critical, functions |
| EXC-02 | Critical | 6 дахь exchange / цаг | **PASS** | api/critical, pgTAP 05 |
| ENT-01 | Critical | Free REST note/follow_up_at → татгалзана, Pro бичнэ | **PASS** | api/critical, pgTAP 05, E2E |
| FUN-01 | High | Бүтэн урсгал | **PASS** | e2e/fun-01 |
| FUN-02 | High | 10 × 2 загвар, 40 тэмдэгт нэр, visual regression | **PASS** | e2e/fun-02 (20 baseline) |
| FUN-03 | High | Бүх ≥ 30 ≥ 7 ≥ Өнөөдөр, Нийт = view + qr_open | **PASS** | api/high, E2E, web unit |
| FUN-04 | High | .vcf кирилл (файлын түвшинд) | **PASS** | e2e/fun-04, shared unit |
| FUN-05 | High | PDF 96×61 мм ×2 хуудас, PNG 1134×720, QR ≥ 18 мм | **PASS** | e2e/fun-05 |
| SEC-04 | High | XSS escape, javascript:/http: линк татгалзана | **PASS** | e2e/sec-04, shared unit |
| SEC-05 | High | 5 MB / .svg / .exe / бусдын хавтас | **PASS** | api/high |
| SEC-06 | High | 100 хүсэлт → 30 тоологдоно | **PASS** | api/high |
| STORE-01 | High | Mobile bundle-д ₮ / QPay / /billing | **PASS** | qa/mobile/store-check (35 bundled first-party модуль) |
| GROW-01 | High | Жилийн төлбөр: дүн `plans.price_annual_mnt`, 1 жил сунгана; UI сар/жил сэлгүүр | **PASS** | pgTAP 09, functions, e2e/growth |
| GROW-02 | High | Урилга: анхны төлбөрт урьсан хүнд +1 сар Pro, нэг л удаа; клиент хуурамчаар бичихгүй; өөрийгөө урихгүй | **PASS** | pgTAP 09 |
| GROW-03 | High | Нийтэлсэн картын slug түгжигдэнэ (буулгасан ч) | **PASS** | pgTAP 09, e2e/growth |
| GROW-04 | Medium | Free картын «Digital Card-аар бүтээв» footer, Pro-д байхгүй; anon уншина | **PASS** | pgTAP 09, e2e/growth |
| AI-01 | High | ai-assist: нэвтрэлт, даалгаврын шалгалт, structured output + fallbacks, refusal → кредит буцаана, Free 3/өдөр, CRM даалгавар Free-д 403 | **PASS** | functions (Claude API mock) |
| AI-02 | Medium | Editor-ийн AI био талбарыг бөглөнө, хадгалахгүй | **PASS** | e2e/growth |
| ONB-01 | High | Бүртгэл → 3 алхамт wizard → нийтлэгдсэн карт, эхлэх жагсаалт 2/6 | **PASS** | e2e/fun-01 |
| NEAR-01 | High | Ойртуулж солилцох: 3 с цонх, ≈5 км бүс, нэг удаа match, хоёр тал өөрийн контактыг хадгална (давхардалгүй), бусдын pulse уншихгүй, хүснэгт клиентэд хаалттай | **PASS** | pgTAP 10 |
| NEAR-02 | High | 6 оронтой код: өөрийн код, буруу код, нэг удаа, 10 оролдлого/10 мин, харилцагчийн хязгаар хэвээр, anon татгалзана | **PASS** | pgTAP 10 |
| NEAR-03 | Medium | 2 утас (2 browser context) bump ба кодоор бодитоор солилцоно | **PASS** | mobile web build + Playwright (docs/screenshots app-13…15) |
| FLIP-01 | Medium | Нийтийн карт QR тал руу эргэнэ, нуугдсан тал `inert` | **PASS** | e2e/public-card.mobile |
| SEC-07 | High | Аудитын засвар HTTP-ээр: storage жагсаалт хаалттай, бусдын багц/квот асуух боломжгүй, anon хүснэгт уншихгүй, сул нууц үг Auth татгалзана | **PASS** | api/high SEC-07, pgTAP 11 |
| SEC-08 | High | UA сольж зочны rate limit-ийг тойрох боломжгүй (сүлжээний HMAC түлхүүр) | **PASS** | functions A-05 |
| EVT-01 | High | Эвент горим: Pro эхлүүлнэ, гараар/мэдээлэл үлдээсэн харилцагч эвентээр тэмдэглэгдэнэ, багана клиентэд хаалттай, Free-д эхлүүлэхгүй, тэмдэглэгдэхгүй | **PASS** | pgTAP 12, e2e/growth |
| QR-01 | Medium | Офлайн vCard QR: гол талбар үлдэж, хүнд талбар хасагдана, < 500 байт | **PASS** | shared unit |
| TAX-01 | Critical | e-barimt төлбөр бүрт; алдаа гарвал reconcile дахин олгоно; Billing-д QR | **PASS** | functions TAX-01, pgTAP 13, e2e/fun-01 |
| SEC-09 | High | Нэвтрээгүй хэрэглэгч бусдын багцыг шалгах боломжгүй (`card_branding`) | **PASS** | pgTAP 11, 13 |
| SEC-PK | High | Passkey нэмэх → passkey-ээр нэвтрэх → устгах | **PASS** | e2e/passkey |
| WALLET-01 | High | Apple .pkpass гарын үсэг, manifest | **PASS** | functions wallet |
| WALLET-02 | High | Google Wallet JWT RS256 | **PASS** | functions wallet |
| WALLET-UI | Medium | Хянах самбараас Wallet-д нэмэх | **PASS** | e2e/wallet |
| PWA-01 | Medium | Суулгадаг, офлайн shell, API кэшгүй | **PASS** | e2e/pwa |
| OCR-01 | Medium | Офлайн OCR parser | **PASS** | shared unit (5) |
| A11Y-01 | High | WCAG 2.2 AA: 10 хуудас × light/dark | **PASS** (0 зөрчил) | axe-core, AUDIT_2026-10 §3.3 |
| PERF-01 | Medium | Нийтийн карт Slow 4G: LCP 2.05 с, CLS 0, JS 390 KB | **PASS** | Playwright perf, AUDIT_2026-10 §3.4 |
| Load | — | 200 VU, 5 мин: **p95 = 36 ms**, алдаа **0.005 %** (157 812 хүсэлт) | **PASS** | qa/load/public-card.js |
| Load-app | — | 500 зэрэг нэвтэрсэн хэрэглэгч (≈5,000 бүртгэл), 2.8 мин, 86 569 хүсэлт: p95 ≤ **12 ms** бүх endpoint, алдаа **0 %** | **PASS** | qa/load/app-users.js, docs/SCALING.md |
| Lighthouse | — | /c/:slug mobile: Performance 97, Accessibility 100, SEO 100 | **PASS** | web/README |

Нийт автомат тест: pgTAP **170** · Edge Function **24** · API **39** · E2E **20** · unit **70** (shared 64, web 6) · STORE-01 (68 first-party файл) · TypeScript 7 typecheck · ESLint — **бүгд PASS**. Аудит: `docs/SECURITY_AUDIT.md`, `docs/AUDIT_2026-10.md`.

## 2. Гараар шалгах шаардлагатай (энэ орчинд боломжгүй)
| ID | Шалтгаан | Төлөв |
|---|---|---|
| M-01..M-03 | Жинхэнэ утасны камер, iOS/Android Contacts апп | ⏳ Хийгээгүй |
| M-04..M-06 | Development build суулгах, Universal/App Links (домэйн + Team ID + SHA-256) | ⏳ Хийгээгүй |
| M-07 | QPay sandbox (merchant бүртгэл хэрэгтэй) | ⏳ Хийгээгүй |
| M-08 | Cloudflare Turnstile жинхэнэ widget | ⏳ Хийгээгүй |
| AI бодит загвар | `ANTHROPIC_API_KEY`-тэй staging дээр 4 даалгаврыг монгол/англи хэлээр шалгах (local-д mock) | ⏳ |
| Maestro flows | Emulator/simulator шаардлагатай | ⏳ Бэлэн, ажиллуулаагүй |
| Bump жинхэнэ утсаар | Акселерометрын босго (≈1.8 g), 2 жинхэнэ утас, GPS | ⏳ |
| EAS build (APK/AAB/iOS) | Expo бүртгэл, Apple Developer шаардлагатай | ⏳ Хийгээгүй |
| k6 staging | Production-той ижил Supabase tier дээр давтах | ⏳ |
| M-09..M-15 | Passkey, Wallet, widget, Live Activity, NFC, офлайн OCR, e-barimt — development build ба жинхэнэ утас/QPay merchant хэрэгтэй | ⏳ Хийгээгүй (TEST_PLAN §4) |

## 3. Тестээр илэрч засагдсан алдаа
| # | Severity | Тайлбар | Төлөв |
|---|---|---|---|
| 1 | Medium | Байгууллага үүсгэсний дараа `insert … select` нь шинэ байгууллагыг буцаадаггүй (RLS) | Засагдсан (`0008`) |
| 2 | High | Mobile: `expo-image-picker` тохиргоо CAMERA эрхийг manifest-ээс хасч QR сканыг эвдэх байсан | Засагдсан (prebuild-ээр илэрсэн) |
| 3 | Medium | Shared i18n-ээр «QPay», үнийн текст mobile bundle-д орох эрсдэл | Засагдсан (web руу зөөсөн) |
| 4 | Low | `expo-brightness` шаардлагагүй WRITE_SETTINGS эрх нэмдэг | Засагдсан (blockedPermissions) |
| 5 | High | React 19: бүртгэлийн дараа auth listener `/app` руу эрт шилжүүлж wizard алгасагддаг байсан (FUN-01) | Засагдсан (Register.tsx) |
| 6 | Medium | Wallet цэс дараагийн карт/хэсгийн ард нуугддаг байсан (E2E) | Засагдсан (inline цэс) |
| 7 | Medium | `expo-live-activity` ба `@bacons/apple-targets` iOS prebuild-д зөрчилдсөн | Засагдсан (өөрийн ActivityKit module) |
| 8 | Medium | Шинэ trigger функц API-д нээлттэй үлдсэн (pgTAP 11 барьсан) | Засагдсан (0014) |
| 9 | High | WCAG тодосгол (Tailwind 4 өнгө, dark горим) | Засагдсан (D-73) |

## 4. Шийдвэр
☐ **GO** ☐ **NO-GO** — Critical тест бүгд PASS (local). Production GO-гийн өмнө §2-ын гарын шалгалт, staging дээрх давталт, PROJECT_OVERVIEW §11.3-ын checklist (ХХК, QPay production, домэйн, хуулийн баримт) шаардлагатай.

| Үүрэг | Нэр | Гарын үсэг | Огноо |
|---|---|---|---|
| QA Lead | | | |
| CEO | | | |
