# DECISIONS.md — Шийдвэрийн бүртгэл

Эргэлзээтэй шийдвэр бүрийг энд тэмдэглэнэ. Формат: асуудал → шийдвэр → шалтгаан.

## Prompt 00 — Backend

### D-01 Монорепогийн байршил
Prompt-д `Documents/DigitalCard/` гэжээ. Энэ git репо өөр (.NET тест) төсөлтэй тул бүх код `DigitalCard/` дэд хавтаст байна. Бүтэц нь яг prompt-ынхтой ижил. Root `.gitignore` нь NuGet-ийн `packages/`-ийг нуудаг тул `DigitalCard/.gitignore`-д `!/packages/*` нэмсэн.

### D-02 Үнэ, лимит migration-д байна (seed-д биш)
Prompt: «Үнэ нь таамаг, зөвхөн seed-ээр солигдоно». Гэвч `seed.sql` нь production-д ажилладаггүй тул `plans`-ийн мөрүүдийг `0001_init.sql` дотор оруулсан. Үнэ солих = `update plans ...` гэсэн шинэ migration. Кодонд үнэ hardcode хийгээгүй хэвээр.

### D-03 Багц дууссан хэрэглэгч Free руу буурна
Зөрчил: нийтлэг дүрэм «засвар … түгжигдэнэ», Prompt 01 §4 «Free (эсвэл багц дууссан): анхны 1 карт засагдана», төслийн танилцуулга §6.2 «Хэрэглэгч Free руу буурна».
Шийдвэр: хамгийн сүүлийн баримт (танилцуулга §6.2)-ийг дагасан. Багц дууссан хэрэглэгч Free-ийн эрхтэй болно: анхны 1 карт засагдана, бусад карт нийтэд нээлттэй ч түгжээтэй, шинэ карт нэмэх боломжгүй (квот 1), CRM бичилт түгжигдэнэ. Шалгуур 3 («UPDATE хийж чадахгүй»)-ыг 2 дахь карт дээр шалгадаг. Өгөгдөл устахгүй, тараасан QR үхэхгүй.
Ерөнхий дүрэм: хэрэглэгчийн `rank(created_at) ≤ card_quota` карт л засагдана. Энэ нь Pro → Free болж буурсан ч зөв ажилладаг.

### D-04 `card_daily_stats` нь энгийн VIEW
Rollup хүснэгт эсвэл materialized view-ийн оронд `security_invoker` view. Шалтгаан: үргэлж raw event-тэй тохирно (Бүх хугацаа ≥ Өнөөдөр нөхцөл автоматаар биелнэ), RLS шууд үйлчилнэ, refresh cron хэрэггүй. Event-ийн тоо өсвөл `(card_id, day)` rollup хүснэгт + өнөөдрийн live хэсэг болгож солино. Өдрийг `Asia/Ulaanbaatar`-аар тооцно.

### D-05 Subscription: нэг эзэмшигчид нэг мөр
`subscriptions`-д хэрэглэгч эсвэл байгууллага тус бүр нэг мөртэй (unique partial index). Төлбөр бүр тэр мөрийг сунгана: `current_period_end = max(now, хуучин end) + 1 сар`. Багц солиход (Pro → Team гэх мэт) шинэ багц төлбөр баталгаажих үед хүчинтэй болж, үлдсэн хугацаа шилжинэ.

### D-06 Edge Function-ийн JWT шалгалт
Бүх функц `verify_jwt = false`. Хэрэглэгч шаардлагатай функцууд (`qpay-create-invoice`, `org-invite`) токеныг GoTrue `/auth/v1/user`-ээр өөрсдөө шалгана. Шалтгаан: Supabase-ийн шинэ (asymmetric) JWT түлхүүртэй ч ажиллана, public болон cron endpoint-ууд нэг загвартай.

### D-07 Edge Function-д supabase-js ашиглаагүй
`_shared/db.ts` нь PostgREST, GoTrue-г `fetch`-ээр шууд дуудна. Гадны dependency байхгүй тул deploy, local ажиллагаа энгийн. Бизнес логик бүгд транзакцтай SQL функцэд (`0005_service_functions.sql`) байгаа.

### D-08 Team суудал
Суудалд эзэмшигч (owner) орно. `org_members`-ийн мөр бүр (invited + active) нэг суудал эзэлнэ. Owner-ийн мөр байгууллага үүсэхэд суудлын шалгалтгүй орно. Active Team subscription байхгүй бол суудал 0.

