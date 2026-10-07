# Харьцуулсан судалгаа — албан ёсны эх сурвалжтай (2026-10)

> **Зорилго:** Digital Card-ыг (1) дэлхийн өрсөлдөгчид, (2) Монголын өрсөлдөгчид, (3) Монголын эдийн засаг, татвар, хууль, (4) Apple/Google-ийн дүрэм, (5) дэд бүтцийн нийлүүлэгчидтэй **нэг бүрчлэн** харьцуулж, мөр бүрт **албан ёсны холбоос** өгөх.
> **Шалгасан огноо:** 2026-10-07. Үнэ, дүрэм өөрчлөгддөг — гэрээ, үнийн шийдвэр гаргахын өмнө холбоосыг дахин нээж шалга.
> **Ханш:** 1 USD = **3,595.56₮** (Монголбанк, 2026-09-25) → доорх тооцоонд **3,596₮**. 1 GBP ≈ 4,800₮ ✱.
> **Тэмдэглэгээ:** ✔ = албан ёсны хуудаснаас шалгасан · ✱ = тооцоолсон / гуравдагч эх сурвалж / баталгаажуулах шаардлагатай.
> Товч хувилбар ба SWOT: [`MARKET_RESEARCH_2026.md`](MARKET_RESEARCH_2026.md). Санхүүгийн загвар: [`BUSINESS_PLAN.md`](BUSINESS_PLAN.md).

---

## 1. Гол дүгнэлт

| # | Дүгнэлт | Нотолгоо (доорх хэсэг) |
|---|---|---|
| 1 | Манай Pro (9,900₮/сар) дэлхийн өрсөлдөгчдөөс **2.2–3.6 дахин хямд**, гэхдээ дотоодын хамгийн хямд QR үйлчилгээнээс үнэтэй. Үнийн хувьд «дэлхийн чанар, Монгол үнэ» байр суурь зөв. | §2, §3 |
| 2 | Дэлхийн өрсөлдөгчдийн **баг/байгууллагын үнэ** ($4–6.99/хүн/сар) манай Team-ээс (5,000₮ ≈ $1.39) **3–5 дахин** өндөр. Team-ийн үнийг 1,000 төлбөртэй хэрэглэгчийн дараа өсгөх зай бий. | §2.2 |
| 3 | Монголд хувь хүний худалдан авах чадвар: дундаж цалингийн **0.34%** (Pro) vs Blinq **1.25%**. Монголд гадаадын апп-ыг $-оор төлөх саад (карт, ханш) ч бий → QPay бол давуу тал. | §4 |
| 4 | Татвар: эхний жил ААНОАТ **1%** (≤300 сая₮), НӨАТ **10%**, e-barimt заавал. Энэ нь ашгийн загварт хамгийн их нөлөөтэй (НӨАТ = борлуулалтын 9.1%). | §5 |
| 5 | Апп дэлгүүрүүд: Apple 3.1.3(f) ба Google Play-ийн «consumption-only» дүрмээр апп дотор төлбөргүй байх нь **15–30%-ийн шимтгэлээс** чөлөөлнө. Манай STORE-01 тест үүнийг хамгаална. | §6 |
| 6 | Дэд бүтэц: Supabase Pro $25 + Netlify/Resend free → 1,000 хэрэглэгч хүртэл сард ≈ 0.2 сая₮. Firebase/AWS-тай харьцуулахад SQL + RLS + pgTAP нь эрхийн логикийг DB-д төвлөрүүлэхэд давуу. | §7 |
| 7 | Хувийн мэдээлэл: Supabase (Сингапур), Anthropic, Resend (АНУ) — **гадаадад дамжуулалт**. PDPL-ийн дагуу тодорхой зөвшөөрөл авдаг болгосон (audit 2026-10). | §5.3 |

---

## 2. Дэлхийн өрсөлдөгчид — үнэ (албан ёсны үнийн хуудас)

### 2.1 Хувь хүний багц

