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
| Edge Functions | 20 |
| API | 39 |
| E2E (Playwright 1.63, 20 загварын visual baseline орсон) | 18 (PWA-01 шинэ) |
| Shared unit | 59 |
| Web unit | 6 |
| STORE-01 (апп дотор үнэ/төлбөр байхгүй) | PASS |

## 6. Шударга байдал: одоогоор **ороогүй** «next level» технологиуд

Эдгээр нь 2026 онд тэргүүлэгч аппуудад байгаа ч энэ төсөлд хараахан хийгдээгүй:

| Технологи | Яагаад чухал | Хүндрэл / шаардлага |
|---|---|---|
| **Passkeys (WebAuthn)** | Нууц үггүй нэвтрэлт, phishing-аас хамгаална | Supabase Auth-ийн WebAuthn дэмжлэг + native module |
| **Apple Wallet / Google Wallet pass** | Картыг Wallet-д хадгалж, түгжээтэй дэлгэцээс QR харуулна | Apple Developer сертификат (.pkpass гарын үсэг), Google Wallet API түлхүүр |
| **NFC tap** | Утсаа хүргэхэд карт солилцоно | NFC tag эсвэл Android HCE; iOS-д зөвхөн tag унших |
| **Home screen widget, iOS Live Activity, App Intents (Siri/Shortcuts)** | Апп нээлгүй QR харуулах | Swift/Kotlin native target (expo-apple-targets г.м.) |
| **Төхөөрөмж дээрх AI** (Apple Foundation Models, Gemini Nano) | Нэрийн хуудас скан офлайн, нууцлал | Төхөөрөмжөөс хамаарна; одоогоор сервер талын Claude |
| **iOS 26 Liquid Glass native tab bar** | Системийн шинэ харагдац | Expo Router native tabs (туршилтын) |
| **Rust React Compiler** (`oxc-transform-react`) | Build илүү хурдан | Туршилтын шатанд |
| **TypeScript 7 (Go native)** | Typecheck ~10× хурдан | `typescript-eslint` дэмжээгүй |

Дараагийн алхмын санал (үр нөлөөгөөр): Wallet pass → Passkeys → Widget/Live Activity → NFC.