### D-09 Хувийн ба байгууллагын картын квот тусдаа
`card_quota(uid)` = хувийн багцын лимит (байгууллагын картыг тооцохгүй). Байгууллагын карт: ажилтан бүрт тухайн байгууллагад `plans.team.card_limit` (1) карт.

### D-10 Байгууллагын ажилтны засах эрх
`allow_employee_edit_fields` нь `cards`-ийн баганын нэрс. `'links'` гэж оруулбал ажилтан линкээ засна. `template_id`-ийг жагсаалтад оруулсан ч зөвхөн org admin өөрчилнө.

### D-11 Rate limit-ийг `card_events`-ээс тоолно
`track-event` (30/мин/зочин/карт), `contact-exchange` (5/цаг/зочин) нь хадгалагдсан event-ийг тоолдог тул тусдаа хүснэгт хэрэггүй. Race condition-ийг advisory lock-оор хаасан.

### D-12 Имэйл: `email_queue`
Имэйлийг дараалалд оруулна. `dedupe_key` нь «өдөрт 1 digest», «нэг хугацаанд 1 сануулга» гэх мэт баталгааг DB түвшинд өгнө. `RESEND_API_KEY` тохируулсан бол Resend HTTP API-аар илгээнэ, үгүй бол дараалалд үлдэнэ (local). SMTP-г Deno-д ашиглаагүй.

### D-13 Contact-д нэмэлт багана
- `via_card_id` — эзэмшигчийн аль картаар ирснийг хадгална (картын funnel: exchange → follow-up).
- `exchange_message` — зочны мессеж (≤ 300). Эзэмшигчийн `note` (CRM)-оос тусдаа.
Client `source = 'exchange'` гэж бичиж чадахгүй (зөвхөн contact-exchange функц).

### D-14 Нэрээр харагдах зочин (PRIV-02)
`profiles.show_name_to_owners` (default false). `viewer_user_id` нь зөвхөн тухайн үед зөвшөөрсөн бол хадгалагдана, харуулахдаа (`get_named_viewers`) дахин шалгана.

### D-15 Платформ админ MFA-г DB шаардана
`is_platform_admin()` = `role = 'admin'` **ба** JWT `aal = 'aal2'`. TOTP-гүй админ токен админы өгөгдөл харахгүй.

### D-16 Cron
`pg_cron` + `pg_net`. Функцийн URL болон cron secret-ийг Vault-д хадгална (migration-д нууц үг байхгүй). Vault-д утга байхгүй бол job зөвхөн notice бичнэ.

### D-17 Soft delete
Client-ын `DELETE cards` нь `BEFORE DELETE` trigger-ээр `deleted_at`, `is_published = false` болно. Service role / cascade нь жинхэнэ устгал. Устсан картыг client сэргээж чадахгүй.

### D-18 Тестийн хэрэгсэл
pgTAP (`supabase test db`) + Node-ын built-in `node:test` (Edge Function integration, dependency-гүй) + QPay/Turnstile mock сервер. Prompt 04 эдгээрийг Vitest/Playwright-тай CI-д холбоно.

## Prompt 01 — Web

### D-19 Нийтийн картын bundle
`/c/:slug` нь supabase-js ачаалдаггүй: PostgREST, track-event-ийг `fetch`-ээр шууд дуудна (`lib/publicApi.ts`). Exchange маягт (zod, react-hook-form) товч дарахад lazy ачаална. `packages/shared`-ийг дэд замаар (`@digitalcard/shared/vcard` гэх мэт) импортолж zod-ыг нийтийн картаас гаргасан. Үр дүн: Lighthouse mobile Performance 97.

### D-20 OG meta tag
SSR-гүй SPA тул Netlify Edge Function (`card-og.ts`) `/c/*` хариуд `public_cards`-аас уншиж OG tag тарина. Vercel сонговол ижил логикийг Edge Middleware болгоно.

### D-21 Загварын өнгө WCAG AA
10 загвар × 2 өнгөний `fg/accent/muted` бүгд дэвсгэртэйгээ ≥ 4.5:1 contrast-тай (shared тест). Хэрэв дизайнер өнгө солибол тест унана.

### D-22 Хэвлэх
Нүүр/ар талыг DOM-оор мм нэгжээр зурж `html-to-image` (pixelRatio → 300 dpi) → `jsPDF`. 96×61 мм PDF-ийн crop mark нь bleed бүсэд (зүсэхэд арилна). A4 10 ширхэг: 2×5, зүссэн хэмжээгээр (90×55) нийлүүлж, гадна талд crop mark; ар тал duplex-д зориулж толин эргүүлсэн. QR = 24 мм (≥ 18 мм).

