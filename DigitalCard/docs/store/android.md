# Google Play бэлтгэл — Digital Card (Android)

Package: `mn.digitalcard.app` · minSdk 24 · Expo SDK 57 · EAS build (AAB)

## 1. Build ба хувилбар
```bash
cd mobile
npm run build:apk     # eas build -p android --profile preview  → дотоод тест APK
npm run build:aab     # eas build -p android --profile production → Play-д AAB
eas submit -p android --latest   # Internal testing track руу
```
Эхний удаа: `eas login` → `eas init` (projectId) → `eas env:create` дээр `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_WEB_URL`, `EXPO_PUBLIC_DOMAIN`-ийг preview/production орчинд оруулна.

App Links + passkey: Play Console → **Setup → App signing**-ээс SHA-256-г хуулж `web/public/.well-known/assetlinks.json`-д тавиад вэбийг deploy хийнэ (`handle_all_urls` ба `get_login_creds`).

Native нэмэлтүүд (development build хэрэгтэй): нүүр дэлгэцийн widget (`widgets/`, receiver `.widget.CardQr`), NFC, ML Kit OCR, Credential Manager (passkey).

## 2. Эрх (permissions)
| Эрх | Шалтгаан | Хэзээ асуух |
|---|---|---|
| CAMERA | QR унших | Скан таб анх нээхэд |
| READ_CONTACTS, WRITE_CONTACTS | Уншсан картыг утасны contact-д хадгалах | «Утсанд хадгалах» дарахад л |
| ACCESS_COARSE_LOCATION | Утас ойртуулж солилцох (≈1 км) | «Ойртуулах» анх дарахад |
| NFC | Картын линкийг наалтад бичих, унших | Хэрэглэгч товч дарахад (runtime асуулгагүй) |
| INTERNET, VIBRATE (сануулга) | Үндсэн | — |
Хаасан: RECORD_AUDIO, ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION, storage/media read, SYSTEM_ALERT_WINDOW, WRITE_SETTINGS.

## 3. Data safety маягт
| Асуулт | Хариулт |
|---|---|
| Өгөгдөл цуглуулдаг уу? | Тийм |
| Гуравдагч этгээдтэй хуваалцдаг уу? | Үгүй (Supabase, Resend, Anthropic, Sentry нь үйлчилгээ үзүүлэгч — «sharing» биш; Google Wallet-д хэрэглэгч өөрөө нэмэхэд л дамжина) |
| Дамжуулалт шифрлэгдсэн үү? | Тийм (HTTPS/TLS) |
| Хэрэглэгч устгуулах хүсэлт гаргаж чадах уу? | Тийм — апп дотроос болон вэбээр |

| Төрөл | Цуглуулдаг | Зорилго | Заавал эсэх |
|---|---|---|---|
| Нэр | ✓ | App functionality, Account management | Заавал |
| Имэйл | ✓ | Account management, App functionality | Заавал |
| Утас | ✓ | App functionality | Сонголттой |
| Contacts (хэрэглэгчийн оруулсан харилцагчид) | ✓ | App functionality | Сонголттой |
| Photos (картын зураг) | ✓ | App functionality | Сонголттой |
| App interactions (нэргүй нээлтийн тоо) | ✓ | Analytics (картын эзэнд) | — |
| Approximate location (≈1 км, 10 минут) | ✓ | App functionality («Ойртуулах») | Сонголттой |
| App info and performance — Crash logs, Diagnostics (Sentry: JS алдааны текст цэвэрлэгдсэн, IP/ID-гүй, хэрэглэгчтэй холбогдохгүй) | ✓ | App functionality | Заавал (автомат, DSN тохируулсан үед) |
| Нарийн байршил, санхүүгийн мэдээлэл, device ID | ✗ | | |

## 4. URL-ууд
- Нууцлалын бодлого: `https://digitalcard.mn/legal/privacy`
- Бүртгэл устгах (Play-ийн шаардлага): `https://digitalcard.mn/legal/delete-account`
- Апп дотор: Тохиргоо → Бүртгэл устгах

