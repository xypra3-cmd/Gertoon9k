# Хяналт (monitoring) — алдааны мэдээ ба uptime

> AUDIT OPS-01-ийн шийдэл. Шийдвэр: `DECISIONS.md` D-76. Ослын үед хийх алхам: [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md).
> Бүх зүйл **сонголттой**: DSN тохируулаагүй бол код юу ч илгээхгүй, зөвхөн лог-д бичнэ.

## 1. Юу хаана ажилладаг вэ

| Хэсэг | Код | Юуг илгээнэ | Юуг ХЭЗЭЭ Ч илгээхгүй |
|---|---|---|---|
| Edge Functions | `backend/supabase/functions/_shared/monitor.ts` (`monitored()`, `reportError()`), SDK-гүй, `fetch`-ээр | Барьж аваагүй алдаа (хэрэглэгчид ерөнхий 500 буцаана); QPay, e-barimt, AI-ийн алдаа; функцийн нэр, payment_id гэх мэт бичлэгийн ID | Хүсэлтийн URL, header, body, IP, хэрэглэгч |
| Вэб | `web/src/lib/monitoring.ts` — `@sentry/react`, хуудас idle болсны дараа ачаална (үндсэн bundle +1.2 KB) | Хөтчийн алдаа, хуудасны зам (query/hash-гүй), хөтчийн загвар, release | User, cookie, header, query/hash (нууц үг сэргээх токен), breadcrumb, console, replay, tracing |
| Мобайл | `mobile/lib/monitoring.ts` — `@sentry/react-native` | **Зөвхөн JS алдаа** (цэвэрлэгдсэн) | Native crash, session (install ID), screenshot, view hierarchy, breadcrumb, сүлжээний хүсэлт |
| Цэвэрлэгч | `packages/shared/src/scrub.ts` (`scrub`, `sanitizeEvent`) + Edge-ийн хуулбар `_shared/scrub.ts` | — | Имэйл → `[email]`, утас → `[number]`, IPv4/IPv6 → `[ip]`, JWT/Bearer → `[jwt]`/`[token]`; UUID үлдэнэ |
| Uptime | `backend/supabase/functions/health` | `200 {"ok":true,"degraded":false}` | Тоо зөвхөн cron secret-тэй дуудагчид |

Native crash-ийг мобайлд **унтраасан** шалтгаан: native SDK-ийн crash болон session нь JS-ийн `beforeSend`-ийг тойрч шууд илгээгддэг (session нь суулгалтын ID-тай). Native crash-ийг **Play Console → Android vitals**, **Xcode Organizer → Crashes** аль хэдийн харуулдаг (нэмэлт боловсруулагчгүй).

## 2. Sentry тохируулах (нэг удаа, ≈ 20 минут)

