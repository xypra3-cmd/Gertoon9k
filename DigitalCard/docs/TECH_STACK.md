# Технологийн стек — юу ашигласан, яагаад «шинэ» вэ

> Шинэчилсэн: 2026-10. Хувилбаруудыг `node_modules/*/package.json`-оос шууд уншсан (тааж бичээгүй).
> Шалгах: `npm ls --depth=0` (web, mobile), `docs/DECISIONS.md` D-61…D-64.

## 1. Товч дүгнэлт

| | Хэлбэр | Гол «шинэ үеийн» технологи |
|---|---|---|
| **Вэб** | React SPA + PWA | React 19.3 + **React Compiler**, **View Transitions API**, **Vite 8 (Rolldown, Rust)**, **Tailwind 4 (CSS-first)**, суулгадаг PWA |
| **Android + iOS** | Нэг кодоос (Expo) | **React Native 0.86 — зөвхөн New Architecture** (Fabric + TurboModules + JSI), **React Compiler**, **Reanimated 4** (UI thread дээрх spring физик, worklets), Expo Router (файлд суурилсан навигаци) |
| **Backend** | Supabase | **Postgres 17**, Row Level Security, **Deno Edge Functions**, pg_cron, pgTAP |
| **AI** | Edge Function | Claude-ийн structured output (JSON schema) — карт скан, био, CRM даалгавар |

## 2. Вэб (`web/`)

| Технологи | Хувилбар | Юу өгдөг |
|---|---|---|
| React | 19.3.0 | `<ViewTransition>`, `<Activity>`, `useEffectEvent`, `inert` prop, ref cleanup |
| React Compiler | babel-plugin-react-compiler 1.0 | Build үед автомат memo — гараар `useMemo/useCallback` бичих шаардлагагүй, илүүдэл re-render байхгүй. Bundle-д `memo_cache_sentinel` харагдана |
| React Router | 7.18 | Навигаци `startTransition` дотор → View Transitions-тэй шууд ажиллана |
| Vite | 8.3 | **Rolldown** (Rust) bundler — production build ~5 с |
| Tailwind CSS | 4.3 | Oxide (Rust) engine, тохиргоо CSS `@theme` дотор, PostCSS-гүй |
| View Transitions API | браузерын | Хуудас солигдоход агуулга зөөлөн cross-fade (header хөдлөхгүй) |
| PWA | manifest + service worker | Утас/компьютерт апп шиг суулгана, офлайн үед shell нээгдэнэ, API өгөгдлийг кэшлэхгүй (нууцлал) |
| Zod | 4.6 | Шинэ, хурдан validation (shared-тэй нэг instance) |
| TanStack Query | 5.104 | Кэш, background refetch |
| Recharts | 3.10 | Статистикийн график (lazy chunk) |
| Inter Variable | fontsource | Кирилл Ө, Ү бүрэн variable фонт |
| Vitest | 5.0 | Unit тест |

## 3. Mobile (`mobile/`) — Android ба iOS нэг кодоос

| Технологи | Хувилбар | Юу өгдөг |
|---|---|---|
| Expo SDK | 57.0.27 | EAS build, OTA update боломж, config plugins |
| React Native | 0.86.3 | **New Architecture л байдаг** (хуучин bridge бүрэн хасагдсан): Fabric renderer, TurboModules, JSI, Hermes |
| React | 19.2.3 | Expo SDK 57-ийн бэхэлсэн хувилбар |
| React Compiler | 1.0 (`experiments.reactCompiler`) | Автомат memo — Android bundle-д 103 компонент/hook compile хийгдсэн |
| Reanimated | 4.5 + worklets 0.10 | Карт эргүүлэх, хөвөх, дарах анимаци UI thread дээр 60/120 fps |
| Expo Router | 57.0.25 | Файлд суурилсан навигаци, deep link (`digitalcard://c/…`) |
| expo-camera | — | QR скан, AI нэрийн хуудас скан |
| expo-sensors + expo-location | — | «Ойртуулах» (bump) солилцоо — зөвхөн ойролцоо байршил (COARSE), FINE/BACKGROUND хориглосон |
| expo-secure-store | — | Session-ийг Keychain / Keystore-д |
| Inter | @expo-google-fonts | Жин бүр тусдаа family (Android-ийн fontWeight алдаанаас сэргийлнэ) |
| TypeScript | 6.0 | strict |