## 5. Store listing
**Апп нэр:** Digital Card — нэрийн хуудас
**Богино тайлбар (80):**
- MN: Дижитал нэрийн хуудас, QR скан, уулзсан хүмүүсийн жагсаалт нэг дор.
- EN: Digital business card, QR scanner and the people you met in one place.

**Урт тайлбар (MN):**
Digital Card бол таны дижитал нэрийн хуудас. QR кодоо үзүүлэхэд хүмүүс апп суулгалгүйгээр таны картыг нээж, утсандаа хадгална.
• Миний карт — том QR, хуваалцах линк
• Скан — бусдын Digital Card-ыг уншиж утасны contact-д хадгалах
• Харилцагчид — уулзсан хүмүүсээ хайх, засах, интернэтгүй үед ч харах
• Статистик — картаа хэдэн хүн нээснийг харах
• Нүүр дэлгэцийн widget, NFC наалтад бичих, Google Wallet
• Passkey — нууц үггүй нэвтрэлт
• Монгол, англи хэл

**Урт тайлбар (EN):**
Digital Card is your digital business card. Show your QR code and people open your card without installing an app, then save it to their phone.
• My card — large QR code and a share link
• Scan — read other Digital Cards and save them to your contacts
• Contacts — search and edit the people you met, even offline
• Statistics — see how many people opened your card
• Home-screen widget, NFC tag writing, Google Wallet
• Passkeys — passwordless sign-in
• Mongolian and English

> Апп дотор болон listing-д үнэ, багц, төлбөрийн тухай бичихгүй (Play payments policy).

## 6. Screenshot
| Төхөөрөмж | Хэмжээ | Дэлгэцүүд |
|---|---|---|
| Утас 6.7" | 1080×2400 (эсвэл 1290×2796) | Миний карт (QR), Скан, Уншсан карт, Харилцагчид, Статистик, Тохиргоо |
| 7" таблет | 1200×1920 | Миний карт, Харилцагчид |
| Feature graphic | 1024×500 | Лого + «Уулзсан хүн бүрээ марталгүй» |

## 7. Content rating (IARC асуулга)
Хүчирхийлэл, бэлгийн агуулга, хар тамхи, мөрийтэй тоглоом — **Үгүй**. Хэрэглэгч хоорондын харилцаа: **Тийм** (хэрэглэгч өөрийн мэдээллээ хуваалцдаг; чат байхгүй). Хэрэглэгчийн байршил бусадтай хуваалцах — **Үгүй** (ойролцоо бүсийг зөвхөн серверт 10 минут тулгахад ашиглана). Хүлээгдэх үнэлгээ: **Everyone / 3+**.

## 8. Туршилтын шат
1. **Internal testing** (100 хүртэл тестер, хянуулалтгүй) — `eas submit` эндээ.
2. **Closed testing** — ⚠️ 2023.11-ээс хойш нээсэн **хувийн developer бүртгэлд** production руу гаргахаас өмнө **12+ тестер 14 хоног тасралтгүй** closed test хийх шаардлагатай. Байгууллагын (D-U-N-S-тэй) бүртгэлд энэ шаардлага хамаарахгүй.
3. Production — staged rollout 20% → 100%.

## 9. Review checklist
- [ ] `npm run store-check` PASS (апп-д ₮, QPay, /billing байхгүй)
- [ ] Бүртгэл устгах урсгал ажиллана (апп + вэб URL)
- [ ] Data safety, privacy URL бөглөсөн
- [ ] assetlinks.json-д production SHA-256
- [ ] Demo бүртгэл (Review-д): App access хэсэгт имэйл/нууц үг — кодонд биш
- [ ] Жинхэнэ утсан дээр: widget, NFC бичих/унших, passkey, Google Wallet (Монгол бүртгэлтэй утсаар — AUDIT PLAT-01), офлайн OCR
