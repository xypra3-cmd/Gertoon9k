# Digital Card — Mobile (Expo SDK 57, Android + iOS)

Нэг Expo source-оос Android, iOS хоёулаа гарна. **Апп дотор үнэ, багц, төлбөр огт байхгүй** (App Store 3.1.1, Google Play) — төлбөр зөвхөн вэб дээр.

## Ажиллуулах
```bash
cd mobile
cp .env.example .env.local      # EXPO_PUBLIC_SUPABASE_URL / ANON_KEY / WEB_URL
npm install
npx expo start                   # Expo Go эсвэл development build
```
Android emulator-оос local Supabase: `http://10.0.2.2:54321`. Жинхэнэ утаснаас: компьютерийн LAN IP.

| Команд | Үүрэг |
|---|---|
| `npm run typecheck` / `npm run lint` | TypeScript strict, ESLint (expo config) |
| `npm run export:android` | JS bundle + source map (STORE-01 шалгалтад) |
| `npm run store-check` | STORE-01: ₮ / QPay / /billing байхгүй |
| `npm run prebuild:android` / `prebuild:ios` | Native project үүсгэх (git-д оруулахгүй — CNG) |
| `npm run dev:android` / `dev:ios` | Бодит утсанд суулгах development build (Windows-оос iPhone-д ч) |
| `npm run build:apk` / `build:aab` / `build:ios` | EAS build (preview APK / Play AAB / App Store) |
| `npm run submit:ios` / `submit:android` | TestFlight / Play Internal руу илгээх |

Windows-оос build, store хүртэлх бүрэн заавар: [`docs/MOBILE_BUILD_WINDOWS.md`](../docs/MOBILE_BUILD_WINDOWS.md).

## Бүтэц
```
app/
├── _layout.tsx          провайдерууд + нэвтрэлтийн хамгаалалт
├── login · register · forgot
├── (tabs)/index         Миний карт: том QR (гэрэлтүүлэг↑), карт солих, хуваалцах, WebView preview
├── (tabs)/scan          expo-camera QR → /c/[slug] эсвэл гадны URL (асууж байж нээнэ)
├── (tabs)/contacts      жагсаалт, хайлт, офлайн кэш
├── (tabs)/stats         өөрийн картын тоо, 7/30 хоногийн график
├── (tabs)/settings      хэл, нэр харуулах, сануулга, гарах, бүртгэл устгах
├── c/[slug]             уншсан / deep link карт: Утсанд хадгалах, Миний contact-д нэмэх
├── contact/[id]         CRUD, .vcf хуваалцах
└── edit/[id]            талбар засах (байгууллагын зөвшөөрсөн талбар л)
lib/  supabase (SecureStore session), auth, i18n (MN/EN), cards, track, phoneContacts
```
`packages/shared` (vCard, zod, i18n, format) нь Metro-ээр шууд холбогдоно (`metro.config.js`).

## Шалгуурын төлөв
Дэлгэрэнгүй: [../qa/TEST_REPORT.md](../qa/TEST_REPORT.md). Store бэлтгэл: [../docs/store/android.md](../docs/store/android.md), [../docs/store/ios.md](../docs/store/ios.md).
