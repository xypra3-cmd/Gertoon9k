# Digital Card — Тестийн төлөвлөгөө

**GO/NO-GO дүрэм:** Critical тест нэг ч FAIL → NO-GO. High FAIL → QA Lead + CEO шийднэ.

## 1. Түвшин ба хэрэгсэл
| Түвшин | Хэрэгсэл | Байршил | Команд |
|---|---|---|---|
| DB / RLS | pgTAP | `backend/supabase/tests/database` | `npm --prefix backend run test:db` |
| Edge Function | node:test + QPay/Turnstile mock | `backend/supabase/tests/functions` | `npm --prefix backend run test:functions` |
| API (2+ хэрэглэгчийн JWT) | Vitest + supabase-js | `qa/api` | `npm run test:api` |
| Web E2E | Playwright (desktop + Pixel 7) | `qa/e2e` | `npm run test:e2e` |
| Mobile | Maestro + STORE-01 скрипт | `qa/mobile` | `maestro test qa/mobile/flows`, `npm run test:store` |
| Ачаалал | k6 | `qa/load` | `npm run load` |
| Unit | Vitest | `packages/shared`, `web` | `npm test` |

Орчин: `scripts/dev-up.sh --reset` (Supabase local + mock) → `qa/` дотор `npm install`.

## 2. Critical (NO-GO)
| ID | Шалгах зүйл | Автомат тест |
|---|---|---|
| SEC-01 | A нь B-ийн card/link/contact/event/payment/subscription/profile/org/audit/email-ийг SELECT/UPDATE/DELETE/INSERT хийж чадахгүй; service RPC дуудах боломжгүй | `api/critical.test.ts`, pgTAP 03 |
| SEC-02 | Free 2 дахь, Pro 6 дахь карт, Team илүү суудал → DB татгалзана (REST + org-invite) | `api/critical`, pgTAP 01 |
| SEC-03 | Хугацаа дууссан хэрэглэгч REST-ээр түгжигдсэн картыг UPDATE → 0 мөр; шинэ карт татгалзана | `api/critical`, pgTAP 02 |
| PAY-01 | Хуурамч callback → идэвхжихгүй | `api/critical`, functions test |
| PAY-02 | Давхар callback → нэг л удаа сунгана | `api/critical`, pgTAP 06 |
| PAY-03 | Callback-гүй ч reconcile идэвхжүүлнэ | `api/critical`, functions test |
| PAY-04 | Дутуу дүн → failed, audit_log-д | `api/critical`, pgTAP 06 |
| ORG-01 | Ажилтан бусдын статистик, байгууллагын template-ийг өөрчлөхгүй | `api/critical`, pgTAP 04, E2E ui-roles |
| PUB-01 | Багц дууссан ч /c/:slug, QR, .vcf ажиллана | `api/critical`, E2E ui-roles |
| PRIV-01 | card_events, лог-д IP байхгүй | `api/critical`, pgTAP 07, functions test (edge log grep) |
| PRIV-02 | Зөвшөөрөөгүй viewer-ийн нэр харагдахгүй | `api/critical`, pgTAP 07 |
| EXC-01 | consent / Turnstile-гүй exchange татгалзана | `api/critical`, functions test |
| EXC-02 | Нэг зочин цагт > 5 → татгалзана | `api/critical`, pgTAP 05 |
| ENT-01 | Free REST-ээр note/follow_up_at → татгалзана; Pro бичнэ | `api/critical`, pgTAP 05, E2E ui-roles |