### D-23 Огноо
Бүх «өдөр» (өнөөдөр, 7/30 хоног, follow-up) Asia/Ulaanbaatar (UTC+8)-аар — DB-тэй ижил. MN формат `2026.10.04`.

### D-24 Demo горим
`VITE_DEMO_MODE` нь build үед статикаар орлогдох тул production bundle-аас demo бүртгэл, нууц үг dead-code-оор бүрэн хасагдана (шалгасан).

### D-25 Admin MFA
`/admin` нь aal2 биш бол TOTP бүртгэх/баталгаажуулах дэлгэц харуулна. DB-ийн `is_platform_admin()` мөн aal2 шаарддаг тул UI-г тойрсон ч өгөгдөл харагдахгүй.

### D-26 Туршилтын орчны хязгаар
Энэ sandbox-оос Cloudflare (Turnstile) руу хандах боломжгүй тул E2E-д Turnstile script-ийг stub-аар сольсон (dummy token серверт mock-оор шалгагдана). Жинхэнэ Turnstile, жинхэнэ утсаар QR/.vcf шалгалтыг QA (Prompt 04)-д хийнэ.

## Prompt 04 — QA

### D-27 Тестийн давхаргууд
pgTAP (DB-ийн дүрэм), node:test (Edge Function + mock), Vitest API (бодит JWT-ээр REST-ийг шууд дуудаж UI-г тойрно), Playwright E2E. Critical ID бүр дор хаяж нэг API тест + DB тесттэй. API/E2E тест бүр өөрийн хэрэглэгчийг admin API-аар үүсгэдэг тул seed-ээс үл хамаарна (FUN-03, ui-roles нь seed-ийн demo бүртгэл ашиглана).

### D-28 Turnstile ба QPay тест
CI/sandbox-оос Cloudflare, QPay руу хандахгүй: QPay v2 + Turnstile siteverify mock (`backend/supabase/tests/mocks`), browser талд Turnstile script stub. Жинхэнэ sandbox-ыг гарын шалгалт M-07, M-08-аар.

### D-29 Visual regression
FUN-02 нь 20 screenshot baseline (`qa/e2e/fun-02-templates.spec.ts-snapshots/*-linux.png`). Font rendering ОС-оос хамаардаг тул baseline-ийг Linux (CI-тай ижил) дээр үүсгэсэн. Загвар зориуд өөрчлөхдөө `npx playwright test --update-snapshots`.

### D-30 Org owner select policy
QA-ийн API тест олсон: байгууллага үүсгэсэн хэрэглэгч `insert … select`-ээр шинэ байгууллагаа буцааж харж чадахгүй байв (owner гишүүнчлэл AFTER trigger-ээр нэмэгддэг). `0008`: эзэмшигч өөрийн байгууллагыг үргэлж харна.

## Prompt 02/03 — Mobile

### D-31 Expo SDK 57, CNG
`mobile/android`, `mobile/ios`-ийг git-д оруулахгүй (Continuous Native Generation): бүх native тохиргоо `app.config.ts` + config plugin-д. `npm run prebuild:*` эсвэл EAS build үүсгэнэ. Prebuild-ийг local-д шалгасан (Android manifest, iOS Info.plist/PrivacyInfo/entitlements).

### D-32 Session хадгалалт
Supabase session (~3 KB) нь SecureStore-ийн ~2 KB хязгаараас том тул `lib/secureStorage.ts` 1800 тэмдэгтийн хэсгүүдэд хувааж Keychain/Keystore-д хадгална (AsyncStorage-д токен хадгалахгүй).

### D-33 Картын preview = WebView
Загваруудыг native-д дахин бичихгүй: `WebView {web}/c/{slug}?embed=1`. `embed=1` үед вэб нь action товч, header-гүй, статистик бичихгүй.

### D-34 Утсанд хадгалах
`expo-contacts`-ийн `Contact.presentCreateForm` (iOS, Android хоёуланд системийн «Шинэ contact» маягт, хэрэглэгч өөрөө баталгаажуулна). Зөвшөөрөл зөвхөн энэ товч дарахад асуугдана.

### D-35 Mobile-д үнэ/төлбөрийн текст хориотой
Shared i18n-аас `plans.*`, `qpay_unavailable`-ийг web руу зөөсөн. STORE-01 нь export-ийн source map-аас bundle-д орсон first-party модулиудыг тодорхойлж шалгана (Hermes bytecode / escape хийгдсэн гуравдагч сангийн хүснэгтээс хуурамч илрэл гаргахгүй), `plans.ts` bundle-д ороогүйг баталгаажуулна.

