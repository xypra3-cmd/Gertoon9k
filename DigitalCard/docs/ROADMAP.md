# Эцсийн бүтээгдэхүүн хүртэлх төлөвлөгөө

Төлөв: ✅ хийгдсэн · 🔜 дараагийн · 🧭 судалгаа/шийдвэр хэрэгтэй · 👤 таны мэдээлэл/үйлдэл хэрэгтэй

## 0. Одоо байгаа (2026-10)

✅ Вэб (React), Android + iOS (Expo, нэг код) — монгол хэл үндсэн, ижил дизайн, анимаци
✅ 10 загвар, QR, .vcf, хэвлэх PDF, 2 талын солилцоо, CRM, follow-up, статистик, Team, QPay (вэб), 2FA, AI туслах (чатботгүй)
✅ **Картын 3D эргэлт** (вэб: QR тал, утас: QR ↔ карт, шударч эргүүлнэ)
✅ **Утас ойртуулж солилцох** (bump + 6 оронтой код) — QR-гүйгээр хоёр тал зэрэг хадгална
✅ 1k–5k хэрэглэгчийн ачааллын тест (500 зэрэг, p95 ≤ 13 ms), индекс, цэвэрлэгээ
✅ **Passkey**, **Apple/Google Wallet**, **widget** (iOS + Android), **Live Activity** (эвент), **NFC** бичих/унших, **офлайн AI скан**, PWA
✅ **e-barimt** (НӨАТ баримт) төлбөр бүрт, PDPL-д нийцсэн нууцлалын бодлого ба зөвшөөрөл, WCAG 2.2 AA
✅ Стек: React 19 + Compiler, Vite 8, Tailwind 4, Expo 57 / RN 0.86, TypeScript 7 (TECH_STACK.md)
✅ 170 pgTAP + 24 function + 39 API + 20 E2E + 70 unit тест, STORE-01
✅ Аудит: SECURITY_AUDIT.md (2026-10-06) + системийн бүрэн аудит AUDIT_2026-10.md + зах зээлийн судалгаа MARKET_RESEARCH_2026.md

## 1. Launch (4–6 долоо хоног)

| # | Ажил | Хэн |
|---|---|---|
| 1 | Нэр шийдэх (NAMING.md: Temdeg / Kartaa), домэйн .mn + .com бүртгүүлэх | 👤 |
| 2 | Компани/ХХК, данс, QPay merchant гэрээ (production түлхүүр) | 👤 |
| 3 | Apple Developer ($99) + Google Play ($25) бүртгэл, D-U-N-S дугаар (Apple байгууллагад) | 👤 |
| 4 | Supabase Pro төсөл, Netlify, Resend домэйн баталгаажуулалт, Turnstile, Sentry (AUDIT OPS-01) | 🔜 (заавар бэлэн: README, DEPLOY) |
| 5 | Нэрийг кодонд солих (i18n, app.config, bundle id) | 🔜 нэр шийдэгдсэний дараа |
| 6 | EAS build → TestFlight + Play Internal testing; 20 beta хэрэглэгч | 🔜 |
| 7 | Нууцлалын бодлого, үйлчилгээний нөхцөл (хуульчаар хянуулах) | 👤 + 🔜 загвар бэлэн |
| 8 | Staging дээр k6 (load/app-users.js) давтах | 🔜 |
| 9 | QPay merchant дээр **e-barimt** идэвхжүүлж бодит гүйлгээгээр турших | 👤 + 🔜 |
| 10 | Apple Pass Type ID сертификат, Google Wallet issuer, App Group, Team ID (TECH_STACK.md §Идэвхжүүлэх) | 👤 |
| 11 | EAS development build-ээр passkey, Wallet, widget, Live Activity, NFC, OCR-ийг утсан дээр турших; Google Wallet Монголд ажиллах эсэх | 🔜 |

## 2. Шинэлэг боломжууд (21-р зууны) — эрэмбээр

