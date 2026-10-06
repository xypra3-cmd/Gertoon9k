# 1,000–5,000 хэрэглэгчид гацахгүй ажиллах — 3 апп

> Товч дүгнэлт: одоогийн архитектур 5,000 бүртгэлтэй хэрэглэгчийг **сервер нэмэлгүйгээр** даана.
> Хэмжилт: 500 зэрэг идэвхтэй хэрэглэгч (≈5,000 бүртгэлийн 10 %) → **p95 ≤ 13 ms, алдаа 0 %**, нийтийн карт 200 зэрэг → p95 36 ms.
> Эхний гацах цэг бол сервер биш — **QPay, имэйл, AI-ийн гадаад хязгаар**. Тэдгээрийг доор тусад нь бичсэн.

## 1. Ачаалал хаанаас ирдэг вэ

| Урсгал | Хэн | Давтамж (5,000 хэрэглэгч ✱) | Хаана үйлчлэгдэнэ |
|---|---|---|---|
| Нийтийн карт `/c/:slug` | Зочид (бүртгэлгүй) | Хамгийн их: эвент дээр 1 минутад 100–300 QR | Netlify CDN (HTML/JS) + `public_cards` view (1 query) |
| `track-event` | Зочид | Карт нээлт бүрт 1 | Edge Function → 1 insert (`card_events`) |
| Апп нээх (web/Android/iOS) | Хэрэглэгч | Өдөрт 2–5 удаа | 4 query: cards, contacts, entitlements, stats |
| Ойртуулж солилцох | Хэрэглэгч | Эвент дээр оргилтой | `nearby_bump` (advisory lock, 1 cell) |
| Cron | Систем | 5 мин – 1 өдөр | QPay reconcile, имэйл, цэвэрлэгээ |

**Гол санаа:** зочны урсгал (хамгийн их) нь статик CDN + 1 жижиг SQL. Апп доторх урсгал бүгд RLS-тэй, индекстэй, хэрэглэгч бүр зөвхөн өөрийн мөрүүдийг уншина.

## 2. Хэмжилт (local, 4 vCPU / 15 GB, Supabase CLI stack)

| Тест | Ачаалал | Үр дүн |
|---|---|---|
| `qa/load/app-users.js` | 200 хэрэглэгч, **500 зэрэг VU**, 2.8 мин, 86,569 хүсэлт (378/с) | cards p95 **8 ms**, contacts **5 ms**, entitlements **12 ms**, stats **8 ms**, bump **10 ms**, алдаа **0 %** |
| `qa/load/public-card.js` | 200 зэрэг зочин, 5 мин, 157,812 хүсэлт | p95 **36 ms**, алдаа 0.005 % |

Production-д (Supabase Pro, Singapore бүс) сүлжээний хоцрогдол Улаанбаатараас ≈ 60–90 ms нэмэгдэнэ ✱ — хэрэглэгчид мэдрэгдэхгүй. Production-той ижил tier дээр давтан хэмжих (`k6 run -e API=… load/app-users.js`) нь launch-ийн өмнөх заавал алхам.

## 3. Аль хэдийн хийгдсэн зүйлс

| Давхарга | Арга | Хаана |
|---|---|---|
| CDN | Вэб нь статик build → Netlify CDN; нийтийн картын bundle жижиг (`@digitalcard/shared/*` дэд замаар импорт, QR, exchange form lazy) | `web/vite.config.ts`, `CLAUDE.md` |
| RLS гүйцэтгэл | Бүх policy `(select auth.uid())` хэлбэртэй → мөр бүрт биш, query-д нэг удаа тооцогдоно | `0003_rls.sql` |
| Индекс | contacts (owner, created_at desc / follow_up / status / card), cards (owner), card_events (card, created_at), nearby (cell, created_at) | `0001`, `0010`, `0011` |
| Түгжээ | Квот (карт, харилцагч) ба bump-ийг `pg_advisory_xact_lock` → давхар бичилт, race байхгүй, бусад хэрэглэгчийг түгжихгүй | `0002`, `0010` |
| Rate limit | Зочны exchange 5/цаг, track-event visitor-оор, AI 3/100 өдөрт, nearby 20/мин, код 10/10 мин | DB функцууд |
| Offline | Mobile харилцагчдыг төхөөрөмж дээр cache-лэнэ (сүлжээ тасарсан ч жагсаалт харагдана) | `mobile/lib/cards.ts` |
| Цэвэрлэгээ | nearby pulse 10 мин, илгээсэн имэйл 30 хоног | cron `0010`, `0011` |
| QR | Төхөөрөмж дээр үүсгэнэ (сервер, API, төлбөргүй) | `QrCode.tsx`, `react-native-qrcode-svg` |

## 4. Тохиргоо (launch-д)

| Зүйл | 1,000 хүртэл | 5,000 хүртэл | 20,000+ |
|---|---|---|---|
| Supabase | Pro, Micro compute | Pro, **Small** compute (2 GB) | Medium/Large, read replica |
| Connection | Supavisor (transaction mode) — PostgREST/Edge аль хэдийн ашигладаг | ижил | `max_connections` хянах |
| Netlify | Free/Pro | Pro | Pro (эсвэл Cloudflare Pages) |
| Имэйл (Resend) | Free 3,000/сар ✱ | Pro (50,000/сар) ✱ | Pro+ |
| Мониторинг | Supabase Reports + Netlify Analytics | + Sentry (web/mobile алдаа), uptime ping | + log drain |
| Backup | Pro-д өдөр бүр (7 хоног) | + PITR (сонголт) | PITR |

## 5. Гадаад хязгаар — жинхэнэ эрсдэл

| Үйлчилгээ | Эрсдэл | Хамгаалалт |
|---|---|---|
| QPay | Invoice API хоцрох / унах | Callback-д итгэдэггүй; `qpay-reconcile` 5 минут тутам дахин шалгана; хэрэглэгч дахин төлөх шаардлагагүй |
| Имэйл | Өглөөний follow-up digest нэг дор олон | `email_queue` + dedupe_key; илгээгч функц багцаар явуулна |
| Claude API | Rate limit / 529 | Өдрийн квот DB-д, `fallbacks` + алдаа гарвал кредит буцаана; AI унасан ч апп ажиллана |
| Push/Notification | — | Сануулга төхөөрөмж дээр (локал), серверийн push байхгүй |

## 6. Хэзээ дараагийн алхам хийх вэ (дохио)

- DB CPU > 60 % 15 минутаас удаан → compute нэг шат өсгөх.
- `card_events` 10 сая мөрөөс их → өдрийн нэгтгэл (`card_events_daily`) хүснэгт + 13 сараас хуучныг устгах migration.
- Эвентэд 1 газар 50+ хүн зэрэг bump хийж «ambiguous» олон гарвал → precision 6 тохирох, эсвэл QR/код руу чиглүүлэх (UI-д аль хэдийн байгаа).
- Нэг байгууллага 500+ ажилтантай болбол → Team самбарын query-д pagination.