### D-36 Шаардлагагүй эрх
`expo-brightness` нь WRITE_SETTINGS нэмдэг ч апп зөвхөн өөрийн цонхны гэрлийг өөрчилдөг → blockedPermissions. `expo-image-picker`-ийн `cameraPermission:false` нь CAMERA-г хасдаг (QR эвдэрнэ) тул тайлбартай string өгсөн — prebuild-ээр илэрсэн.

### D-37 Sign in with Apple
MVP-д зөвхөн имэйл/нууц үг → App Store 4.8 шаардахгүй. Google/Facebook нэмбэл Sign in with Apple заавал.

### D-38 Апп дотор Free/Pro ялгаа
Апп нь багцын нэр, үнэ, upsell харуулахгүй. Эрхгүй үед зөвхөн «Таны бүртгэл одоогоор засварлах эрхгүй байна». CRM талбарууд эрхгүй үед зүгээр харагдахгүй.

## Өсөлт, AI, дизайн (2026-10)

### D-39 Жилийн төлбөр
Pro: 79,000₮/жил (12 × 9,900 = 118,800₮-өөс 34% хямд, ≈ 8 сарын үнэ). Team: 50,000₮/хэрэглэгч/жил (10 сарын үнэ). Үнэ зөвхөн `plans.price_annual_mnt`, `plans.price_per_seat_annual_mnt`-д. `payments.period` нь `apply_payment_check`-д сунгах хугацааг (1 сар / 1 жил) тодорхойлно. Billing хуудас анхдагчаар «Жилээр»-ийг сонгосон байна (мөнгөн урсгал, churn ↓). Хэрэглэгч хариулаагүй тул энэ саналаар явав.

### D-40 Slug түгжих
Карт анх нийтлэгдэхэд `cards.published_at` тавигдана; түүнээс хойш клиент slug-ийг өөрчилж чадахгүй (`slug_locked`). Нийтлэлээс буулгасан ч түгжээтэй хэвээр — хэвлэсэн QR, нэрийн хуудас хэзээ ч эвдрэхгүй. Service role (админ дэмжлэг) өөрчилж чадна.

### D-41 Урилгын хөтөлбөр
Профайл бүр 8 тэмдэгтийн `referral_code`-той. `?ref=CODE`-оор бүртгүүлсэн хэрэглэгч анх төлбөр хийхэд (сервер талд баталгаажсан) урьсан хүнд +1 сар Pro (`reward_referral`, нэг хэрэглэгчид нэг удаа). OAuth-аар бүртгүүлсэн бол 7 хоногийн дотор, төлбөрөөс өмнө `claim_referral`. Mobile-д урилга харуулахгүй (шагнал нь багцтай холбоотой → store-ийн upsell дүрэм).

### D-42 «Digital Card-аар бүтээв» footer
Free хувийн картын доор жижиг CTA (`public_cards.show_branding`). Pro, Team-д нуугдана → вирал өсөлт + Pro руу шилжих нэмэлт шалтгаан. View дотор функц дуудахад anon-ийн EXECUTE эрх шалгагддаг тул зөвхөн boolean буцаадаг `card_shows_branding()` SECURITY DEFINER функц.

### D-43 AI туслах (чатботгүй)
Edge Function `ai-assist`: `bio`, `scan` (нэрийн хуудасны зураг → контакт), `note` (хураангуй, tag, дараагийн алхам, хоног), `followup` (имэйл/SMS ноорог). Claude API — албан ёсны `@anthropic-ai/sdk` (Deno, `nodeModulesDir: manual` → `npm run functions:deps`), загвар `claude-opus-5-5` (`AI_MODEL` secret-ээр солигдоно), `output_config.effort: low` + JSON schema structured output, `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`), `stop_reason: refusal` → кредит буцаана. Квот DB-д: Free 3/өдөр, төлбөртэй 100/өдөр, CRM даалгавар зөвхөн CRM-тэй багцад. Хэрэглэгч үр дүнг шалгаад өөрөө хадгална. Агуулга лог-д бичигдэхгүй. `ANTHROPIC_API_KEY` зөвхөн Edge Function secret. Зардал бууруулах шаардлага гарвал `AI_MODEL`-ийг хямд загвар руу сольж болно.

### D-44 Нэгдмэл дизайн систем
`packages/shared/src/design.ts` (өнгө, радиус, хөдөлгөөний хурд/easing/spring) ба `icons.ts` (icon-ы геометр). Web: Tailwind config + CSS keyframes; mobile: theme + Reanimated 4 + expo-haptics. Хоёулаа OS-ийн «reduce motion»-ийг хүндэтгэнэ. Анимацийн номын сан нэмээгүй (bundle жижиг).