## 4. Backend (`backend/`)

| Технологи | Юу өгдөг |
|---|---|
| Postgres 17 (Supabase) | Эрх, квот, төлбөр **зөвхөн DB-д** (RLS + trigger + SECURITY DEFINER) |
| Deno Edge Functions | QPay, AI, солилцоо — түлхүүрүүд зөвхөн secret-д |
| pg_cron | Хугацаа дууссан захиалга, цэвэрлэгээ |
| Rate limit (HMAC сүлжээний түлхүүр) | IP хадгалахгүйгээр spam хамгаалалт |
| pgTAP | 158 DB тест |

## 5. Чанар ба тест

| Тест | Тоо |
|---|---|
| pgTAP (DB дүрэм) | 158 |
| Edge Functions | 23 (Wallet 3 шинэ) |
| API | 39 |
| E2E (Playwright 1.63, 20 загварын visual baseline орсон) | 20 (PWA-01, SEC-PK passkey, WALLET-UI) |
| Shared unit | 64 (OCR parser 5 шинэ) |
| Web unit | 6 |
| STORE-01 (апп дотор үнэ/төлбөр байхгүй) | PASS |

## 6. «Next level» боломжууд — хийгдсэн

| Технологи | Хаана | Юу хийдэг | Шалгалт |
|---|---|---|---|
| **Passkeys (WebAuthn)** | Вэб: нэвтрэх + Тохиргоо; Mobile: нэвтрэх + Тохиргоо (`react-native-passkey`) | Face ID / хурууны хээ / Windows Hello-гоор нууц үггүй нэвтрэх. Браузерын autofill (Conditional UI). Supabase Auth-ийн native passkey API | E2E **SEC-PK** (Chrome virtual authenticator: нэмэх → гарах → passkey-ээр нэвтрэх → устгах) |
| **Apple Wallet (.pkpass)** | Edge Function `wallet-pass`, вэб хянах самбар, iPhone нүүр дэлгэц | Картыг Wallet-д хадгална, түгжээтэй дэлгэцээс QR. PKCS#7 гарын үсэг (node-forge), ZIP-ийг өөрсдөө бичсэн | **WALLET-01**: manifest-ийн SHA-1 таарах, `openssl cms -verify` гарын үсэг баталгаажих |
| **Google Wallet** | Edge Function, вэб, Android | «Save to Google Wallet» JWT (RS256, WebCrypto) | **WALLET-02**: JWT-ийн гарын үсэг нийтийн түлхүүрээр батлагдах; **WALLET-UI** E2E |
| **iOS widget** (WidgetKit, SwiftUI) | `mobile/targets/widget` (`@bacons/apple-targets`) | Нүүр дэлгэц (жижиг/дунд) + түгжээтэй дэлгэц дээр QR. App Group-оор апп-тай өгөгдөл хуваалцана | `expo prebuild`: extension target `mn.digitalcard.app.widget`, App Group entitlement |
| **iOS Live Activity + Dynamic Island** | `targets/widget/EventLiveActivity.swift` + локал Expo module `modules/event-activity` (ActivityKit) | Эвент горимын үеэр: эвентийн нэр, танилцсан хүний тоо, үлдсэн хугацаа | prebuild + autolinking |
| **Android widget** | `mobile/widgets/` (`react-native-android-widget`) | Нүүр дэлгэц дээр QR + нэр, хэмжээг өөрчилж болно | prebuild: AppWidget receiver + provider XML; QR SVG render шалгасан |
| **NFC** | Mobile нүүр дэлгэц («NFC-д бичих»), Скан («NFC уншуулах») | Картын линкийг NFC наалт/картад бичнэ — хүн утсаа хүргэхэд апп-гүйгээр карт нээгдэнэ | prebuild: NFC permission, iOS entitlement |
| **Төхөөрөмж дээрх AI скан** | `@react-native-ml-kit/text-recognition` + `@digitalcard/shared/cardText` | Нэрийн хуудасны зургийг интернэтгүй уншиж талбаруудыг шууд бөглөнө; онлайн үед Claude сайжруулна | Unit тест 5 (монгол/латин карт, «Б.Болд», +976) |
| **TypeScript 7 (Go native)** | web, mobile, shared `npm run typecheck` | Вэбийн typecheck **6.7 с → 1.0 с** (6.4×). ESLint-д TS 5.9/6.0 хэвээр (typescript-eslint TS 7-г дэмжээгүй) | Алдаа барьж буйг шалгасан |

