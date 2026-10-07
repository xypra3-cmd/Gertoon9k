# Монгол ба дэлхийн зах зээлийн харьцуулсан судалгаа (2026-10)

> Хамрах хүрээ: дижитал нэрийн хуудас + уулзалтын CRM. Монголын суурь үзүүлэлт, дэлхийн зах зээл, өрсөлдөгчид (гадаад, дотоод), үнэ, боломж, технологи, хууль эрх зүй, төлбөрийн экосистем, SWOT, стратегийн зөвлөмж.
> Арга зүй: нийтэд нээлттэй эх сурвалж (DataReportal, StatCounter, NapoleonCat, ҮСХ, PwC Mongolia, өрсөлдөгчдийн вэб/блог). Дүнг 2026-10-07-нд шалгав. ✱ = тооцоолсон эсвэл шууд баталгаажуулж чадаагүй утга.
> Ханш: 1 USD ≈ **3,575₮** ✱ (ҮСХ-ны дундаж цалин 2,877.8 мянган ₮ ≈ $805 гэсэн харьцаанаас).

## 1. Гол дүгнэлт (1 минутад)

1. **Зах зээл бэлэн:** интернэт хэрэглэгч 83%, Facebook 88.5%, Messenger 80%, ухаалаг утасны iOS эзлэх хувь 44.5% (дэлхийн дунджаас өндөр). Apple Pay 2024 оноос Монголд ажиллаж байна. QPay 200,000+ дэлгүүрт хүрсэн — QR-ыг бүгд мэддэг.
2. **Дотоодын өрсөлдөөн сул:** дотоодод NFC/QR **физик карт** зарагчид (nfc.mn: модон 35,000₮, метал 65,000₮), QR цэс + нэрийн хуудас (QRMenu.mn: хувь хүн 19,900₮/жил), карт + Telegram дэлгүүр + цаг захиалга (Tap.mn: 19,900–39,900₮/сар) байна. Монгол хэлтэй, QPay-тэй, **CRM + follow-up + AI + Wallet + офлайн** бүхий цогц SaaS олдсонгүй.
3. **Үнэ:** манай Pro (9,900₮/сар) нь Blinq-ээс 3.6×, Popl-оос 5.4× хямд, дундаж цалингийн **0.34%** (Blinq 1.24%). Жилийн 79,000₮ нь дотоодын QR үйлчилгээний (199,000₮/жил) 40%.
4. **Технологи:** passkey, Wallet pass, widget, Live Activity, төхөөрөмж дээрх OCR, PWA, React Compiler зэргээр дэлхийн тэргүүлэгчидтэй **ижил буюу түрүүлсэн**. Дутуу нь томоохон байгууллагад зориулсан хэсэг: CRM интеграц (HubSpot/Salesforce), SSO/SCIM, SOC 2 гэрчилгээ.
5. **Хууль:** Монголын Хувийн мэдээлэл хамгаалах хууль (2022.05.01-ээс мөрдөгдөж буй) гадаадад мэдээлэл дамжуулахад **тодорхой зөвшөөрөл** шаарддаг. Бүх борлуулалтад **e-barimt** (НӨАТ 10%) заавал. Энэ audit-аар хоёуланг нь хэрэгжүүлсэн (§7).
6. **Эрсдэл:** Apple NameDrop болон Android-ын ижил төстэй функц энгийн «контакт солилцох» хэрэгцээг үнэгүй хангах болж байна. Иймд **CRM + follow-up + аналитик + баг** нь бидний гол ялгаа байх ёстой. Google Wallet-ийн pass Монголд ажиллах эсэх баталгаагүй (§6.3).

## 2. Монгол зах зээлийн суурь үзүүлэлт