## 3. High
| ID | Шалгах зүйл | Тест |
|---|---|---|
| FUN-01 | Бүртгэл → карт → нийтлэх → өөр төхөөрөмжөөс QR → exchange → Pro төлбөр → тэмдэглэл, follow-up → dashboard → funnel | `e2e/fun-01-full-flow.spec.ts` |
| FUN-02 | 10 загвар × 2 өнгө visual regression, 40 тэмдэгт нэр, зураггүй | `e2e/fun-02-templates.spec.ts` (20 baseline) |
| FUN-03 | Бүх хугацаа ≥ 30 ≥ 7 ≥ Өнөөдөр, Нийт = view + qr_open | `api/high.test.ts`, E2E ui-roles |
| FUN-04 | .vcf кирилл | `e2e/fun-04-05`, shared unit; **гараар**: жинхэнэ iPhone, Android contact (M-03) |
| FUN-05 | PDF 96×61 мм, PNG 300 dpi, QR ≥ 18 мм | `e2e/fun-04-05` |
| SEC-04 | XSS (bio, label) escape; линк зөвхөн https/mailto/tel | `e2e/sec-04-xss.spec.ts`, shared unit |
| SEC-05 | Upload 5 MB, .svg, .exe, бусдын хавтас → татгалзана | `api/high.test.ts` |
| SEC-06 | track-event 100 хүсэлт/мин → 30 л тоологдоно | `api/high.test.ts` |
| STORE-01 | Mobile bundle-д ₮, QPay, /billing байхгүй | `qa/mobile/store-check.mjs` |
| TAX-01 | Төлбөр бүрт e-barimt; QPay e-barimt алдаа төлбөрийг зогсоохгүй, reconcile дахин олгоно; Billing-д QR | functions TAX-01, pgTAP 13, E2E FUN-01 |
| SEC-PK | Passkey нэмэх → гарах → зөвхөн passkey-ээр нэвтрэх → устгах | `e2e/passkey.spec.ts` (Chrome virtual authenticator) |
| WALLET-01/02 | .pkpass: manifest SHA-1, PKCS#7 гарын үсэг (`openssl cms -verify`); Google JWT RS256; зөвхөн өөрийн нийтлэгдсэн карт | `functions/wallet.test.mjs` |
| WALLET-UI | Хянах самбар → Apple Wallet татах, Google Wallet холбоос | `e2e/wallet.spec.ts` |
| PWA-01 | Manifest, icon, service worker, офлайн shell, API хариу кэшлэхгүй | `e2e/pwa.spec.ts` |
| OCR-01 | Офлайн OCR parser: монгол/латин карт, «Б.Болд», +976 | shared unit `cardText.test.ts` |
| A11Y-01 | WCAG 2.2 AA (axe-core): 10 хуудас × light/dark = 0 зөрчил | AUDIT_2026-10.md §3.3 (скрипт) |
| OPS-01 | Алдааны мэдээ (Edge, вэб): имэйл/утас/IP/токен цэвэрлэгдсэн, user/IP/breadcrumb/query байхгүй; DSN-гүй бол юу ч илгээхгүй; `health` нь DB болон e-barimt-ыг шалгаж, нийтэд тоо харуулахгүй | functions OPS-01 + `monitor.test.mjs`, shared `scrub.test.ts`, `e2e/monitoring.spec.ts` |

## 4. Гараар шалгах (жинхэнэ төхөөрөмж)
| ID | Алхам | Хүлээгдэх |
|---|---|---|
| M-01 | iPhone + Android камераар хэвлэсэн QR уншуулах | Карт нээгдэнэ, статистикт QR +1 |
| M-02 | Апп-ын Скан табаар өөр утасны QR | Карт харагдана → «Миний contact-д нэмэх» → вэбийн contacts-д гарна |
| M-03 | «Утсанд хадгалах» (вэб .vcf + апп) iOS, Android | Кирилл нэр, байгууллага зөв |
| M-04 | Камер/contacts зөвшөөрөл татгалзах | Апп унахгүй, «Тохиргоо нээх» |
| M-05 | Апп хаагаад нээх | Session хадгалагдсан |
| M-06 | Universal/App Link | `https://<domain>/c/<slug>` апп-д нээгдэнэ |
| M-07 | Жинхэнэ QPay sandbox (вэб) | Банкны апп-аар төлөхөд «Төлбөр баталгаажлаа» |
| M-08 | Turnstile жинхэнэ widget | Маягт илгээгдэнэ |
| M-09 | Passkey: iPhone (Face ID) ба Android (Credential Manager) — апп ба вэб нэг passkey | Нэмэх, нэвтрэх ажиллана |
| M-10 | Apple Wallet (.pkpass «Add»), Google Wallet (Монгол бүртгэлтэй утас) | Pass нэмэгдэж QR уншигдана |
| M-11 | Widget (iOS жижиг/дунд/түгжээтэй дэлгэц, Android) | Картын QR, нэр; товшиход апп нээгдэнэ |
| M-12 | Live Activity: эвент эхлүүлэх → харилцагч нэмэх → тоо өснө → дуусгах | Түгжээтэй дэлгэц, Dynamic Island |
| M-13 | NFC: NTAG215 наалтад бичих → өөр утсаар (апп-гүй) уншуулах; апп-аар унших | Карт нээгдэнэ |
| M-14 | Офлайн OCR: нислэгийн горимд нэрийн хуудас скан | Утас, имэйл, вэб бөглөгдөнө |
| M-15 | e-barimt: QPay sandbox/production дээр бодит гүйлгээ | Billing-д баримтын QR, e-barimt апп уншина |

## 5. Ачаалал
`/c/:slug` (хуудас + public_cards + track-event): 200 зэрэг хэрэглэгч, 5 минут, **p95 < 800 ms, алдаа < 1%**. Staging-д production-той ижил Supabase tier дээр ажиллуулна.

## 6. CI
`.github/workflows/digitalcard.yml` — PR бүрт: lint/typecheck/unit + STORE-01 → pgTAP → Edge Function → API → E2E. `gate` check-ийг branch protection-д **required** болгосноор FAIL үед merge хаагдана.