### D-45 Статистикийн анимаци
Web: recharts Area (gradient) + Bar (өнгө тус бүр) 900 ms ease-out, KPI count-up, funnel өргөн нь stagger-тэй өснө; reduced-motion үед анимацигүй. Playwright E2E `reducedMotion: 'reduce'` → тогтвортой.

### D-46 Хоёр шатлалт баталгаажуулалт (бүх хэрэглэгчид сонголтот)
Тохиргоо → 2FA (TOTP). Factor-той хэрэглэгч шинэ session бүрт `MfaGate`-ээр код оруулна. Платформ админд заавал (aal2, DB-д).

### D-47 Бүртгэлийн Turnstile
Supabase Auth → Bot protection (Turnstile)-ийг production-д асаавал `VITE_AUTH_CAPTCHA=true` → бүртгэлийн маягт captchaToken илгээнэ. Local/CI-д унтраастай (Cloudflare хүрэхгүй).

### D-48 AutoFitText хэлбэлзэл
Нэрийн фонт багасгах үед эцэг элементийн өндөр өөрчлөгдөж ResizeObserver дахин дуудагдан 14↔24px мөнхийн давталт үүсдэг байсан (Dark загвар). Зөвхөн өргөн өөрчлөгдөхөд дахин тооцоолно.

### D-49 Mobile web build
Апп нь iOS/Android-д зориулагдсан; `lib/secureStorage.web.ts` нь зөвхөн дизайны preview/screenshot-д (sessionStorage).

### D-50 Утас ойртуулж солилцох = bump + код (NFC/BLE биш)
NFC P2P (Android Beam) хасагдсан, iPhone tag дуурайж чадахгүй; BLE нь native код ба iOS background хязгаартай. Тиймээс iPhone↔Android хоёуланд Expo-гоор ажилладаг **bump**: акселерометрын огцом түлхэлт эсвэл «Одоо!» товч + ойролцоо бүс (geohash 6 тэмдэгт, match нь эхний 5 ≈ 5 км) + серверт 3 секундын цонх. Байршилгүй хувилбар — 6 оронтой код (2 мин, 10 оролдлого/10 мин). Pulse-ууд 10 минутын дотор устна, IP/нарийн байршил хадгалахгүй. NFC наалт, Wallet, BLE — ROADMAP.

### D-51 Nearby контактыг тал бүр өөрийн хүсэлтээр хадгална
Matcher нөгөө хүний контактыг бичвэл `contacts_before_write` (owner ≠ auth.uid()) татгалзана. Тиймээс хүлээж буй тал `nearby_poll`-оор match-ийг мэдээд өөрийн контактыг өөрөө хадгална → харилцагчийн хязгаар, CRM дүрэм өөрчлөлтгүй үйлчилнэ. Давхардлыг (owner, card_id)-аар шалгана. Буруу match-ийг хэрэглэгч «буцаах»-аар устгана.

### D-52 Картын эргэлт
Mobile: Reanimated `rotateY` + spring, шударсан чиглэлээр эргэнэ, хагас эргэлтэд haptic, reduce motion → шууд солигдоно; урд тал (QR) арын өндөрт тэнцүүлэгдэнэ. Web: CSS 3D (`preserve-3d`, `backface-visibility`), хоёр тал нэг grid нүдэнд, нуугдсан тал `inert`; QR сан зөвхөн анх эргүүлэхэд lazy ачаалагдана (нийтийн картын bundle жижиг хэвээр).

### D-53 Өргөтгөл (1k–5k)
Хэмжилтээр сервер талын гацах цэг алга (500 зэрэг VU, p95 ≤ 12 ms). 0011-д зөвхөн нэмэлт индекс, цэвэрлэгээ. Production-д Supabase Pro + Small compute; дохио, дараагийн алхмууд — SCALING.md.

### D-54 Брэнд нэр
«Digital Card» ерөнхий тул солих санал: Temdeg (1), Kartaa (2). Tanil, Nerka, Tamga, Uulz эзэнтэй/андуурал үүсгэнэ (NAMING.md). Bundle id-г store-д илгээхээс өмнө шийднэ — эзэмшигчийн шийдвэр.