| Үзүүлэлт | Утга | Эх сурвалж |
|---|---|---|
| Интернэт хэрэглэгч | 2.93 сая (83.0%), 2025 оны эцэс | DataReportal Digital 2026 |
| Сошиал хэрэглэгч | 2.70 сая (76.5%) | DataReportal |
| Facebook / Messenger | 3.04 сая (88.5%) / 2.76 сая (80.3%), 2026-09; хамгийн том нас 25–34 | NapoleonCat |
| Гар утасны холболт | 4.97 сая (141%), 92% нь 3G/4G/5G | DataReportal / GSMA |
| Утасны OS | Android 55.5%, **iOS 44.5%** (2026-08) | StatCounter |
| Апп платформ | Facebook 45.9%, **PWA 42.4%**, Google Play 29.7% | wmtips |
| Дундаж цалин | 2,877.8 мянган ₮/сар (2025 Q4); хөдөлмөрийн доод хэмжээ 792,000₮ | ҮСХ (TradingEconomics-оор) |
| Аж ахуйн нэгж | 127,000 бүртгэлтэй, **≈63,000 идэвхтэй**, үүний 84% нь ЖДҮ ✱ | GoGo.mn (ҮСХ) |
| QR төлбөр | QPay: 200,000+ дэлгүүр, 12 банк, 7 e-wallet; SocialPay гадаадад | IBS Intelligence, Голомт банк |
| Apple Pay | 2024 оноос (TDB, Голомт) | ikon.mn |
| Хуулийн орчин | Хувийн мэдээлэл хамгаалах, Кибер аюулгүй байдал, Цахим гарын үсэг (2022.05.01) | PwC Mongolia |

**Дүгнэлт:** iOS-ийн эзлэх хувь өндөр (44.5%) тул Apple Wallet, widget, passkey-д гаргасан хөрөнгө оруулалт Монголд дэлхийн дунджаас илүү үр өгнө. PWA-ийн 42.4% нь вэб апп-ын (бидний PWA) хэрэглээг баталж байна. Facebook/Messenger бол хуваалцах №1 суваг.

## 3. Дэлхийн зах зээл ба чиг хандлага

| Үзүүлэлт | Утга |
|---|---|
| Зах зээлийн хэмжээ 2026 | $217–239 сая (Mordor 8.9% / Research Nester 12.2% CAGR) |
| 2031–2035 | $332 сая (2031) – $680 сая+ (2035) |
| Байгууллагын хэрэглээ | 37% (2020 онд 16%); технологийн компаниуд 72% |

Чиг хандлага:
1. **Карт → lead capture платформ.** Popl өөрийгөө «in-person GTM platform» гэж нэрлэж, badge скан, AI баяжуулалт, CRM sync-ийг гол болгосон. Linq 2025 онд картын бизнесээ хааж AI мессеж рүү шилжсэн. Зөвхөн «карт» зарах загвар хумигдаж байна.
2. **AI:** тэмдэглэл бичигч (Blinq), lead баяжуулалт (Popl), карт скан.
3. **Байгууллагын шаардлага:** SSO (Okta/Entra/Google), SCIM, SOC 2 Type II, GDPR — томоохон гэрээнд заавал.
4. **Платформын аюул:** iOS NameDrop (2023), WWDC 2026-д хүргэж хуваалцах өргөжсөн; Google ч ижил функц бүтээж байна. Энгийн солилцоо үнэгүй болж, аналитик/CRM/баг нь ялгаа болно.
5. **Олон суваг:** QR, NFC, Wallet, имэйл гарын үсэг, видео дуудлагын арын зураг, widget.

## 4. Өрсөлдөгчдийн харьцуулалт

### 4.1 Үнэ (₮, 1 USD ≈ 3,575₮)

| Бүтээгдэхүүн | Хувь хүн / сар | Хувь хүн / жил | Баг (хүн/сар) | Дундаж цалингийн % (сар) |
|---|---|---|---|---|
| **Digital Card Pro** | **9,900₮** | **79,000₮** | **5,000₮** (min 5) | **0.34%** |
| Blinq Premium | $9.99 ≈ 35,700₮ | $87.96 ≈ 314,500₮ | $4.99 ≈ 17,800₮ (min 5) | 1.24% |
| HiHello | $8 ≈ 28,600₮ | $72 ≈ 257,400₮ | $5 ≈ 17,900₮ | 0.99% |
| Popl | $14.99 ≈ 53,600₮ | $143.88 ≈ 514,400₮ | — | 1.86% |
| Linq | — (2025 онд картын бизнесээ хаасан) | | $12 ≈ 42,900₮ | — |
| QRMenu.mn (дотоод, QR цэс + нэрийн хуудас) | — | 19,900₮ (хувь хүн, 1 карт) · 59,000₮ (10 хүн) · 199,000₮ (Pro) | 299,000₮/жил (Business) | — |
| Tap.mn (дотоод, карт + Telegram дэлгүүр + захиалга) | Silver 19,900₮ · Gold 39,900₮ (10 карт) | — | — | 0.69% |
| nfc.mn (дотоод, физик карт) | нэг удаа: модон 35,000₮, метал 65,000₮, бэлгийн карт 10,000₮ | | | |

