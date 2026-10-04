# App Store бэлтгэл — Digital Card (iOS)

Bundle ID: `mn.digitalcard.app` · iPhone + iPad · Expo SDK 57 · EAS build (Windows-оос ч болно, Mac заавал биш)

## 1. Build → TestFlight
```bash
cd mobile
eas build -p ios --profile development   # simulator build (дотоод хөгжүүлэлт)
eas build -p ios --profile preview       # internal distribution (бүртгэсэн төхөөрөмжүүд)
npm run build:ios                        # production → App Store Connect
npm run submit:ios                       # eas submit -p ios --latest → TestFlight
```
`buildNumber` EAS-аар автоматаар өснө (`autoIncrement`, `appVersionSource: remote`).
Universal Links: `web/public/.well-known/apple-app-site-association` дахь `REPLACE_TEAMID`-г Apple Team ID-аар солиод вэбийг deploy хийнэ (`/c/*`).

## 2. Info.plist / Privacy
| Түлхүүр | MN | EN |
|---|---|---|
| NSCameraUsageDescription | Нэрийн хуудасны QR код уншихад камер ашиглана. | The camera is used to scan business card QR codes. |
| NSContactsUsageDescription | Уншсан нэрийн хуудсыг таны утасны contact-д хадгалахад ашиглана. | Used to save scanned business cards to your phone contacts. |
| NSPhotoLibraryUsageDescription | Нэрийн хуудасны зураг сонгоход ашиглана. | Used to choose a photo for your business card. |
| ITSAppUsesNonExemptEncryption | false (зөвхөн HTTPS) | |

`locales/mn.json`, `locales/en.json` → InfoPlist.strings. Privacy Manifest (`PrivacyInfo.xcprivacy`) нь `app.config.ts → ios.privacyManifests`-ээр үүснэ: tracking=false; цуглуулдаг өгөгдөл Name, Email, Phone, Contacts, Photos (App Functionality, linked, not tracking); required-reason API: UserDefaults CA92.1, FileTimestamp C617.1, SystemBootTime 35F9.1, DiskSpace E174.1.

Зөвшөөрөл татгалзсан үед апп унахгүй: «Тохиргоо нээх» товч (`Linking.openSettings()`) харуулна.

## 3. App Review дүрэм
| Дүрэм | Хэрэгжүүлэлт |
|---|---|
| **3.1.1** In-app purchase | Апп дотор үнэ, багц, «Төлөх», вэбийн төлбөр рүү линк/текст **байхгүй**. Багц идэвхгүй бол зөвхөн «Таны бүртгэл одоогоор засварлах эрхгүй байна». `npm run store-check` нь bundle-ийг шалгана |
| **5.1.1(v)** Бүртгэл устгах | Тохиргоо → Бүртгэл устгах → баталгаажуулах → бүх өгөгдөл тэр даруй устана (`delete_my_account`) |
| **4.8** Sign in with Apple | MVP-д зөвхөн имэйл/нууц үг → шаардлагагүй. Google/Facebook нэвтрэлт нэмбэл Sign in with Apple заавал нэмнэ |
| **2.1** Demo бүртгэл | `review@digitalcard.mn` — идэвхтэй Pro багцтай. Нууц үгийг **App Store Connect → App Review Information → Notes**-д л бичнэ |
| **4.2** Minimum functionality | Review Notes-д тайлбарлах: native QR скан (камер), утасны contact-д хадгалах (Contacts framework), офлайн харилцагчдын жагсаалт, follow-up local notification, дэлгэцийн гэрэлтүүлэг, Universal Links |

**Review Notes загвар (EN):**
> Digital Card is a business-card app. Native features: QR scanning with the camera (Scan tab), saving a scanned card to the iOS Contacts app via the system "New Contact" form, an offline contact list, daily follow-up reminders (local notifications) and Universal Links for /c/* URLs. The app contains no purchases or prices. Demo account: review@digitalcard.mn / (password). To test scanning, open the QR shown on https://digitalcard.mn/c/saraa-g.

## 4. App Privacy (nutrition label)
| Data type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Contact Info — Name, Email, Phone | ✓ | ✓ | ✗ | App Functionality |
| User Content — Other user content (contacts, notes) | ✓ | ✓ | ✗ | App Functionality |
| User Content — Photos | ✓ | ✓ | ✗ | App Functionality |
| Usage Data — Product interaction (anonymous card opens) | ✓ | ✗ | ✗ | Analytics |
App Tracking Transparency **шаардлагагүй** (tracking хийхгүй).

## 5. Listing
- Нэр: **Digital Card** · Subtitle: *Нэрийн хуудас ба QR скан* / *Business card & QR scanner*
- Keywords MN: нэрийн хуудас,QR,дижитал карт,contact,скан,бизнес карт
- Keywords EN: business card,digital card,QR,contacts,scanner,networking,vcard
- Тайлбар: [android.md](android.md) §5-тай ижил (үнэгүй, үнэ дурдахгүй)
- Support URL: `https://digitalcard.mn` (support@ хаягтай) · Privacy Policy URL: `https://digitalcard.mn/legal/privacy`
- Age rating: **4+**
- Screenshot: **6.9"** (iPhone 16 Pro Max, 1320×2868) ба **13" iPad** (2064×2752): Миний карт, Скан, Уншсан карт, Харилцагчид, Статистик.

## 6. Apple Developer бүртгэл
- Хувь хүн эсвэл байгууллага, **99$/жил**.
- Байгууллагаар (ХХК) нээх бол **D-U-N-S дугаар** заавал (Dun & Bradstreet, хэдэн долоо хоног болж магадгүй). App Store-д худалдагчийн нэр нь компанийн нэр болно.

## 7. Шалгах жагсаалт
- [ ] `npm run store-check` PASS
- [ ] Simulator: нэвтрэх, QR, contacts CRUD; жинхэнэ iPhone: скан, «Шинэ contact» маягт кирилл нэртэй
- [ ] Камер/contacts зөвшөөрөл татгалзахад апп унахгүй, «Тохиргоо нээх» ажиллана
- [ ] Бүртгэл устгах урсгал
- [ ] Universal Link: Notes апп-д `https://digitalcard.mn/c/saraa-g` дарахад апп нээгдэнэ
- [ ] TestFlight-д дотоод тестер суулгасан
- [ ] Android build (Prompt 02) эвдрээгүй: `npm run build:apk`