### D-55 Аюулгүй байдлын аудит (2026-10-06)
Хамгийн бага эрх (0012): anon зөвхөн `plans`/`public_cards` уншина, API-аас TRUNCATE хэнд ч үгүй, бусдын багц/квотын helper функц хаалттай, storage жагсаалт зөвхөн өөрийн хавтас. Зочны rate limit нь IP-ийн өдөр бүр солигдох HMAC-аар (UA-гүй) — IP өөрөө хадгалагдахгүй. Нууц үг 8+ тэмдэгт, үсэг + тоо (Auth ба UI ижил). Дэлгэрэнгүй, үлдсэн эрсдэл: SECURITY_AUDIT.md.

### D-56 Эвент горим DB-д
Тэмдэглэгээг UI биш, `contacts_aa_event_stamp` trigger хийнэ → мэдээлэл үлдээх (Edge Function), ойртуулах, QR, гараар — бүх зам автоматаар хамрагдана. Зөвхөн CRM багцад (Free-д CRM талбар бичихийг 0002 хориглодог). Эвентийн баганыг клиент шууд бичихгүй; `start_event` (1–72 цаг, 1–80 тэмдэгт) ба `stop_event` RPC-ээр. Mobile-д Free хэрэглэгчид огт харагдахгүй (store-ийн upsell дүрэм), вэбд «Pro-д нээх».

### D-57 Офлайн vCard QR
Линк QR нь статистик, шинэчлэлтэй тул үндсэн хэвээр. Офлайн QR нь хялбаршуулсан vCard (`buildCompactVCard`: нэр, албан тушаал, байгууллага, утас, имэйл, картын линк; био/хаяг/зураг/сошиал хасагдсан) — интернэтгүй орчинд. Кирилл UTF-8 тул QR нягт; error correction L.

### D-58 Харанхуй горимын тодосгол
Mobile dark `onPrimary` цагаан → `#0B1220` (brand-400 дээр 2.9:1 → 6.4:1, WCAG AA). Эвентийн баннер accent-600 (цагаан бичигтэй 5.7:1). Вэбийн theme товч «system» үед харагдаж буй горимыг сэлгэдэг болсон; `btn-ghost` дээрх улаан устгах товч dark-д улаан хэвээр.

### D-59 Mobile дизайн v2
Хэрэглэгчийн санал («загвар хангалтгүй»): Inter фонт (кирилл Ө Ү бүрэн, жин бүр тусдаа family — Android custom фонтод fontWeight-ыг үл тоодог), хөвөгч доод навигаци (Скан дунд том товч), таб бүрт том гарчиг, нүүрэнд карт урд/QR ар тал, 4 хурдан товч, 7 хоногийн тоо, өнгөт initials аватар, карт хэлбэрийн харилцагчийн жагсаалт. Дэлгэцийн гэрэлтүүлэг зөвхөн QR тал харагдах үед. FlipCard-ийн өндөр харагдаж буй талыг дагана.

### D-60 Wallet карт ба git синк
Нүүрний карт нь нэрийн хуудасны жинхэнэ харьцаатай (ISO 7810, 1.586:1) градиент карт: бараан загвар өөрийн өнгөөрөө, цайвар загвар accent өнгийн градиент + цагаан бичигтэй. Ар тал том QR (Линк/Офлайн). Олон картыг хажуу тийш гүйлгэнэ (paging + цэг). Хурдан товч дугуй, өнгөт.
`scripts/sync.ps1` + VS Code task: локал өөрчлөлтийг commit → `fetch` + `rebase` → push; шинэчлэгдсэн файлаас хамааран npm install / -Reset / Expo reload-ыг сануулна. Conflict гарвал зогсоож заавар өгнө (автоматаар дарж бичихгүй).

### D-61 Вэбийн стек: React 19.3, Router 7, Vite 8, Tailwind 4, Zod 4, Recharts 3
Vite 8 нь Rolldown (Rust) bundler-тэй — build ~1–5 с. Tailwind 4: тохиргоо `src/index.css`-ийн `@theme`-д (CSS-first), PostCSS хасагдсан (`@tailwindcss/vite`). Zod 4 (`{ error }` параметр), `@hookform/resolvers` 5. TypeScript 7 (Go дээрх native) гарсан ч `typescript-eslint` <6.1 л дэмждэг тул вэб TS 5.9, mobile TS 6.0 хэвээр — lint дэмжмэгц шилжинэ.
React 19-д auth listener `signUp()` дуусахаас өмнө session тавьдаг болсон тул бүртгэлийн дараах чиглүүлэлт `/app` руу «уралдаж» байсан — Register-ийн `<Navigate>` одоо зорилтот хуудсыг (welcome/billing/org) шууд заана.