### 4.2 Боломжууд

Тэмдэглэгээ: ✔ байгаа · ✖ байхгүй · ? нийтэд мэдээлэл олдоогүй

| Боломж | **Digital Card** | Blinq | Popl | HiHello | nfc.mn | Tap.mn |
|---|---|---|---|---|---|---|
| Монгол хэл, ₮, QPay | ✔ | ✖ | ✖ | ✖ | ✔ | ✔ |
| e-barimt (НӨАТ баримт) | ✔ | ✖ | ✖ | ✖ | ? | ? |
| Үнэгүй багц | ✔ (1 карт, 10 харилцагч) | ✔ | ✔ | ✔ | ✖ | ✔ (Bronze) |
| QR + нийтийн линк | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| NFC физик карт зарах | ✖ (NFC наалтад бичих ✔) | ✔ | ✔ | ✖ | ✔ | ? |
| Apple / Google Wallet | ✔ / ✔ | ✔ | ✔ | ✔ | ? | ✖ |
| Хоёр талын солилцоо (зочин мэдээллээ үлдээх) | ✔ | ✔ | ✔ | ✔ | ? | ✔ (contact form) |
| CRM: тэмдэглэл, шошго, follow-up сануулга | ✔ | ✔ | ✔ | хэсэгчлэн | ✖ | ✖ |
| AI карт скан (сервер) / офлайн OCR | ✔ / ✔ | ✔ / ? | ✔ / ? | ✔ / ? | ✖ | ✖ |
| AI тэмдэглэл, follow-up ноорог | ✔ | ✔ | ✔ | ? | ✖ | ✖ |
| Эвент горим (эвентээр бүлэглэх) + Live Activity | ✔ | ? | ✔ (badge скан) | ? | ✖ | ✖ |
| Утас ойртуулж солилцох (bump) | ✔ | ? | ? | ? | ✖ | ✖ |
| Офлайн vCard QR | ✔ | ? | ? | ? | ✖ | ✖ |
| Нүүр дэлгэцийн widget | ✔ (iOS + Android) | ✔ | ✔ | ✔ | ✖ | ✖ |
| Passkey нэвтрэлт | ✔ | ? | ? | ? | ✖ | ✖ |
| Имэйл гарын үсэг | ✔ | ✔ | ✔ | ✔ | ? | ? |
| PWA (суулгадаг вэб апп) | ✔ | ? | ? | ? | ✖ | ✖ |
| CRM интеграц (HubSpot, Salesforce) | ✖ (CSV, .vcf, .ics) | ✔ | ✔ | ✔ | ✖ | ✖ |
| SSO / SCIM (Okta, Entra, Google) | ✖ | ✔ | ✔ | ✔ (Enterprise) | ✖ | ✖ |
| SOC 2 гэрчилгээ | ✖ | ✔ | ✔ | ✔ | ✖ | ✖ |

Эх сурвалж: Blinq-ийн үнийн харьцуулалт ба блог, Popl (llms.popl.co), V1CE/Wave-ийн харьцуулалт, nfc.mn (хайлтын үр дүн), isee.mn; QRMenu.mn, Tap.mn — 2026-10-04-нд сайтаас шалгасан (`PROJECT_OVERVIEW.md` §4.1). Ажиллагааг өрсөлдөгчдийн нийтлэлээс авсан тул «?»-ийг жинхэнэ шалгалтаар батлах хэрэгтэй.

### 4.3 Дүгнэлт
- Нийтийн хайлтаар Монголд манай хувилбартай (CRM + follow-up + AI + Wallet) шууд өрсөлдөх програм хангамж олдсонгүй. Дотоодын тоглогчид физик карт, QR хуудас, contact form, Telegram дэлгүүр санал болгодог. Tap.mn-ийн 19,900₮/сар үнэ нь Монголд сард ~20k₮ төлөх хэрэглэгч байгааг харуулж байна → манай Pro 9,900₮ хямд, Gold-ийн түвшинд үнэ өсгөх зай бий.
- Гадаадын тоглогчид Монголын төлбөр (QPay), татвар (e-barimt), хэл, хуулийн шаардлагыг хангахгүй.
- Олон улсын томоохон гэрээнд бидэнд дутаж буй зүйлс: CRM интеграц, SSO, SOC 2.