| Боломж | Яагаад | Техник | Төлөв |
|---|---|---|---|
| **NFC наалт/карт бичих** | Утсаа наалтанд хүргэхэд карт нээгдэнэ (iPhone, Android апп суулгаагүй ч) — орлогын эх үүсвэр (30–45k₮; nfc.mn: 35–65k₮) | `react-native-nfc-manager`, NDEF URI бичих/унших | ✅ хийгдсэн · дараа нь: наалт борлуулах түнш |
| **Apple/Google Wallet карт** | Wallet-оос QR харуулна, lock screen-д | `wallet-pass` Edge Function (.pkpass PKCS#7 + Google JWT) | ✅ хийгдсэн · 👤 сертификат |
| **Bluetooth ойрын хайлт** (BLE) | Апп нээлттэй 2 утас 1–3 м-т бие биеэ «Ойролцоох хүмүүс» жагсаалтад харна — bump-гүй | BLE advertise (Android peripheral, iOS foreground) + түр токен (5 мин); `react-native-ble-plx` + native module; dev build | 🧭 |
| **Эвент горим** | Асаахад бүх шинэ харилцагч эвентээр тэмдэглэгдэнэ | 0013 trigger + RPC, вэб + апп | ✅ хийгдсэн · дараа нь: зохион байгуулагчийн lead тайлан |
| **Офлайн QR** | Интернэтгүй газар контактаа vCard QR-аар өгөх | `buildCompactVCard` | ✅ хийгдсэн |
| **AI уулзалтын тойм** | Өдрийн төгсгөлд «өнөөдөр 6 хүнтэй танилцлаа, 2-т follow-up» + ноорог | одоогийн `ai-assist` + cron | 🔜 |
| **Дуу хоолойн тэмдэглэл** | Уулзсаны дараа 10 секунд ярихад тэмдэглэл + tag + follow-up | Утсан дээр speech-to-text → `ai-assist note` | 🧭 |
| **Widget / Lock screen** | Нүүр дэлгэцээс 1 товшоод QR | iOS WidgetKit + Live Activity, Android App Widget | ✅ хийгдсэн |
| **Passkey** | Нууц үггүй, фишингээс хамгаалсан нэвтрэлт | Supabase WebAuthn + react-native-passkey | ✅ хийгдсэн |
| **«Messenger-ээр илгээх»** | Facebook 88.5%, Messenger 80% (MARKET_RESEARCH §8) | Share dialog / m.me | 🔜 |
| **Google Contacts / Sheets sync** | Монголын ЖДҮ HubSpot-оос илүү ашигладаг ✱ | OAuth + Edge Function | 🔜 |
| **SSO (Google Workspace / Entra)** | Банк, том компанийн Team гэрээ | Supabase SAML/OIDC | 🧭 |
| **Карт дээр видео/танилцуулга** | 15 сек видео | Storage + transcoding (Mux/Cloudflare Stream) — зардал | 🧭 |
| **HubSpot / Google Contacts sync** | Team-д | OAuth + webhook | 🔜 Enterprise |

### Ойртуулах технологийн харьцуулалт (яагаад bump-аас эхэлсэн бэ)

| Технологи | Хоёр утас шууд солилцох уу? | Хязгаар |
|---|---|---|
| NFC P2P (Android Beam) | ❌ | Android 10-аас хасагдсан; iPhone NFC-ээр «tag» дуурайж чадахгүй |
| NFC наалт/карт | ✅ (утас → наалт) | Нэг чиглэлтэй; наалт худалдаж авна — **бизнесийн боломж** |
| Bluetooth LE | ✅ | iPhone background-д advertise хязгаартай; native код, dev build |
| Хэт авиа (ultrasonic) | ✅ | Чимээтэй эвентэд найдваргүй, микрофон зөвшөөрөл |
| Инфраред | ❌ | Орчин үеийн утсанд IR дамжуулагч бараг байхгүй |
| UWB (AirDrop/NameDrop) | ✅ зөвхөн Apple↔Apple | Гуравдагч апп-д нээлттэй биш |
| **Bump (акселерометр + ойролцоо бүс + сервер)** ✅ хийгдсэн | ✅ iPhone ↔ Android | Интернэт хэрэгтэй; олон хүн зэрэг → «ambiguous», код руу шилжинэ |
| **6 оронтой код** ✅ хийгдсэн | ✅ | Байршилгүй ажиллана |

## 3. Өсөлт (launch + 3 сар)

MARKETING_PLAN.md-ийн 90 хоногийн төлөвлөгөө: B2B pilot, хэвлэлийн газрын түншлэл, урилга, эвент. Хэмжүүр: activation ≥ 60 %, Free→Paid 3–5 %, annual mix ≥ 50 %.

## 4. Таны хариулах асуултууд (👤)

1. **Нэр:** Temdeg эсвэл Kartaa — аль нь? (эсвэл өөр санаа)
2. **Компани:** ХХК бүртгэлтэй юу? QPay merchant гэрээ хийх банк аль вэ?
3. **Store:** Apple/Google хөгжүүлэгчийн бүртгэл хувь хүн үү, байгууллага уу?
4. **Сервер:** Эхний жил Supabase Cloud (Сингапур) хангалттай юу, эсвэл «өгөгдөл Монголд» гэсэн гэрээт харилцагч байна уу?
5. **Төсөв:** Сарын маркетингийн төсөв (төлөвлөгөөнд 2.05 сая₮)?
6. **NFC:** Наалт/карт нийлүүлэгч (nfc.mn гэх мэт)-тэй хамтрах уу, өөрсдөө импортлох уу?
7. **Эхний B2B харилцагч:** Даатгал/банк/үл хөдлөхийн аль байгууллагатай pilot хийх боломжтой вэ?