### Идэвхжүүлэх (дэлгүүрт гаргахын өмнө — бүртгэл/сертификат шаардлагатай)

| Юу | Хаана тохируулах |
|---|---|
| Apple Wallet | developer.apple.com → Pass Type ID + сертификат → `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APPLE_PASS_CERT_B64`, `APPLE_PASS_KEY_B64`, `APPLE_WWDR_CERT_B64` (Edge Function secret, base64 PEM) |
| Google Wallet | Google Pay & Wallet Console → Issuer ID + service account түлхүүр → `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SA_EMAIL`, `GOOGLE_WALLET_SA_KEY_B64` |
| Passkeys (production) | `config.toml`/Dashboard: `rp_id = "digitalcard.mn"`, `rp_origins = ["https://digitalcard.mn"]`; `.well-known/apple-app-site-association` (`webcredentials`) ба `assetlinks.json`-д Team ID / SHA-256 бичих |
| iOS widget / Live Activity | `APPLE_TEAM_ID` env (`ios.appleTeamId`), App Group `group.mn.digitalcard.app`-ийг Apple Developer дээр үүсгэх |
| NFC, OCR, widget, passkey (mobile) | Expo Go дээр ажиллахгүй — development build (`eas build --profile development`) хэрэгтэй. Expo Go-д эдгээр товч автоматаар нуугдана |

Тохиргоо хоосон үед: Wallet → «тохируулагдаагүй» мессеж (501), бусад нь товчоо нуудаг — апп хэзээ ч унахгүй.
Локал хөгжүүлэлтэд `scripts/dev-wallet-certs.sh` өөрөө гарын үсэг зурсан туршилтын сертификат үүсгэнэ (жинхэнэ iPhone хүлээж авахгүй).

## 7. Шударга байдал: үлдсэн хязгаарлалт

| Зүйл | Тайлбар |
|---|---|
| iOS / Android native build энд хийгдээгүй | Энэ орчинд Xcode, Android SDK байхгүй. Swift код, config plugin-ууд `expo prebuild`-ээр шалгагдсан; бодит compile-ийг EAS Build дээр хийнэ |
| ML Kit on-device OCR кирилл танихгүй | Утас, имэйл, вэб, латин нэрийг офлайн уншина; кирилл нэрийг онлайн үед Claude засна |
| NFC: утас өөрөө «карт» болох (Android HCE) | Хийгээгүй — NFC наалт/карт ашиглана (iPhone-д HCE зөвшөөрөгдөхгүй) |
| Live Activity-г серверээс push-ээр шинэчлэх | Апп нээлттэй/дэвсгэрт байх үед шинэчлэгдэнэ; APNs push-to-update хийгээгүй |
| Rust React Compiler (`oxc-transform-react`) | Туршилтын шатанд тул Babel хувилбар |