### D-62 React Compiler (вэб + mobile)
Babel-ийн тогтвортой `babel-plugin-react-compiler` 1.0: вэбд `@rolldown/plugin-babel` + `reactCompilerPreset()`, mobile-д `experiments.reactCompiler: true`. Компонент, hook-ууд build үед автоматаар memo хийгдэнэ. `eslint-plugin-react-hooks` 7-ийн compiler дүрмүүд (effect дотор setState хориглох, render үед ref унших хориглох г.м.) хоёр төсөлд асаалттай. Rust порт (`oxc-transform-react`) туршилтын шатанд тул ашиглаагүй.

### D-63 View Transitions ба PWA
Хуудас солигдоход React-ийн `<ViewTransition default="page">` → браузерын View Transitions API (header/навигаци хөдлөхгүй, зөвхөн агуулга cross-fade + бага зэрэг дээшилнэ; reduce-motion үед унтарна; дэмждэггүй браузер шууд солино).
PWA: `manifest.webmanifest` (standalone, maskable icon, shortcut), `sw.js` гараар бичсэн (сан нэмээгүй). Нууцлал: зөвхөн өөрийн домэйны статик файл кэшлэнэ — Supabase API (харилцагч, карт, auth) хэзээ ч төхөөрөмж дээр worker-оор хадгалагдахгүй. Хуудас: network-first, офлайн үед кэшэлсэн shell. `/assets/*` (hash-тай) cache-first. `sw.js` `no-cache` header-тэй. Тест: PWA-01.

### D-64 Mobile нэвтрэх дэлгэц v3
Брэндийн градиент hero + хөвөгч 2 шилэн карт (Reanimated, reduce-motion үед зогсоно), доороос гарч ирэх дугуй булантай sheet. Талбар бүр дүрстэй, focus үед хүрээ тодорно; нууц үг харуулах/нуух; бүртгэлд нууц үгийн хүч (серверийн доод шаардлага = «Болно»). SVG gradient id `useId()`-аар — stack-д 2 дэлгэц зэрэг mount болоход web дээр id давхцаж gradient алга болдог байсан.

### D-65 Passkeys
Supabase Auth-ийн өөрийн passkey (WebAuthn) API: вэбд `signInWithPasskey` (+ Conditional UI autofill, `autocomplete="username webauthn"`), `registerPasskey`, `passkey.list/delete`. Mobile: `react-native-passkey` + `passkey.startAuthentication/verifyAuthentication` (нэг rp_id → вэб, апп хоёр нэг passkey хуваалцана: iOS `webcredentials:`, Android `get_login_creds`). Нууц түлхүүр төхөөрөмжөөс гардаггүй — бид зөвхөн нийтийн түлхүүр хадгална (Supabase). Passkey нэмэх нь нууц үг/2FA-г хасахгүй.

### D-66 Wallet pass
Edge Function `wallet-pass`: зөвхөн өөрийн, нийтлэгдсэн карт (owner_id = JWT user; RLS-ийн оронд service query-д owner шүүлт), 10/мин хязгаар. Apple: pass.json + зураг + manifest (SHA-1) + PKCS#7 detached гарын үсэг (node-forge, SHA-256), ZIP-ийг хамааралгүй өөрсдөө бичсэн. Google: Generic pass бүхий «savetowallet» JWT (RS256, WebCrypto). Түлхүүрүүд зөвхөн Edge Function secret (base64 PEM). Тохиргоогүй үед 501 `wallet_not_configured`. QR нь `?src=qr` — статистикт скан гэж тоологдоно.

### D-67 Widget ба Live Activity
iOS: `@bacons/apple-targets` (targets/widget, SwiftUI, CoreImage QR), App Group `group.mn.digitalcard.app`-аар JSON карт. `expo-live-activity` нь apple-targets-тэй нэг Xcode project-д зөрчилдсөн (prebuild алдаа) тул Live Activity-г өөрсдөө: widget extension дотор `ActivityConfiguration` + локал Expo module `modules/event-activity` (ActivityKit). Android: `react-native-android-widget` — widget модыг JS-ээс SVG QR-тэй үүсгэнэ; widget component-ууд React-ийн гадна дуудагддаг тул `'use no memo'` (React Compiler-ийн hook оруулахгүй).

### D-68 NFC
`react-native-nfc-manager`: картын https линкийг NDEF URI record болгон наалт/картад бичнэ. Уншигч талд апп хэрэггүй (iPhone background tag reading, Android). Апп доторх уншилт `parseCardLink`-ээр зөвхөн манай картыг нээнэ. Сан import хийхэд native module шаарддаг тул Expo Go-д унахгүйн тулд динамик import.