## 5. Технологийн харьцуулалт

| Чиглэл | Digital Card | Салбарын түвшин (2026) | Байр суурь |
|---|---|---|---|
| Нэвтрэлт | Passkey (WebAuthn, autofill), TOTP 2FA | Ихэнх нь имэйл/нууц үг + SSO | **Түрүүлсэн** (хэрэглэгчид); SSO-оор хоцорсон |
| Mobile | Expo 57, RN 0.86 (шинэ архитектур), React Compiler, Reanimated 4 | Native эсвэл RN/Flutter | Ижил |
| Вэб | React 19.3 + Compiler, Vite 8 (Rolldown), Tailwind 4, View Transitions, PWA | SPA/Next.js | **Түрүүлсэн** |
| Өгөгдөл ба эрх | Postgres 17, бүх хүснэгтэд RLS, 170 pgTAP тест | Ихэвчлэн апп кодонд эрх шалгадаг | **Түрүүлсэн** (баталгаажуулалт) |
| AI | Claude structured output + төхөөрөмж дээрх OCR | Сервер AI, lead баяжуулалт | Ижил (баяжуулалт ✖) |
| Төхөөрөмжийн интеграц | Wallet, widget, Live Activity, NFC, bump | Wallet, widget, NFC | **Түрүүлсэн** |
| Нууцлал | IP хадгалахгүй, өдөр бүр солигддог salt-тай hash, зөвшөөрөлтэй солилцоо | GDPR, SOC 2 | Техникийн түвшин ижил, **гэрчилгээ ✖** |
| Хүртээмж | WCAG 2.2 AA (axe: 10 хуудас × light/dark = 0 зөрчил) | Ихэвчлэн хэсэгчлэн | **Түрүүлсэн** |

## 6. Хууль эрх зүй ба төлбөр

### 6.1 Монголын хууль ба GDPR

| Шаардлага | Монгол (PDPL 2022) | ЕХ (GDPR) | Digital Card |
|---|---|---|---|
| Зөвшөөрөл | Бичгээр/цахимаар; зорилго, хариуцагч, мэдээллийн жагсаалт, хугацаа, дамжуулах нөхцөлийг мэдэгдэх | Хууль ёсны 6 үндэслэлийн нэг | ✔ Бүртгэл ба зочны солилцоонд тусдаа зөвшөөрөл; нууцлалын бодлого бүх зүйлийг жагсаана (2026-10 шинэчлэл) |
| Гадаадад дамжуулах | Хууль, олон улсын гэрээ, **эсвэл субьектийн зөвшөөрлөөр** | Adequacy / SCC | ✔ Сингапур (Supabase), АНУ (Anthropic, Resend)-ыг нэрлэж, бүртгэлд тодорхой зөвшөөрөл авна |
| Мэдрэг / биометр | Тусгай журам (2025); серверийг Монголд байршуулах техникийн шаардлага ✱ | Article 9 | Мэдрэг мэдээлэл цуглуулдаггүй. Байршлыг ≈1 км бүсээр, 10 минут л хадгална |
| Аюулгүй байдлын үнэлгээ, зөрчлийн бүртгэл | Заавал | Art. 32–34 (72 цаг) | ✔ `docs/INCIDENT_RESPONSE.md` (энэ audit-аар нэмсэн) |
| Торгууль | 500,000 – 20,000,000₮ | Эргэлтийн 4% хүртэл | — |
| Хяналт | Хүний эрхийн үндэсний комисс; Цахим хөгжлийн яам | DPA | Гомдлын суваг нууцлалын бодлогод бий |

### 6.2 Татвар ба төлбөр
- **e-barimt:** 2016 оноос B2C/B2B бүх борлуулалтад заавал, НӨАТ 10%. ✔ QPay `/v2/ebarimt_v3/create`-ээр төлбөр бүрт автоматаар олгоно; амжилтгүй бол 5 минут тутам дахин оролдоно. Хэрэглэгч Billing хуудаснаас баримтын QR-ыг харна. Хэрэгжүүлэхийн өмнө QPay merchant дээр e-barimt-ийн эрх идэвхжүүлэх шаардлагатай.
- **App Store / Google Play:** апп дотор үнэ, төлбөр, вэб төлбөр рүү холбоос байхгүй (reader/multiplatform загвар) — STORE-01 тест хамгаална. Ингэснээр 15–30%-ийн шимтгэлээс зайлсхийнэ.