| Бүтээгдэхүүн | Багц | USD / сар | ₮ / сар | ₮ / жил | Үнэгүй багц | Албан ёсны холбоос |
|---|---|---|---|---|---|---|
| **Digital Card** | **Pro** | ≈ $2.75 | **9,900₮** | **79,000₮** (−34%) | 1 карт, 10 харилцагч | `plans` хүснэгт (`backend/supabase/seed.sql`) |
| Blinq | Premium | $9.99 (жилээр $7.33) | 35,900₮ | 316,300₮ | ✔ байгаа | ✔ [blinq.me/pricing](https://blinq.me/pricing) |
| HiHello | Professional | $6 (жилээр, $72/жил) | 21,600₮ | 258,900₮ | ✔ байгаа | ✔ [hihello.com/pricing](https://www.hihello.com/pricing) |
| Popl | Pro / Pro+ | $7.99 / $14.99 | 28,700₮ / 53,900₮ | — | ✔ байгаа | ✔ [popl.co/pages/pricing](https://popl.co/pages/pricing) |
| Wave | Pro | $7 ($84/жил) | 25,200₮ | 302,100₮ | ✔ байгаа | ✔ [wavecnct.com](https://wavecnct.com/) |
| V1CE | Free app + физик карт | £0 + карт £60-аас | ≈ 288,000₮ (нэг удаа) ✱ | — | ✔ | ✔ [v1ce.co/pricing](https://v1ce.co/pricing) |
| Mobilo | Licence | $48/хүн/жил + карт $4.99–49.50 | ≈ 14,400₮ | 172,600₮ | — | ✔ [mobilocard.com/pricing-3](https://www.mobilocard.com/pricing-3) |

**Дүгнэлт:** манай Pro нь HiHello (хамгийн хямд гадаад)-оос 2.2×, Blinq-ээс 3.6× хямд. Жилийн 79,000₮ нь Blinq-ийн жилийн үнийн 25%.

### 2.2 Баг / байгууллагын багц

| Бүтээгдэхүүн | Хүн / сар | Доод тоо | ₮ / хүн / сар | Байгууллагын нэмэлт | Холбоос |
|---|---|---|---|---|---|
| **Digital Card Team** | **5,000₮** (жилээр 4,167₮) | 5 | **5,000₮** | Админ самбар, урилга, нэгдсэн брэнд, лого, CSV, статистик | `plans` |
| Blinq Business | $6.99 (жилээр $4.99) | 5 | 17,900–25,100₮ | SSO, CRM sync (Enterprise) | ✔ [blinq.me/pricing](https://blinq.me/pricing) |
| HiHello Business | $5 | 5 | 18,000₮ | Enterprise: SSO, HRIS, үнийн санал | ✔ [hihello.com/pricing](https://www.hihello.com/pricing) |
| Wave Teams | $5 | 3 | 18,000₮ | | ✔ [wavecnct.com](https://wavecnct.com/) |
| Mobilo Teams / Business | $4 / $5 (жилээр) | — | 14,400–18,000₮ | CRM интеграц | ✔ [mobilocard.com/pricing-3](https://www.mobilocard.com/pricing-3) |
| Popl Teams | үнийн санал | — | — | Lead capture, badge scan, CRM | ✔ [popl.co/pages/pricing](https://popl.co/pages/pricing) |
| V1CE Client Capture OS | £49.99 / сар (багаар) | — | ≈ 240,000₮/сар ✱ | Lead capture | ✔ [v1ce.co/pricing](https://v1ce.co/pricing) |

**Дүгнэлт:** манай Team-ийн суудал дэлхийн хамгийн хямд (Mobilo $4)-оос **2.9× хямд**. Монголын B2B (даатгал, банк) худалдан авагчид үнэд мэдрэмтгий тул эхлэлд зөв; гэхдээ SSO/CRM-гүй тул томоохон байгууллагад «Enterprise» шат хэрэгтэй (ROADMAP).

### 2.3 Боломжийн харьцуулалт

✔ байгаа · ✖ байхгүй · ◐ хэсэгчлэн / өндөр багцад · ? нийтэд мэдээлэл олдоогүй

| Боломж | **Digital Card** | Blinq | HiHello | Popl | Wave | Mobilo |
|---|---|---|---|---|---|---|
| Монгол хэл, ₮, QPay, e-barimt | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ |
| QR + линк + .vcf (кирилл зөв) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Apple / Google Wallet pass | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| NFC-д бичих (өөрийн наалт) | ✔ (апп-аар) | ◐ (карт зарна) | ✖ | ✔ (бүтээгдэхүүн) | ✔ | ✔ |
| Харилцагчийн CRM (статус, шошго, follow-up) | ✔ | ◐ | ◐ | ✔ | ◐ | ✔ |
| Хоёр талын солилцоо (зөвшөөрөлтэй) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Нэрийн хуудас скан (OCR) | ✔ төхөөрөмж дээр (ML Kit) | ✔ | ✔ | ✔ (AI) | ? | ✔ |
| AI туслах (био, follow-up захидал) | ✔ квоттой | ✔ (тэмдэглэл) | ? | ✔ (lead баяжуулалт) | ? | ? |
| Эвент горим, Live Activity | ✔ | ✖ | ✖ | ◐ (badge scan) | ✖ | ✖ |
| Widget (iOS + Android) | ✔ | ✔ | ✔ | ? | ? | ? |
| Passkey нэвтрэлт + 2FA | ✔ | ? | ? | ? | ? | ? |
| Офлайн QR (интернэтгүй vCard) | ✔ | ? | ? | ? | ? | ? |
| Хэвлэлийн PDF (нэрийн хуудас) | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ |
| IP хаяг хадгалдаггүй статистик | ✔ | ? | ? | ? | ? | ? |
| SSO / SCIM / SOC 2 | ✖ (ROADMAP) | ✔ Enterprise | ✔ Enterprise | ✔ | ? | ✔ |
| HubSpot / Salesforce sync | ✖ (ROADMAP) | ✔ | ✔ | ✔ | ◐ | ✔ |

Эх сурвалж: дээрх албан ёсны үнийн хуудсууд; «?» нь нийтэд баталгаатай мэдээлэл олдоогүй гэсэн үг (байхгүй гэсэн үг биш).

---

## 3. Монголын өрсөлдөгчид ба орлуулагч

| Нэр | Юу санал болгодог | Үнэ | Манай ялгаа | Холбоос |
|---|---|---|---|---|
| Цаасан нэрийн хуудас | Хэвлэмэл 100 ш | 30–60k₮ ✱ | Шинэчлэгддэг, follow-up, статистик; Pro жилийн үнэ ≈ 1–2 удаагийн хэвлэлт | хэвлэх үйлдвэрүүд ✱ |
| nfc.mn | Физик NFC карт (модон, метал) | 35,000₮ / 65,000₮ (нэг удаа) | SaaS + CRM; NFC наалтыг апп-аараа өөрөө бичнэ | [nfc.mn](https://nfc.mn/) |
| QRMenu.mn | QR цэс + нэрийн хуудас | 19,900₮/жил (1 карт) · 199,000₮/жил (Pro) · 299,000₮/жил (Business) | CRM, AI, Wallet, апп | [qrmenu.mn](https://qrmenu.mn/) ✱ |
| Tap.mn | Карт + Telegram дэлгүүр + цаг захиалга | 19,900–39,900₮/сар | Борлуулалтын CRM, follow-up, эвент | [tap.mn](https://tap.mn/) ✱ |
| Facebook / Messenger профайл | Үнэгүй | 0₮ | Мэргэжлийн карт, .vcf, CRM; Messenger-ээр хуваалцах линк | [facebook.com](https://www.facebook.com/) |
| iPhone NameDrop / Android-ын ижил функц | Утас хооронд контакт | 0₮ | Платформ хооронд ажиллана, CRM, статистик, баг | [support.apple.com](https://support.apple.com/) |

---

## 4. Монголын эдийн засгийн суурь үзүүлэлт

| Үзүүлэлт | Утга | Манайд ямар хамаатай | Албан ёсны / анхдагч эх сурвалж |
|---|---|---|---|
| Ханш | 1 USD = 3,595.56₮ (2026-09-25) | Гадаад үнийг ₮ руу хөрвүүлэх, USD-ээр төлдөг зардал (Supabase, Anthropic, Apple) | ✔ [mongolbank.mn](https://www.mongolbank.mn/) — «Албан ханш» |
| Дундаж цалин | 2,877.8 мянган ₮/сар (2025 Q4) | Pro = цалингийн 0.34% | ✔ [1212.mn](https://www.1212.mn/) (ҮСХ), [tradingeconomics.com/mongolia/wages](https://tradingeconomics.com/mongolia/wages) |
| Хөдөлмөрийн доод хэмжээ | 792,000₮/сар | Ажилтан авбал цалингийн доод хязгаар | [1212.mn](https://www.1212.mn/) / [legalinfo.mn](https://legalinfo.mn/) ✱ |
| Хүн ам | ≈ 3.5 сая | Зах зээлийн дээд хязгаар | ✔ [1212.mn](https://www.1212.mn/) |
| Интернэт / Facebook | 83% / 88.5% | Messenger бол хуваалцах №1 суваг | [datareportal.com — Digital 2026 Mongolia](https://datareportal.com/reports/digital-2026-mongolia), [NapoleonCat](https://stats.napoleoncat.com/social-media-users-in-mongolia/2026/) |
| iOS эзлэх хувь | 44.5% | Apple Wallet, widget, passkey-ийн өгөөж өндөр | [gs.statcounter.com](https://gs.statcounter.com/os-market-share/mobile/mongolia) |
| Идэвхтэй аж ахуйн нэгж | ≈ 63,000 (84% ЖДҮ) ✱ | Team-ийн зах зээл | [1212.mn](https://www.1212.mn/) (ҮСХ — бизнес регистр) |

**Худалдан авах чадварын харьцуулалт (сарын үнэ ÷ дундаж цалин):**

| Бүтээгдэхүүн | ₮/сар | Цалингийн % |
|---|---|---|
| **Digital Card Pro** | 9,900 | **0.34%** |
| HiHello Professional | 21,600 | 0.75% |
| Popl Pro | 28,700 | 1.00% |
| Blinq Premium | 35,900 | 1.25% |
| Tap.mn Gold | 39,900 | 1.39% |

---

## 5. Татвар, хууль (Монгол)

### 5.1 Татвар

| Татвар | Хувь / босго | Бидэнд | Эх сурвалж |
|---|---|---|---|
| НӨАТ | **10%**; жилийн борлуулалт **50 сая₮**-өөс давбал бүртгүүлэх заавал, **10 сая₮**-өөс сайн дураар | Суурь сценари эхний жилдээ 50 сая₮-өөс давна (59.5 сая₮) → эхнээс нь бүртгүүлэхийг зөвлөнө (B2B худалдан авагч НӨАТ-ын баримт хүснэ) | ✔ [PwC Tax Summaries — Mongolia: Other taxes](https://taxsummaries.pwc.com/mongolia/corporate/other-taxes), [mta.mn](https://www.mta.mn/) |
| ААНОАТ | Жилийн орлого **≤ 300 сая₮ → 1%**; 300 сая – 6 тэрбум₮ → 10%; түүнээс дээш 25% | Эхний 1–2 жилд 1% | ✔ [PwC — Taxes on corporate income](https://taxsummaries.pwc.com/mongolia/corporate/taxes-on-corporate-income) |
| ХХОАТ | 10% (орлогын хэмжээгээр 15%, 20% шат) | Цалин, ногдол ашиг | ✔ [PwC — Taxes on personal income](https://taxsummaries.pwc.com/mongolia/individual/taxes-on-personal-income) |
| Нийгмийн даатгал (ажил олгогч) | **12.5–14.5%** (салбараас хамаарна) | Ажилтан авбал цалин × 1.125–1.145 | ✔ [PwC — Other taxes (individual)](https://taxsummaries.pwc.com/mongolia/individual/other-taxes), [ndaatgal.mn](https://www.ndaatgal.mn/) |
| e-barimt | Борлуулалт бүрт баримт; худалдан авагчид НӨАТ-ын **20% хүртэл буцаан олголт** + сугалаа | Манайд хэрэгжсэн (migration 0014, `_shared/ebarimt.ts`, TAX-01) | ✔ [ebarimt.mn](https://ebarimt.mn/), [KPMG — VAT e-barimt manual](https://assets.kpmg.com/content/dam/kpmg/mn/pdf/2023/vat-e-barimt-manual-2022.pdf) |
| Татварын шинэчлэл | 2027-01-01-ээс татварын багц хууль өөрчлөгдөх төлөвтэй ✱ | 2026-12-д нягтлантай дахин тооцох | [legalinfo.mn](https://legalinfo.mn/), [mta.mn](https://www.mta.mn/) ✱ |

> **Анхаар:** ААНОАТ-ын 1%-ийн хувь нь «татвар ногдох орлого» эсвэл «борлуулалтын орлого»-оос тооцогдох эсэхийг хуулийн тайлбараар нягтлан бодогчоор батлуул. Манай санхүүгийн загвар **конcерватив** байдлаар цэвэр борлуулалтын 1%-иар тооцсон.

### 5.2 Төлбөрийн экосистем

| Суваг | Шимтгэл | Тохиргоо | Эх сурвалж |
|---|---|---|---|
| **QPay** (манай) | Дотоод карт/банкны апп **≈ 1%**, олон улсын карт ≈ 3%, нэвтрүүлэх төлбөргүй ✱ | Merchant гэрээ банкаар (TDB, Хаан, Голомт…), e-barimt v3 | [developer.qpay.mn](https://developer.qpay.mn/), [qpay.mn](https://qpay.mn/), [tdbm.mn](https://www.tdbm.mn/) ✱ |
| SocialPay (Голомт) | Банкны нөхцөлөөр ✱ | | [golomtbank.com](https://www.golomtbank.com/) |
| Apple In-App Purchase | **15–30%** | Апп дотор зарвал заавал | ✔ [Apple — App Store Small Business Program](https://developer.apple.com/app-store/small-business-program/) |
| Google Play Billing | **15%** (захиалга) – 30% | Апп дотор зарвал заавал | ✔ [Google Play — Service fees](https://support.google.com/googleplay/android-developer/answer/112622) |
| Stripe | Монголд merchant данс нээх боломжгүй ✱ | — | [stripe.com/global](https://stripe.com/global) |

**Дүгнэлт:** QPay-ээр вэбээр төлүүлэх нь App Store-оор зарахаас 14–29 нэгж хувиар ашигтай. Иймд апп дотор үнэ/төлбөр огт байхгүй (§6).

### 5.3 Хувийн мэдээлэл (PDPL)

| Шаардлага | Манай хэрэгжилт | Эх сурвалж |
|---|---|---|
| Хүний хувийн мэдээлэл хамгаалах тухай хууль (2021, 2022-05-01-ээс мөрдөнө) | Нууцлалын бодлого (`web/src/legal/privacy.*.md`), бүртгэлд зөвшөөрөл | [legalinfo.mn](https://legalinfo.mn/) («Хүний хувийн мэдээлэл хамгаалах тухай»), [PwC Mongolia — tax/legal alert](https://www.pwc.com/mn/en/tax_alerts/tax_alert_02_2022.html) |
| Гадаадад дамжуулахад тодорхой зөвшөөрөл | Supabase (Сингапур), Anthropic, Resend (АНУ) жагсаасан, зөвшөөрлийн checkbox | [DLA Piper — Mongolia](https://www.dlapiperdataprotection.com/?c=MN&t=law) ✱ |
| Биометр / эмзэг мэдээлэл | Хадгалахгүй (passkey нь төхөөрөмж дээр, OCR төхөөрөмж дээр) | [PwC — legal insights 2025-02](https://www.pwc.com/mn/en/services/legal_mn/legal-articles/legal_insights_feb_24_2025.html) |
| Устгах эрх | Апп + вэбээс бүртгэл устгах (`delete-account.*.md`) | Apple 5.1.1(v) — доор |
| AI нийлүүлэгч өгөгдлөөр сургадаггүй | Anthropic API: анхдагчаар сургалтад ашиглахгүй, ZDR боломжтой | ✔ [Anthropic — Zero data retention](https://docs.anthropic.com/en/docs/build-with-claude/zero-data-retention), [privacy.anthropic.com](https://privacy.anthropic.com/) |

---

## 6. Apple / Google дэлгүүрийн дүрэм

| Дүрэм | Агуулга | Манай байдал | Албан ёсны холбоос |
|---|---|---|---|
| Apple 3.1.1 | Апп дотор дижитал контент нээхэд IAP заавал | Апп дотор юу ч зардаггүй | ✔ [App Review Guidelines §3.1.1](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase) |
| **Apple 3.1.3(f)** «Free Stand-alone Apps» | Төлбөртэй вэб хэрэгслийн үнэгүй хамтрагч апп нь апп дотор худалдан авалт, худалдан авахыг уриалсан текст/линкгүй байвал зөвшөөрнө | ✔ STORE-01 тест: «₮», «QPay», «/billing», upsell текст байхгүй | ✔ [App Review Guidelines §3.1.3](https://developer.apple.com/app-store/review/guidelines/#3.1.3) |
| Apple 5.1.1(v) | Бүртгэл үүсгэдэг апп нь апп дотроос устгах боломжтой байх | ✔ Тохиргоо → бүртгэл устгах | ✔ [App Review Guidelines §5.1.1](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage) |
| Apple Privacy Manifest | `PrivacyInfo.xcprivacy`, required-reason API | ✔ `mobile/app.config.ts`, `targets/widget/PrivacyInfo.xcprivacy` | [developer.apple.com — Privacy manifest files](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files) |
| Apple Wallet | Pass Type ID + сертификат (Developer Program $99/жил) | Код бэлэн, сертификат хүлээгдэж байна | ✔ [Create Wallet identifiers and certificates](https://developer.apple.com/help/account/capabilities/create-wallet-identifiers-and-certificates), [developer.apple.com/programs](https://developer.apple.com/programs/) |
| Google Play Payments | «Consumption-only» апп (өөр газар худалдан авсан контентыг үзүүлэх) Play Billing шаардахгүй; апп дотор өөр төлбөр рүү чиглүүлэхгүй | ✔ | ✔ [Understanding Google Play's Payments policy](https://support.google.com/googleplay/android-developer/answer/10281818) |
| Google Play Data safety | Цуглуулдаг өгөгдлийн маягт | ✔ `docs/store/android.md` | [support.google.com/googleplay/android-developer/answer/10787469](https://support.google.com/googleplay/android-developer/answer/10787469) |
| Google Wallet | Issuer бүртгэл үнэгүй; Монгол дэмжигдсэн улсын жагсаалтад байгаа эсэхийг шалгах ✱ | Код бэлэн | [developers.google.com/wallet](https://developers.google.com/wallet), [Supported countries](https://support.google.com/wallet/answer/12060037) |
| Google Play бүртгэл | $25 нэг удаа | | [support.google.com/googleplay/android-developer/answer/6112435](https://support.google.com/googleplay/android-developer/answer/6112435) |

---

## 7. Дэд бүтэц ба технологийн сонголтын харьцуулалт

### 7.1 Backend (BaaS)

| | **Supabase** (сонгосон) | Firebase | AWS Amplify / өөрийн сервер |
|---|---|---|---|
| Өгөгдлийн сан | Postgres 17 (SQL, RLS, trigger) | Firestore (NoSQL) | Сонголтоор |
| Эрхийн логик | **DB дотор** (RLS + SECURITY DEFINER) — UI-аас хамааралгүй | Security Rules (тусдаа хэл) | Өөрөө бичнэ |
| Тест | pgTAP (170 тест) | Emulator | Өөрөө |
| Үнэ (эхлэл) | Pro **$25/сар** ($10 compute credit орсон) | Blaze — хэрэглээгээр | VPS/RDS ≈ $30–100+ |
| Бүс | **Сингапур** байгаа (УБ-аас ≈ 60–90 ms ✱) | asia-east/southeast | Сонголтоор |
| Passkey | `[auth.passkey]` дэмжинэ | Identity Platform | Өөрөө |
| Холбоос | ✔ [supabase.com/pricing](https://supabase.com/pricing), ✔ [Regions](https://supabase.com/docs/guides/platform/regions) | [firebase.google.com/pricing](https://firebase.google.com/pricing) | [aws.amazon.com/pricing](https://aws.amazon.com/pricing/) |

**Яагаад Supabase:** үнэ, квот, эрх «зөвхөн DB-д» гэсэн хатуу дүрмийг SQL + RLS-ээр хамгийн шууд хэрэгжүүлнэ; vendor lock-in бага (энгийн Postgres — Монгол VPS руу self-host хийж болно, `COSTS.md` §3).

### 7.2 Бусад нийлүүлэгч

| Үйлчилгээ | Сонгосон | Эхлэлийн үнэ | Хувилбар | Холбоос |
|---|---|---|---|---|
| Вэб хостинг | Netlify | Free → Pro $19/сар | Cloudflare Pages (0₮), Vercel | [netlify.com/pricing](https://www.netlify.com/pricing/), [pages.cloudflare.com](https://pages.cloudflare.com/) |
| Имэйл | Resend | Free 3,000/сар → Pro $20 | Amazon SES ($0.10/1,000) | [resend.com/pricing](https://resend.com/pricing), [aws.amazon.com/ses/pricing](https://aws.amazon.com/ses/pricing/) |
| AI | Anthropic Claude API | Токеноор (өдрийн квот DB-д) | — | [anthropic.com/pricing](https://www.anthropic.com/pricing) |
| Bot хамгаалалт | Cloudflare Turnstile | 0₮ | reCAPTCHA | [cloudflare.com/products/turnstile](https://www.cloudflare.com/products/turnstile/) |
| Мобайл build | Expo EAS | Free (дараалалтай) → $19+ | Өөрийн Mac/Android Studio | [expo.dev/pricing](https://expo.dev/pricing) |
| Домэйн | .mn (Datacom) + .com | 66–165k₮/жил | | [datacom.mn](https://www.datacom.mn/) |

### 7.3 Технологийн хувилбарууд

| Давхарга | Манай | Яагаад | Албан ёсны баримт |
|---|---|---|---|
| Вэб | React 19 + React Compiler, Router 7, Vite 8, Tailwind 4, PWA | Хурдан, нэг кодоор PWA (Монголд PWA 42.4%) | [react.dev](https://react.dev/), [vite.dev](https://vite.dev/), [tailwindcss.com](https://tailwindcss.com/) |
| Мобайл | Expo SDK 57 / React Native — **Android + iOS нэг код** | Нэг багаар 2 платформ; widget, Live Activity, NFC, passkey native | [docs.expo.dev](https://docs.expo.dev/) |
| Нэвтрэлт | Passkey (WebAuthn) + 2FA | Нууц үггүй, фишингд тэсвэртэй | [fidoalliance.org/passkeys](https://fidoalliance.org/passkeys/) |
| OCR | Google ML Kit (төхөөрөмж дээр) | Зураг серверт гарахгүй (PDPL) | [developers.google.com/ml-kit/vision/text-recognition](https://developers.google.com/ml-kit/vision/text-recognition/v2) |

Хувилбар бүрийн дэлгэрэнгүй: [`TECH_STACK.md`](TECH_STACK.md).

---

## 8. Маркетингийн сувгийн харьцуулалт (Монгол)

| Суваг | Хүртээмж | Зардал | Давуу / сул | Эх сурвалж |
|---|---|---|---|---|
| Facebook / Instagram зар | 88.5% хүн ам | Монголын CPM/CPC-ийн албан ёсны benchmark олдсонгүй; дэлхийн дундаж CPM ≈ $6, CPC ≈ $0.7–0.8 ✱ | Нарийн таргет, retargeting / ad fatigue | [facebook.com/business/ads](https://www.facebook.com/business/ads) |
| LinkedIn | Монголд бага ✱ | CPC өндөр ($2–6 ✱) | B2B менежерүүд / хүртээмж бага | [business.linkedin.com](https://business.linkedin.com/marketing-solutions/ads) |
| Google Search | «нэрийн хуудас» хайлт | CPC бага ✱ | Хүсэлт тодорхой / хайлтын тоо бага | [ads.google.com](https://ads.google.com/) |
| B2B шууд борлуулалт | 63,000 ААН | Комисс 15% | Хамгийн өндөр LTV / удаан мөчлөг | — |
| Хэвлэлийн газар түншлэл | Нэрийн хуудас хэвлүүлэгч бүр | Revenue share 20% | Бэлэн худалдан авагч / түнш удирдах | — |
| Вирал (картын footer, урилга) | Хуваалцсан карт бүр | 1 сар Pro шагнал | CAC ≈ 0 / удаан | `get_my_growth` |

Дэлгэрэнгүй алхам: [`BUSINESS_PLAN.md`](BUSINESS_PLAN.md) §2, [`MARKETING_PLAN.md`](MARKETING_PLAN.md).

---

## 9. Стратегийн дүгнэлт

1. **Үнэ:** Pro 9,900₮ / 79,000₮ хэвээр. Team 5,000₮ нь дэлхийн үнээс 3× бага → 1,000 төлбөртэй хэрэглэгч, 20 байгууллагын дараа 6,900–7,900₮-ийг A/B туршина.
2. **Ялгарал:** «Монгол хэл + QPay + e-barimt + CRM/follow-up + эвент горим + IP хадгалдаггүй». Энгийн «карт солилцох» нь NameDrop-оор үнэгүй болж байгаа тул мессежийг **follow-up = орлого** дээр төвлөрүүлнэ.
3. **Enterprise шат:** SSO, HubSpot/Google Contacts sync (ROADMAP) — даатгал, банкны 100+ хүнтэй гэрээнд шаардлагатай.
4. **Татвар:** эхнээс НӨАТ төлөгчөөр бүртгүүлж, B2B-д НӨАТ-ын баримт өгнө; ААНОАТ 1%-ийн хөнгөлөлтийг 300 сая₮ хүртэл ашиглана; 2027-ийн шинэчлэлийг 2026-12-д дахин үнэлнэ.
5. **Дэлгүүр:** апп дотор төлбөрийн ул мөр байхгүй (STORE-01) — 15–30%-ийн шимтгэлээс сэргийлнэ.

## 10. Эх сурвалжийн нэгдсэн жагсаалт

**Өрсөлдөгчид (албан ёсны үнийн хуудас):** [Blinq](https://blinq.me/pricing) · [HiHello](https://www.hihello.com/pricing) · [Popl](https://popl.co/pages/pricing) · [V1CE](https://v1ce.co/pricing) · [Mobilo](https://www.mobilocard.com/pricing-3) · [Wave](https://wavecnct.com/) · [nfc.mn](https://nfc.mn/) · [QRMenu.mn](https://qrmenu.mn/) · [Tap.mn](https://tap.mn/)

**Монгол — статистик, мөнгө:** [Монголбанк](https://www.mongolbank.mn/) · [ҮСХ 1212.mn](https://www.1212.mn/) · [TradingEconomics — wages](https://tradingeconomics.com/mongolia/wages) · [DataReportal](https://datareportal.com/reports/digital-2026-mongolia) · [StatCounter](https://gs.statcounter.com/os-market-share/mobile/mongolia) · [NapoleonCat](https://stats.napoleoncat.com/social-media-users-in-mongolia/2026/)

**Монгол — татвар, хууль:** [Татварын ерөнхий газар mta.mn](https://www.mta.mn/) · [ebarimt.mn](https://ebarimt.mn/) · [legalinfo.mn](https://legalinfo.mn/) · [PwC — corporate income](https://taxsummaries.pwc.com/mongolia/corporate/taxes-on-corporate-income) · [PwC — other taxes](https://taxsummaries.pwc.com/mongolia/corporate/other-taxes) · [PwC — personal income](https://taxsummaries.pwc.com/mongolia/individual/taxes-on-personal-income) · [PwC — social security](https://taxsummaries.pwc.com/mongolia/individual/other-taxes) · [Нийгмийн даатгал ndaatgal.mn](https://www.ndaatgal.mn/) · [KPMG — e-barimt](https://assets.kpmg.com/content/dam/kpmg/mn/pdf/2023/vat-e-barimt-manual-2022.pdf) · [PwC — PDPL](https://www.pwc.com/mn/en/tax_alerts/tax_alert_02_2022.html)

**Төлбөр:** [QPay developer](https://developer.qpay.mn/) · [qpay.mn](https://qpay.mn/) · [TDB](https://www.tdbm.mn/) · [Apple Small Business Program](https://developer.apple.com/app-store/small-business-program/) · [Google Play service fees](https://support.google.com/googleplay/android-developer/answer/112622)

**Платформ:** [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Apple Wallet certificates](https://developer.apple.com/help/account/capabilities/create-wallet-identifiers-and-certificates) · [Apple Developer Program](https://developer.apple.com/programs/) · [Privacy manifest](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files) · [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/10281818) · [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469) · [Google Wallet](https://developers.google.com/wallet) · [Wallet countries](https://support.google.com/wallet/answer/12060037)

**Дэд бүтэц:** [Supabase pricing](https://supabase.com/pricing) · [Supabase regions](https://supabase.com/docs/guides/platform/regions) · [Firebase pricing](https://firebase.google.com/pricing) · [Netlify](https://www.netlify.com/pricing/) · [Resend](https://resend.com/pricing) · [Amazon SES](https://aws.amazon.com/ses/pricing/) · [Anthropic pricing](https://www.anthropic.com/pricing) · [Anthropic ZDR](https://docs.anthropic.com/en/docs/build-with-claude/zero-data-retention) · [Expo pricing](https://expo.dev/pricing) · [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)