### D-69 Төхөөрөмж дээрх OCR
ML Kit text recognition (Android + iOS) → `@digitalcard/shared/cardText` (`parseCardText`): имэйл, утас (+976 хэвшүүлэлт), вэб, албан тушаал/байгууллага/хаягийн түлхүүр үг, «Овог Нэр» (кирилл) / «First Last» (латин). Эхлээд офлайнаар талбаруудыг бөглөж, онлайн үед Claude сайжруулна; AI алдаа/квот дууссан үед локал үр дүн хэвээр. Зураг төхөөрөмжөөс гарахгүйгээр уншигдана.

### D-70 TypeScript 7
`typescript7` (npm alias → typescript@7.0.2, Go native) typecheck/build-д; `typescript` 5.9/6.0 нь typescript-eslint-д үлдэнэ (TS 7-г дэмжмэгц нэг болгоно). TS 7-д `baseUrl` хасагдсан тул tsconfig-оос авсан (paths нь tsconfig-ийн хавтаснаас тооцогдоно).

### D-71 e-barimt (НӨАТ-ын цахим баримт)
Монголд B2C/B2B борлуулалт бүрт заавал. Төлбөр `paid` болмогц trigger `ebarimt_status = 'pending'` болгоно; Edge Function QPay `POST /v2/ebarimt_v3/create`-ийг (CITIZEN эсвэл 7 оронтой регистртэй ORGANIZATION) шууд дуудна, амжилтгүй бол `qpay-reconcile` 5 мин тутам дахин оролдоно (≤ 5 удаа). Баримтын QR Billing-ийн түүхэнд. e-barimt-ийн алдаа төлбөрийг хэзээ ч зогсоохгүй (TAX-01). Migration 0014.

### D-72 PDPL: гадаадад хадгалах зөвшөөрөл
Монголын Хувийн мэдээлэл хамгаалах хууль гадаадад дамжуулахад субьектийн зөвшөөрөл шаарддаг. Supabase (Сингапур), Anthropic, Resend (АНУ)-г нууцлалын бодлогод нэрлэж, бүртгэлийн ба зочны зөвшөөрлийн текстэд «гадаад дахь серверт хадгалах»-ыг тодорхой оруулсан. Зөрчлийн үед авах арга хэмжээ: `docs/INCIDENT_RESPONSE.md`.

### D-73 WCAG 2.2 AA (axe-core)
Tailwind 4-ийн `slate-500` (#62748e) манай дэвсгэр дээр 4.48:1 → `--color-slate-500: #5a6b82`. Dark горимд `text-slate-500/brand-600/red-600` нь нэг шат цайвар өнгө авна (unlayered CSS; `dark:` хувилбарууд мөн ижил утгатай). Аватарын палитр `avatarColors` (цагаантай ≥ 5:1) вэб, mobile хоёуланд. Тоон анимац `sr-only` бодит утгатай; декор жишээ `inert`.

### D-74 Нийтийн картын эрхийн функц ба ачаалал
Postgres view доторх функцийн EXECUTE эрхийг view-г дуудагчаар шалгадаг тул `card_shows_branding(owner, org)`-ийг anon-д нээлттэй байлгах шаардлагатай байсан → хэрэглэгчийн багцыг шалгах боломж. View одоо `card_branding(card_id)` (зөвхөн нийтлэгдсэн карт) ашиглана. Зочны форм (zod + react-hook-form) нээгдэх үед л ачаалагдана: нийтийн картын JS −24%.

### D-75 Нэг командаар асаах, санхүүгийн загвар
Windows-д `scripts/start-all.ps1` (шалгалт → Git → .env/npm → Wallet dev сертификат → Supabase + mock + migration → web + Expo), `stop-all.ps1`, `test-all.ps1` (PASS/FAIL хүснэгт). `.env`-д дутуу түлхүүрийг зөвхөн нэмнэ, бодит утгыг хэзээ ч дарж бичихгүй. Санхүүгийн тооцоонд үнийг **НӨАТ орсон** гэж үзэж цэвэр орлогыг ÷1.1-ээр, ААНОАТ 1%-ийг конcерватив байдлаар цэвэр орлогоос тооцно; ханшийг Монголбанкны албан ханшаар (`BUSINESS_PLAN.md`, `docs/finance/financial_model.xlsx`). Гадаад өрсөлдөгчийн үнийг зөвхөн тэдний албан ёсны үнийн хуудаснаас (`COMPARATIVE_STUDY_2026.md`).