### 6.3 Платформын бэлэн байдал
- **Apple Wallet:** pass нь улсаас хамаарахгүй ажилладаг. Apple Pay ч Монголд бий.
- **Google Wallet:** Монголд төлбөрийн хувьд жагсаагдсан гэж хайлтын үр дүнд гарсан ч generic pass-ийн бүрэн дэмжлэгийг Google-ийн жагсаалтаар баталж чадаагүй ✱. Launch-ийн өмнө Монгол бүртгэлтэй Android утсаар туршина. Ажиллахгүй бол Android-д «Wallet» товчийг нууж, PWA/widget-ийг санал болгоно.

## 7. SWOT

| Давуу тал | Сул тал |
|---|---|
| Монгол хэл + QPay + e-barimt + PDPL — гадаадынхан хангахгүй | Брэнд шинэ, хэрэглэгчийн суурь 0 |
| Дэлхийн түвшний технологи (passkey, Wallet, widget, офлайн) | CRM интеграц, SSO, SOC 2 байхгүй |
| Хамгийн хямд (цалингийн 0.34%), жилийн төлбөр | Физик NFC карт зардаггүй |
| Эрх зөвхөн DB-д, 170 + 24 + 39 + 20 автомат тест | Native build хараахан төхөөрөмж дээр туршигдаагүй |

| Боломж | Аюул |
|---|---|
| ≈63,000 идэвхтэй аж ахуйн нэгж (84% ЖДҮ); даатгал, банк, үл хөдлөхийн борлуулалтын баг | NameDrop / Android-ын ижил функц энгийн солилцоог үнэгүй болгоно |
| Messenger 80% — вирал хуваалцах | Дотоодын NFC карт зарагчид SaaS руу шилжиж магадгүй |
| Эвент, үзэсгэлэн (Startup Mongolia гэх мэт) — эвент горим | Валютын ханш (Anthropic, Supabase-ийн зардал $-оор) |
| NFC карт, наалтыг хамтрагчтай зарах (35–65k₮) | Google Wallet-ийн дэмжлэг тодорхойгүй |

## 8. Стратегийн зөвлөмж

| # | Зөвлөмж | Яагаад | Хүчин чармайлт |
|---|---|---|---|
| P0 | Хуульчаар нууцлалын бодлого, нөхцөлийг хянуулж, мэдээлэл хариуцагчийн мэдээллийг бөглөх | PDPL-ийн торгууль, итгэл | Бага |
| P0 | QPay merchant дээр e-barimt идэвхжүүлж, бодит гүйлгээгээр турших | Татварын шаардлага | Бага |
| P0 | EAS build → iPhone/Android дээр passkey, Wallet, widget, NFC, OCR-ийг турших | Native хэсэг энд compile хийгдээгүй | Дунд |
| P1 | **«Messenger-ээр илгээх»** товч (нийтийн карт ба апп дотор) | Facebook 88.5%, Messenger 80% | Бага |
| P1 | NFC наалт/карт: хэвлэлийн газартай хамтарч 30–45k₮-өөр, апп дотроос «NFC-д бичих» | nfc.mn-ийн жишиг үнэ; физик бүтээгдэхүүн = нэмэлт орлого, вирал | Дунд |
| P1 | B2B борлуулалт: даатгал, банк, үл хөдлөх (Team 5,000₮/хүн + эвент горим) | Борлуулалтын баг их, follow-up чухал | Дунд |
| P2 | Google Contacts / Google Sheets синк (HubSpot-оос өмнө) | Монголын ЖДҮ HubSpot бараг ашигладаггүй ✱ | Дунд |
| P2 | Google Workspace / Entra SSO (Team Enterprise) | Банк, том компани | Дунд |
| P3 | Үнэ: 9,900₮-ийг launch-д хадгалж, 1,000 төлбөртэй хэрэглэгчийн дараа 12,900–14,900₮-ийг A/B турших | Гадаадынхнаас 2.4–3.6× хямд хэвээр | Бага |
| P3 | Монгол дахь backup (COSTS.md хувилбар C) | Мэдрэг мэдээллийн журам өргөжвөл бэлэн байх | Бага |

