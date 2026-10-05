# Digital Card Mobile: Windows дээрээс хөгжүүлэлт → build → store

Expo (React Native) апп. Код, Android build, **iOS build хүртэл** Windows-оос хийнэ — iOS-ийг EAS cloud compile, sign хийнэ.

```
Windows (VS Code)        EAS cloud (Expo)              Store
 код, Fast Refresh  ──▶  Android: .aab / .apk     ──▶  Google Play Console (Internal → Production)
 Android emulator        iOS: Xcode, sign → .ipa  ──▶  App Store Connect (TestFlight → Review)
 бодит утас (dev build)  cert / profile / keystore
                         EAS дээр шифрлэгдэж хадгалагдана
```

## 01. Нэг удаагийн бэлтгэл

**Windows**
- Node.js 22 LTS, Git, VS Code.
- Android Studio → SDK Manager (Android 15/16 SDK) → Device Manager-оор emulator үүсгэнэ.
- `npm install -g eas-cli` → `eas login`.

**Бүртгэлүүд**
- Expo бүртгэл. Үнэгүй багцад сард build-ийн тоо хязгаартай, дараалал удаан. Хурдан хэрэгтэй бол төлбөртэй багц авна.
- Apple Developer Program ($99/жил) — iOS build, TestFlight.
- Google Play Console ($25 нэг удаа).

**Төсөл**
```bash
cd DigitalCard/mobile
npm install
copy .env.example .env.local        # EXPO_PUBLIC_SUPABASE_URL / ANON_KEY / WEB_URL
eas init                            # EAS project үүсгэнэ → гарсан ID-г EAS_PROJECT_ID-д
```
`eas.json` дахь `submit.production.ios.ascAppId`-д App Store Connect дээрх апп-ын ID-г бичнэ.

## 02. Хөгжүүлэлт ба debug

| Хаана | Команд | Тайлбар |
|---|---|---|
| Android emulator | `npm run android` | Native build хийгээд emulator дээр ажиллуулна (Windows дээр) |
| Бодит Android утас | `npm run dev:android` → APK суулгах → `npx expo start` | USB debugging шаардлагагүй, QR-аар холбогдоно |
| Бодит iPhone | `npm run dev:ios` → линкээр суулгах → `npx expo start` | Анх удаа `eas device:create`-ээр iPhone-оо бүртгэнэ (UDID). Developer Mode асаана |
| Аль ч төхөөрөмж | `npx expo start` | Код хадгалмагц дэлгэц шинэчлэгдэнэ (Fast Refresh) |

- Development build нэг удаа хийгдэнэ. Native сан (камер, contacts г.м.) нэмэх эсвэл `app.config.ts` солих үед л дахин build хийнэ.
- Local Supabase: emulator-оос `http://10.0.2.2:54321`, бодит утаснаас компьютерийн LAN IP. Production-д заавал `https://` хаяг.
- iOS simulator Windows дээр ажиллахгүй, тиймээс бодит iPhone ашиглана.

## 03. Release-ийн өмнөх шалгах жагсаалт

- EAS → Environment variables (production) хэсэгт production Supabase URL/anon key тохируулсан байх. LAN IP байвал гадна сүлжээнд ажиллахгүй.
- Хувилбар: `app.config.ts` → `version` (харагдах хувилбар, жишээ нь 1.1.0). Build дугаарыг EAS автоматаар өсгөнө (`autoIncrement`).
- Bundle ID / package (`mn.digitalcard.app`) Apple, Google дээрх бүртгэлтэй таарах ёстой.
- `npm run typecheck && npm run lint && npm run store-check` → STORE-01 PASS (апп дотор үнэ, төлбөр байхгүй).
- Universal/App Links: вэбийн `/.well-known/` файлуудад Apple Team ID, Android SHA-256 (`eas credentials`-ээс) бичсэн байх.

## 04. Android build ба Play

```bash
npm run build:aab                    # production .aab (Play)
npm run build:apk                    # preview .apk (шууд суулгаж турших)
npm run submit:android               # Play Console → Internal testing track
```
- Анхны build дээр EAS upload keystore үүсгэж хадгалахыг санал болгоно → **Yes**. Нууц үг кодонд эсвэл git-д хэзээ ч орохгүй. Нөөц хувийг `eas credentials -p android` → Download хийж аюулгүй газар хадгална.
- Play App Signing асаалттай байна (Google өөрийн түлхүүрээр гарын үсэг зурна).
- Internal testing → шалгаад Production руу дэвшүүлнэ.

## 05. iOS build ба App Store (Mac-гүй)

```bash
npm run build:ios                    # EAS: Apple-д нэвтэрч cert + App Store profile-ыг өөрөө үүсгэнэ
npm run submit:ios                   # TestFlight руу (App Store Connect API key эсвэл Apple ID-аар)
```
- Анх удаа Apple ID-аар нэвтрэхэд EAS Distribution certificate, **App Store** төрлийн provisioning profile үүсгэнэ.
- TestFlight → дотоод тестер → App Review.
- Нэг certificate-ийг олон апп хуваалцаж болно. Хуучин .p12 байгаа бол `eas credentials -p ios` → upload.

## 06. Түгээмэл алдаа

| Шинж тэмдэг | Шалтгаан | Засах |
|---|---|---|
| `eas build`: «Project not configured» | `eas init` хийгээгүй, `EAS_PROJECT_ID` байхгүй | `eas init`, ID-г env-д тохируулах |
| Dev build нээгдсэн ч «Unable to connect» | Утас, компьютер өөр сүлжээнд | Нэг Wi-Fi, эсвэл `npx expo start --tunnel` |
| iPhone-д dev build суухгүй | UDID бүртгэлгүй | `eas device:create` → `npm run dev:ios` дахин |
| Апп нээгдэхэд хоосон / нэвтрэхгүй | `EXPO_PUBLIC_*` env тохируулаагүй | EAS environment variables, `.env.local` шалгах |
| Play: «Version code already used» | Local, remote хувилбар зөрсөн | `appVersionSource: remote` (тохируулсан); `eas build:version:set` |
| Play: QR скан ажиллахгүй | CAMERA эрх manifest-ээс хасагдсан | `app.config.ts`-ийн image-picker `cameraPermission`-ийг string хэвээр үлдээх (D-36) |
| Store review: «In-app purchase required» | Апп дотор үнэ, төлбөрийн линк орсон | `npm run store-check` (STORE-01) |
| npm install дээр peer dependency алдаа | Expo SDK-тай зөрсөн хувилбар | `npx expo install --check` (D-04: react-dom 19.2.3) |

## 07. Дараагийн алхам: хурдан засвар (OTA)
Store-ийн шалгалтгүйгээр JS засвар хүргэхийн тулд: `npx expo install expo-updates` → `eas update:configure` → `eas update --branch production`. Энэ нь зөвхөн алдаа засах, жижиг өөрчлөлтөд зориулагдсан (Apple, Google-ийн дүрмээр том функцийг store-оор гаргана). EAS project ID тохируулсны дараа нэмнэ.