1. [sentry.io](https://sentry.io/signup/) дээр байгууллага үүсгэхдээ **Data Storage Location = EU (Germany)** сонго. Энэ сонголтыг дараа нь **өөрчлөх боломжгүй**; бүх багцад (үнэгүй Developer багц орно) ижил үнэтэй ([Sentry — Data Storage Location](https://docs.sentry.io/organization/data-storage-location/)). Нууцлалын бодлогод «ЕХ (Герман)» гэж бичсэн тул заавал EU сонгоно.
2. 3 project үүсгэ: `digitalcard-web` (React), `digitalcard-mobile` (React Native), `digitalcard-edge` (JavaScript).
3. Project бүрт **Settings → Security & Privacy**:
   - **Prevent Storing of IP Addresses** — асаа (давхар хамгаалалт; манай SDK-ууд `infer_ip: never` илгээдэг).
   - **Data Scrubber** + **Use Default Scrubbers** — асаалттай байлга.
4. DSN-ийг (public утга, нууц биш) тохируул:

| Хаана | Түлхүүр | Утга |
|---|---|---|
| Supabase → Edge Function secrets | `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production` | `supabase secrets set SENTRY_DSN=https://…@o….ingest.de.sentry.io/…` |
| Netlify → Site settings → Environment variables | `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT=production` | web project-ийн DSN |
| EAS → Environment variables (production) | `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_ENVIRONMENT=production` | mobile project-ийн DSN |

   CSP (`web/netlify.toml`) `*.ingest.de.sentry.io`, `*.ingest.sentry.io`, `*.ingest.us.sentry.io`-г аль хэдийн зөвшөөрсөн.
5. **Alert:** project бүрт «A new issue is created» → имэйл (эсвэл Slack). e-barimt-д зориулж: Issues → filter `fn:ebarimt` → «Alert on this». 
6. **Release:** вэб нь Netlify-ийн `COMMIT_REF`-ийг автоматаар ашиглана. Source map upload (`@sentry/vite-plugin`, `SENTRY_AUTH_TOKEN`) нь сонголттой — одоогоор stack trace minify хэлбэртэй харагдана.

## 3. Uptime (UptimeRobot / Better Stack — үнэгүй багц хангалттай)

| Монитор | URL | Хүлээгдэх | Давтамж |
|---|---|---|---|
| Вэб | `https://digitalcard.mn/` | 200 | 5 мин |
| Нийтийн карт (demo slug) | `https://digitalcard.mn/c/<demo-slug>` | 200 | 5 мин |
| Backend + DB + e-barimt | `https://<project>.supabase.co/functions/v1/health` | 200 | 5 мин |

`health`-ийн хариу:
- `503 {"ok":false}` — өгөгдлийн сан хүрэхгүй байна → [INCIDENT_RESPONSE](INCIDENT_RESPONSE.md) «Сервис унасан».
- `503 {"ok":true,"degraded":true}` — төлөгдсөн төлбөрт **e-barimt гараагүй** (`failed`, эсвэл 1 цагаас дээш `pending`). `qpay-reconcile` 5 удаа дахин оролддог; дууссан бол QPay merchant самбараас гараар гаргаад төлбөрийн мөрийг шинэчил. Дэлгэрэнгүй тоо:
  ```bash
  curl -H "x-cron-secret: $CRON_SECRET" https://<project>.supabase.co/functions/v1/health
  ```
- Нэг сүлжээнээс минутад 30-аас олон дуудлага → 429 (cron secret-тэй дуудлагад хязгааргүй).

## 4. Шалгах (тест)

| Тест | Юуг батлах |
|---|---|
| `packages/shared/test/scrub.test.ts` | Вэб/мобайл ба Edge-ийн цэвэрлэгч ижил ажилладаг; `sanitizeEvent` user, breadcrumb, query/hash-ийг хасдаг |
| `backend/supabase/tests/functions/monitor.test.mjs` | `monitored()` → ерөнхий 500 + нэг envelope; DSN-гүй бол юу ч илгээхгүй; Sentry унтарсан ч хүсэлт эвдрэхгүй |
| `backend/supabase/tests/functions/functions.test.mjs` (OPS-01) | `health` нийтэд тоогүй хариулна; e-barimt алдаа хувийн мэдээлэлгүй Sentry-д очиж, health `degraded` болж, reconcile-ийн дараа сэргэнэ |
| `qa/e2e/monitoring.spec.ts` | Бодит хөтөч дээр алдаа mock Sentry-д хувийн мэдээлэлгүй очно (`infer_ip: never`) |

Local-д бүх DSN mock руу заана: `http://mocksentrykey@host.docker.internal:54399/1` (mock сервер `/api/<id>/envelope/`-ийг хүлээн авна).

## 5. Өдөр тутмын дэглэм

- **Өдөр бүр (5 мин):** Sentry-ийн шинэ issue, `health` монитор ногоон эсэх.
- **7 хоног бүр:** хамгийн их давтагдсан 3 алдааг засварын төлөвлөгөөнд оруул.
- **Release бүрийн дараа 1 цаг:** шинэ release-ийн алдааны огцом өсөлт байвал Netlify-д өмнөх deploy руу буцаа (1 товч).
