# Аюулгүй байдлын аудит — 2026-10-06

**Хамрах хүрээ:** 3 апп (вэб, Android/iOS), Supabase (12 migration, 15 хүснэгт, 62 функц, storage, auth тохиргоо), 10 Edge Function, Netlify тохиргоо (CSP), гадаад сангууд, git түүх.
**Арга:** өгөгдлийн сангийн каталогоос эрх/policy-г автоматаар шүүсэн, Edge Function бүрийг кодоор уншсан, HTTP түвшинд халдлага дуурайлгасан тест бичсэн, `npm audit`, git нууц хайлт, AndroidManifest-ийг prebuild-ээр шалгасан.
**Дүгнэлт:** Critical алдаа олдоогүй. 1 High, 5 Medium, 4 Low асуудлыг **зассан, тус бүрд тест нэмсэн**. Үлдсэн эрсдэлүүд §3-т.

## 1. Олдвор ба засвар

| ID | Түвшин | Асуудал | Засвар | Тест |
|---|---|---|---|---|
| A-04 | **High** | Storage-ийн «public read» policy нь хэн ч (нэвтрээгүй) `avatars`/`logos` bucket-ийг **жагсааж**, бүх хэрэглэгчийн ID (хавтасны нэр), нийтлээгүй/устгасан картын зургийг олох боломжтой байсан | Жагсаалт зөвхөн өөрийн хавтас. Нийтийн URL-ээр зураг харах хэвээр | pgTAP 11, API SEC-07 |
| A-01 | Medium | `anon`/`authenticated` эрхүүд бүх хүснэгтэд TRUNCATE, TRIGGER, REFERENCES, anon-д INSERT/UPDATE/DELETE байсан (RLS хамгаалж байсан ч TRUNCATE нь RLS-ийг тойрдог; хамгаалалт зөвхөн нэг давхарга) | Хамгийн бага эрх: anon зөвхөн `plans`, `public_cards` уншина; TRUNCATE хэнд ч үгүй; сервер-only хүснэгт хаалттай; ирээдүйн хүснэгт/функцийн default эрх хатуу | pgTAP 11, API SEC-07 |
| A-02 | Medium | Нэвтэрсэн хэрэглэгч `has_active_plan`, `card_quota`, `contact_limit`… функцуудыг **өөр хүний ID-гаар** дуудаж багц, лимитийг нь мэдэх боломжтой | Эдгээр функц API-аас хаагдсан; зөвхөн DB дотор (trigger, definer функц) ашиглагдана. Өөрийн мэдээлэл `get_my_entitlements`-ээр хэвээр | pgTAP 02, 11, API SEC-07 |
| A-05 | Medium | Зочны rate limit (exchange 5/цаг, track-event 30/мин) нь `hash(IP + User-Agent)`-д тулгуурласан → UA сольж бот хязгааргүй илгээх, статистик хөөргөх боломжтой | Сүлжээний түлхүүр `HMAC(IP, өдрийн давс)` (UA-гүй, IP хадгалахгүй): exchange 20/цаг, track-event 600/цаг/карт (CGNAT-д хангалттай). AI 10/мин, урилга 30/цаг, нэхэмжлэл 10/10 мин | functions A-05 |
| W-01 | Medium | Нэвтрэлтийн дараах `?next=//evil.com` эсвэл `/\evil.com` → гадны сайт руу шилжүүлэх (open redirect, фишинг) | `safeNextPath()` — зөвхөн дотоод зам | shared unit |
| AUTH-01 | Medium | Нууц үгийн хамгийн бага урт серверт 6 (UI 8) — API-аар шууд сул нууц үг бүртгэх боломжтой | Auth: 8+ тэмдэгт, үсэг + тоо (config.toml). UI ижил дүрэм, `weak_password` алдааны орчуулга | API SEC-07, shared unit |
| M-01 | Medium (функц) | Android manifest-д `ACCESS_COARSE_LOCATION` хориглогдсон байсан → «Ойртуулах» жинхэнэ Android утсанд ажиллахгүй байсан | Ойролцоо байршил зөвшөөрсөн; нарийн ба background байршил хориглосон хэвээр | prebuild manifest шалгалт |
| M-02 | Low | `allowBackup` асаалттай → харилцагчийн кэш Google backup-д орох | `allowBackup: false` | manifest |
| E-01 | Low | Cron нууцыг энгийн `===`-аар харьцуулсан (timing) | Constant-time харьцуулалт | functions |
| E-02 | Low | IP толгойн дараалал: `x-real-ip` (зарим gateway өөрийн IP-г тавьдаг) эхэнд байсан | `cf-connecting-ip` → `x-forwarded-for` → `x-real-ip` | functions A-05 |
| W-02 | Low | QPay-ийн банкны линкийг шалгалтгүй `href`-д тавьсан | `javascript:`/`data:` зэрэг схемийг шүүнэ | shared unit |