## 9. Хэмжих үзүүлэлт (KPI)

| KPI | Зорилт (эхний 6 сар) ✱ |
|---|---|
| Бүртгүүлснээс 60 секундэд карт нийтлэх | ≥ 60% |
| Free → Pro шилжилт | ≥ 4% |
| 1 картаас сард ирэх солилцоо | ≥ 3 |
| Follow-up-ыг хугацаандаа хийх | ≥ 50% |
| Team гэрээ (≥ 5 хүн) | 20 байгууллага |

## Эх сурвалж
- [DataReportal — Digital 2026: Mongolia](https://datareportal.com/reports/digital-2026-mongolia)
- [StatCounter — Mobile OS market share Mongolia](https://gs.statcounter.com/os-market-share/mobile/mongolia)
- [NapoleonCat — Social media users in Mongolia 2026](https://stats.napoleoncat.com/social-media-users-in-mongolia/2026/), [Messenger users](https://napoleoncat.com/stats/messenger-users-in-mongolia/)
- [wmtips — Apps in Mongolia](https://www.wmtips.com/technologies/apps/country/mn)
- [TradingEconomics — Mongolia wages](https://tradingeconomics.com/mongolia/wages), [AKIpress — average salary](https://m.akipress.com/news:749796:Average_salary_in_Mongolia_reaches_2_million_tugriks)
- [GoGo.mn — registered vs active entities](https://mongolia.gogo.mn/r/54v6y)
- [IBS Intelligence — QPay QR network](https://ibsintelligence.com/ibsi-news/gln-international-sendmn-and-qpay-expand-qr-payment-network-to-mongolia), [Golomt — SocialPay](https://www.golomtbank.com/en/news/8711)
- [ikon.mn — Apple Pay Монголд](https://ikon.mn/n/3av6)
- [Wave — Digital business card statistics 2026](https://wavecnct.com/digital-business-card-statistics)
- [Blinq — Comparing costs 2026](https://blinq.me/blog/comparing-costs-of-digital-business-card-platforms), [Blinq — Best digital business cards](https://blinq.me/blog/best-digital-business-cards)
- [Popl — digital business cards](https://llms.popl.co/digital-business-cards), [Popl — in-person GTM](https://llms.popl.co/popl-in-person-gtm-platform)
- [Wave — Best Linq alternative (Linq pivot)](https://wavecnct.com/blogs/best-linq-alternative), [V1CE — Blinq alternatives](https://v1ce.co/blog/blinq-alternatives)
- [Mobilo — Tap to share (NameDrop, 2026)](https://www.mobilocard.com/post/tap-to-share), [ProPakistani — Google NameDrop for Android](https://propakistani.pk/2025/11/15/google-is-building-its-own-version-of-apples-namedrop-for-android/amp/)
- [nfc.mn — Ухаалаг нэрийн хуудас](https://nfc.mn/), [isee.mn — дижитал нэрийн хуудас](https://isee.mn/n/22410)
- [PwC Mongolia — PDPL](https://www.pwc.com/mn/en/tax_alerts/tax_alert_02_2022.html), [PwC — sensitive/biometric data (2025)](https://www.pwc.com/mn/en/services/legal_mn/legal-articles/legal_insights_feb_24_2025.html), [Clym — PDPL](https://www.clym.io/regulations/law-on-personal-data-protection-mongolia), [DLA Piper — Mongolia](https://www.dlapiperdataprotection.com/?c=MN&t=law), [Legal500 — Cyber Security law](https://www.legal500.com/intelligence/mongolia/technology/law-on-cyber-security)
- [KPMG — VAT e-barimt manual](https://assets.kpmg.com/content/dam/kpmg/mn/pdf/2023/vat-e-barimt-manual-2022.pdf), [e-invoice.app — Mongolia](https://www.e-invoice.app/country/MN), [qpay-go (ebarimt_v3)](https://pkg.go.dev/github.com/techpartners-asia/qpay-go/qpay_v2), [QPay developer](https://developer.qpay.mn/)
- [Google — Wallet supported countries](https://support.google.com/wallet/answer/12060037), [Google Wallet developer release notes](https://developers.google.com/wallet/docs/release-notes)
