# DB migration гэж юу вэ, манайд яаж ажилладаг вэ

## 1. Энгийнээр

**Migration** = өгөгдлийн сангийн бүтцийг (хүснэгт, багана, дүрэм, функц) өөрчлөх **дугаарласан SQL файл**.
Код git-ээр хувилбартай байдаг шиг, DB-ийн бүтэц migration-аар хувилбартай байна.

```
backend/supabase/migrations/
  0001_init.sql            ← хамгийн эхний бүтэц
  0002_permissions.sql
  …
  0011_scale.sql           ← хамгийн сүүлийнх
```

- Supabase файлуудыг **дугаарын дарааллаар нэг л удаа** ажиллуулж, аль нь ажилласныг `supabase_migrations.schema_migrations` хүснэгтэд тэмдэглэнэ.
- Local, staging, production гурав **ижил файлуудаас** босдог → «надад ажиллаад байсан» асуудал гарахгүй.
- **Хуучин migration-ыг хэзээ ч засахгүй.** Production-д аль хэдийн ажилласан. Өөрчлөлт бүр = шинэ файл (жишээ нь 0010 нь 0001-ийн `contacts.source` дүрмийг шинэчилсэн).
- Эрх, квот, төлбөрийн дүрэм бүгд DB-д тул шинэ дүрэм = шинэ migration + pgTAP тест (`backend/supabase/tests/database/NN_*.test.sql`).

## 2. Манай 13 migration

| # | Файл | Юу хийдэг | Яагаад тусдаа |
|---|---|---|---|
| 0001 | `init` | 12 хүснэгт: plans (үнэ, лимит — цорын ганц эх сурвалж), profiles, organizations, org_members, subscriptions, cards, card_links, contacts, card_events (**IP багана байхгүй**), payments, audit_log, email_queue. Check constraint, индекс | Зөвхөн бүтэц |
| 0002 | `permissions` | Эрхийн функц (`card_quota`, `contact_limit`, `crm_enabled`, `can_edit_card` …) ба guard trigger-үүд: Free 2 дахь карт, хугацаа дууссан засвар, CRM талбар, байгууллагын түгжсэн загвар — UI-г тойрсон ч DB татгалзана | Бизнесийн дүрэм нэг газар |
| 0003 | `rls` | Хүснэгт бүрт Row Level Security: хэрэглэгч зөвхөн өөрийн мөр; `public_cards` view (зочинд зөвхөн нийтлэгдсэн картын нийтийн талбар) | Нууцлал |
| 0004 | `storage` | avatars/logos bucket: өөрийн хавтас, ≤ 2 MB, зөвхөн зураг | Файл |
| 0005 | `service_functions` | QPay төлбөр (давхар callback нэг удаа, дүн шалгах), хугацаа дуусгах, follow-up имэйл, зочны exchange (rate limit), статистик | Edge Function-ий транзакц |
| 0006 | `cron` | pg_cron: QPay reconcile 5 мин, хугацаа дуусгах өдөр бүр, follow-up digest өглөө бүр. URL/нууц Vault-аас | Нууц migration-д байхгүй |
| 0007 | `app_rpc` | UI-д хэрэгтэй уншилтын RPC: `get_my_entitlements`, линкийн статистик, багийн гишүүд, admin, бүртгэл устгах | UI ↔ DB гэрээ |
| 0008 | `org_owner_select` | Шинэ байгууллага үүсгэхэд RETURNING алдааг засав | Жижиг засвар — тусдаа файл |
| 0009 | `growth` | Жилийн төлбөр (`price_annual_mnt`), урилга (+1 сар), slug түгжээ, Free картын footer, AI өдрийн квот, эхлэх жагсаалт | Ашиг/өсөлт |
| 0010 | `nearby` | Утас ойртуулж солилцох: `nearby_pulses` (RPC-ээр л хандана), `nearby_bump`/`code_create`/`code_claim`/`poll`, `contacts.source` += 'nearby', 10 мин цэвэрлэгээ | Шинэ боломж |
| 0011 | `scale` | 1k–5k хэрэглэгчийн индекс (contacts owner+created, owner+card, org_members org+status), имэйл дарааллын цэвэрлэгээ | Гүйцэтгэл |
| 0012 | `hardening` | Аюулгүй байдлын аудитын засвар: хамгийн бага эрх, helper функц хаах, storage жагсаалт, rate_buckets | SECURITY_AUDIT.md |
| 0013 | `event_mode` | Эвент горим: `profiles.event_*`, шинэ харилцагчийг эвентээр тэмдэглэх trigger (зөвхөн CRM багц), `start_event`/`stop_event`/`get_my_event` | Шинэ боломж |

## 3. Тушаалууд

```bash
# Local: бүгдийг шинээр (seed орно)
scripts/dev-up.sh --reset            # = supabase db reset

# Local: зөвхөн шинэ migration-ыг нэмэх (өгөгдөл хадгалагдана)
cd backend && npx supabase migration up

# Шинэ migration үүсгэх
cd backend && npx supabase migration new nearby_v2   # → migrations/<timestamp>_nearby_v2.sql
#   (манайх 4 оронтой дугаар ашигладаг: 0012_nearby_v2.sql гэж нэрлэ)

# Тест
cd backend && npx supabase test db   # pgTAP, 158 тест

# TypeScript төрлийг шинэчлэх (RPC, хүснэгт өөрчлөгдсөн бол)
cd packages/shared && npm run gen:types

# Production руу (CI эсвэл гараар)
npx supabase link --project-ref <ref>
npx supabase db push                 # зөвхөн ажиллаагүй migration-уудыг явуулна
```

## 4. Аюулгүй migration бичих дүрэм

1. **Нэмэх нь аюулгүй, устгах нь аюултай.** Багана устгахын оронд эхлээд код ашиглахаа болиулж, дараагийн хувилбарт устга.
2. Том хүснэгтэд индекс: `create index concurrently` (транзакц гадна) — одоогийн хэмжээнд энгийн `create index` хангалттай.
3. `not null` багана нэмэхдээ `default`-тай нэм.
4. Функц солих: `create or replace` + эрхийг (`revoke`/`grant`) дахин бич.
5. Production-д `db push`-ээс өмнө staging дээр бүх тест (pgTAP, API, E2E) ногоон байх.
6. Backup: Supabase Pro өдөр бүр автоматаар; том өөрчлөлтийн өмнө гараар `pg_dump`.