## 2. Шалгаад асуудалгүй гэж батлагдсан

- **RLS** бүх 15 хүснэгтэд асаалттай; policy-ууд `(select auth.uid())` хэлбэртэй. Бүх SECURITY DEFINER функц `search_path = ''`.
- Клиентээс дуудагддаг RPC бүр (admin, статистик, багийн гишүүд, нэрт зочид, бүртгэл устгах, nearby) дотроо эрх шалгадаг.
- Карт/харилцагч/байгууллагын trigger-ууд: эзэмшигч солих, бусдын байгууллагад карт үүсгэх, квот, хугацаа дууссан багц, түгжсэн талбар — DB-д хаалттай (144 pgTAP).
- QPay callback-д итгэдэггүй (QPay-ээс дахин шалгана), давхар callback нэг удаа.
- AI: prompt injection-оос `<input>` тусгаарлалт, зураг ≤ 4 MB, гаралт JSON schema, хэрэглэгч шалгаж байж хадгална, агуулга лог-д бичигдэхгүй.
- Вэб: CSP (`default-src 'self'`, inline script байхгүй, `frame-ancestors 'none'`), HSTS, nosniff; `dangerouslySetInnerHTML` 2 газар — хоёулаа escape хийсэн/дотоод үүсгэсэн SVG.
- OG edge function бүх утгыг escape хийдэг.
- Mobile: session `expo-secure-store`-д, QR-ийн линкийг зөвхөн манай домэйнээс таньдаг, гадны линкийг асууж байж нээнэ, апп дотор үнэ/төлбөр байхгүй (STORE-01).
- Git: `.env`, түлхүүр, JWT, private key түүхэнд байхгүй.

## 3. Үлдсэн эрсдэл (мэдэж хүлээн авсан)

| Эрсдэл | Яагаад үлдээсэн | Дараагийн алхам |
|---|---|---|
| `npm audit`: mobile-д 30 (high 19) | Бүгд **build хэрэгсэл** (metro, expo CLI, node-forge) — апп-д ордоггүй. npm-ийн санал болгосон «засвар» нь Expo 44 руу буцах (буруу) | Expo SDK шинэчлэлтээр автоматаар засагдана |
| `decode-uri-component` 0.2.2 (expo-router дотор) | Гажуудсан deep link → зөвхөн тухайн утсан дээрх апп түр гацах (DoS) | expo-router шинэчлэл |
| Вэб: `react-router-dom` 6.30.6 open-redirect CVE | Манай цорын ганц хэрэглэгчийн өгсөн зам (`?next=`) W-01-ээр хаагдсан | v7 руу шилжих (ROADMAP) |
| Ойртуулах: 5 км бүсэд 3 секундэд өөр хүн давхцаж болох | Солилцох мэдээлэл нь нийтийн карт; «Буруу хүн — буцаах» товч бий | BLE/код руу чиглүүлэх (ROADMAP) |
| Session token хөтчийн localStorage-д | Supabase-ийн стандарт; CSP XSS-ээс хамгаална | — |
| `card_shows_branding(owner, org)` anon-д нээлттэй | View-д хэрэгтэй; хэрэглэгчийн ID-г (A-04-өөр) олох боломжгүй болсон | — |

## 4. Production-д заавал (Supabase/Netlify хяналтын самбар)

1. Auth → **Confirm email** асаах; **Secure password change** асаах; Pro-д **Leaked password protection** (HaveIBeenPwned).
2. Auth → Bot protection (Turnstile) + `VITE_AUTH_CAPTCHA=true`.
3. Edge Function secret: `ALLOWED_ORIGINS=https://<домэйн>` (default `*`), `CRON_SECRET`, `STATS_SALT_SECRET` (32+ санамсаргүй тэмдэгт), QPay, Resend, Anthropic түлхүүрүүд — зөвхөн secret-д.
4. Platform admin бүртгэлд 2FA (DB шаарддаг).
5. Supabase → Database → Network restrictions (шууд Postgres холболтыг хаах), PITR backup.
6. `qa/api` + `qa/e2e`-г staging дээр давтах.
