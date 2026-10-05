# Digital Card — Backend (Supabase)

Postgres + RLS, Auth, Storage, Edge Functions. Эрх, квот, төлбөр, статистикийн **цорын ганц эх сурвалж** энэ backend. Web, mobile нь зөвхөн UI-г нуудаг.

```
backend/
├── package.json                 # npm скриптүүд (test, mock, types)
└── supabase/
    ├── config.toml
    ├── .env.example             # → supabase/.env (git-д орохгүй)
    ├── migrations/
    │   ├── 0001_init.sql            хүснэгтүүд, plans (үнэ/лимит)
    │   ├── 0002_permissions.sql     эрхийн функц + guard trigger
    │   ├── 0003_rls.sql             RLS, public_cards, card_daily_stats
    │   ├── 0004_storage.sql         avatars/logos bucket
    │   ├── 0005_service_functions.sql  төлбөр, event, exchange, digest, stats RPC
    │   ├── 0006_cron.sql            pg_cron → Edge Functions
    │   ├── 0007/0008                апп RPC, org owner select
    │   └── 0009_growth.sql          жилийн төлбөр, урилга, slug түгжих, branding, AI квот
    ├── functions/               # Deno Edge Functions (+ _shared/)
    ├── seed.sql                 # ЗӨВХӨН local
    └── tests/
        ├── database/*.test.sql  # pgTAP (103 тест)
        ├── functions/*.test.mjs # Edge Function integration (19 тест)
        └── mocks/mock-server.mjs   # QPay v2 + Turnstile + Claude API mock
```

## 1. Local-д ажиллуулах

Шаардлага: Docker, [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) ≥ 2.x, Node 20+.

```bash
cd backend
cp supabase/.env.example supabase/.env     # local утгуудыг бөглө (доорхыг үз)
supabase start                             # Postgres, Auth, Storage, Edge Runtime
supabase db reset                          # migration + seed
```

Local `.env`-ийн жишээ (mock сервер ашиглах):

```
QPAY_BASE_URL=http://host.docker.internal:54399
QPAY_USERNAME=local
QPAY_PASSWORD=local
QPAY_INVOICE_CODE=LOCAL_INVOICE
STATS_SALT_SECRET=<урт санамсаргүй мөр>
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
TURNSTILE_VERIFY_URL=http://host.docker.internal:54399/turnstile/v0/siteverify
PUBLIC_FUNCTIONS_URL=http://127.0.0.1:54321/functions/v1
CRON_SECRET=<урт санамсаргүй мөр>
ANTHROPIC_API_KEY=local-mock
ANTHROPIC_BASE_URL=http://host.docker.internal:54399
```

`ai-assist` нь албан ёсны Claude SDK-г local `node_modules`-оос ачаална: `npm run functions:deps` (deploy-оос өмнө ч).

> QPay sandbox-той шууд ажиллуулах бол `QPAY_BASE_URL=https://merchant-sandbox.qpay.mn` болон QPay-ээс авсан sandbox нэр, нууц үг, invoice code-ыг тавина.
> `.env`-ийг өөрчилсний дараа `supabase stop && supabase start`.

### Demo бүртгэлүүд (зөвхөн local seed)

Нууц үг бүгд: `Demo1234!`

| Имэйл | Төлөв |
|---|---|
| admin@demo.mn | Платформ админ (админ эрх MFA/aal2 шаарддаг) |
| basic@demo.mn | Free, 1 карт |
| pro@demo.mn | Pro идэвхтэй, 3 карт, CRM contact-ууд, follow-up |
| org-owner@demo.mn | Team (5 суудал), «Демо Групп ХХК» |
| employee1..3@demo.mn | Байгууллагын ажилтан, тус бүр 1 карт |
| expired@demo.mn | Pro дууссан → Free руу буурсан, 2 карт |

30 хоногийн жишээ event-үүд бүх нийтлэгдсэн картад бий.

## 2. Тест

```bash
npm run mock          # тусдаа terminal-д: QPay + Turnstile mock (:54399)
npm test              # db reset → pgTAP → Edge Function integration
# эсвэл тус тусад нь:
npm run test:db
npm run test:functions
```

| Хүлээн авах шалгуур | Тест |
|---|---|
| 1. `db reset` алдаагүй, seed орно | `npm test`-ийн эхний алхам |
| 2. Free 2 дахь, Pro 6 дахь карт, Team илүү суудал → татгалзана | `01_quota.test.sql`, `org-invite` тест |
| 3. Хугацаа дууссан → UPDATE татгалзана, public_cards харагдана | `02_expired.test.sql` |
| 4. A нь B-ийн карт/contact/event/payment уншиж, бичиж чадахгүй | `03_isolation.test.sql` |
| 5. Ажилтан бусдын статистик харахгүй, admin бүгдийг | `04_org.test.sql` |
| 6. Ажилтан template_id өөрчилж чадахгүй | `04_org.test.sql` |
| 7. Хуурамч callback → идэвхжихгүй | `06_payments.test.sql`, `PAY-01` |
| 8. Давхар callback → 1 удаа сунгана | `06_payments.test.sql`, `PAY-02` |
| 9. IP хадгалагдахгүй | `07_privacy_events.test.sql`, `PRIV-01` |
| 10. Free-д 11 дэх exchange хадгалагдахгүй | `05_contacts_crm.test.sql`, criterion 10 |
| 11. Free REST-ээр note/follow_up_at бичихэд татгалзана | `05_contacts_crm.test.sql` |
| 12. consent/Turnstile-гүй exchange татгалзана | `EXC-01` |
| 13. followup-digest өдөрт ≤ 1 имэйл | `07_privacy_events.test.sql`, criterion 13 |

## 3. Эрхийн загвар

| Функц | Утга |
|---|---|
| `has_active_plan(uid)` | Хувийн эсвэл байгууллагын active subscription, `current_period_end > now()` |
| `card_quota(uid)` | Идэвхтэй хувийн багцын `card_limit`, байхгүй бол free-ийн (1) |
| `can_edit_card(card_id)` | Хувийн карт: эзэмшигч + үүсгэсэн дарааллаар эхний `card_quota` карт. Байгууллагын карт: org active + (org admin эсвэл эзэмшигч ажилтан) |
| `is_org_admin(org)` | owner/admin, active |
| `crm_enabled(uid)`, `contact_limit(uid)` | Идэвхтэй багцаас, үгүй бол free |

Багц дууссан хэрэглэгч Free руу буурна (DECISIONS.md D-03): нийтийн карт, QR, vCard ажилласаар; анхны 1 карт засагдана, бусад нь түгжигдэнэ; шинэ карт, CRM бичилт түгжигдэнэ.

Trigger-ээр хамгаалагдсан зүйлс (UI-г тойрч REST-ээр дуудсан ч):
- Карт квот, байгууллагын картын түгжсэн загвар, ажилтны засаж болох талбар (`allow_employee_edit_fields`, `'links'` = линк засах эрх)
- Contact limit (бүх замаар), CRM талбар (`note, tags, status, follow_up_at, last_contacted_at, met_*`)
- Төлсөн суудал (`org_members`)
- Client-ын `DELETE cards` → soft delete

### Алдааны түлхүүр

DB нь SQLSTATE `42501` (→ HTTP 403) эсвэл `P0001` (→ 400) + тогтмол MESSAGE түлхүүр буцаана: `card_quota_exceeded`, `crm_not_enabled`, `contact_limit_reached`, `seat_limit_reached`, `org_template_locked`, `org_field_locked` гэх мэт. `packages/shared` → `errorKey()` + `i18n` эдгээрийг монгол мессеж болгоно.

## 4. Edge Functions

| Функц | Хандалт | Тайлбар |
|---|---|---|
| `qpay-create-invoice` | Хэрэглэгчийн JWT | `{ plan_id, org_id?, seats? }` → pending payment + QPay invoice (QR, банкны deeplink). Дүнг `plans`-аас |
| `qpay-callback` | Public (QPay) | `?inv=<sender_invoice_no>`. Агуулгад итгэхгүй — `/v2/payment/check`-ээр шалгаж `apply_payment_check` (idempotent) |
| `qpay-reconcile` | Cron 5 мин | < 24 цагийн pending-ийг шалгана, хуучныг `expired` |
| `track-event` | Public | `{ slug, event, link_kind? }`, visitor_hash = sha256(ip + UA + өдрийн salt); 30/мин/зочин/карт |
| `contact-exchange` | Public | Turnstile + consent + 5/цаг/зочин + эзэмшигчийн contact_limit; Pro эзэмшигчид имэйл |
| `expire-subscriptions` | Cron өдөр бүр | Дууссаныг `expired`, 3 хоногийн өмнөх сануулга |
| `followup-digest` | Cron 09:00 (UB) | Хэрэглэгч бүрт өдөрт 1 имэйл (`email_queue.dedupe_key`) |
| `org-invite` | Org admin JWT | Төлсөн суудлаас хэтрүүлэхгүй |
| `ai-assist` | Хэрэглэгчийн JWT | `{ task: bio\|scan\|note\|followup, locale, input }` → structured JSON. Квот `consume_ai_credit` (Free 3, төлбөртэй 100/өдөр), refusal/алдаанд кредит буцаана. Агуулга лог-д бичигдэхгүй |

Cron endpoint-ууд `x-cron-secret: $CRON_SECRET` header шаардана. Имэйл: `email_queue` → `RESEND_API_KEY` тохируулсан бол Resend-ээр илгээнэ, үгүй бол дараалалд үлдэнэ.

Лог: IP, токен, хүсэлтийн агуулга хэзээ ч лог-д бичигдэхгүй (`logEvent` зөвхөн id, төлөв).

## 5. Production deploy

```bash
supabase link --project-ref <ref>
supabase db push                                   # migration-ууд (seed ОРОХГҮЙ)
supabase secrets set --env-file ./supabase/.env.production   # git-д оруулахгүй
supabase functions deploy
```

Production secrets: `QPAY_BASE_URL` (https://merchant.qpay.mn), `QPAY_USERNAME`, `QPAY_PASSWORD`, `QPAY_INVOICE_CODE`, `STATS_SALT_SECRET`, `TURNSTILE_SECRET`, `PUBLIC_FUNCTIONS_URL`, `CRON_SECRET`, `PUBLIC_APP_URL`, `ALLOWED_ORIGINS`, `RESEND_API_KEY`, `MAIL_FROM`, `ANTHROPIC_API_KEY` (заавал биш: `AI_MODEL`). `ANTHROPIC_BASE_URL`-ийг production-д тавихгүй. `TURNSTILE_VERIFY_URL`-ийг production-д тавихгүй.

Cron-ийг идэвхжүүлэх (SQL editor дээр нэг удаа, утгыг Vault-д хадгална):

```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1', 'functions_url');
select vault.create_secret('<CRON_SECRET-тэй ижил>', 'cron_secret');
```

Auth: Dashboard → Authentication → MFA → TOTP идэвхжүүлнэ (админ эрх `aal2` шаардана).

## 6. Үнэ, лимит солих

Үнэ, лимит нь `plans` хүснэгтэд. Кодонд hardcode хийхгүй. Солихдоо шинэ migration бичнэ:

```sql
update public.plans set price_mnt = 12900 where id = 'pro';
update public.plans set price_annual_mnt = 99000 where id = 'pro';   -- жилийн үнэ
```

## 7. TypeScript төрөл

```bash
npm run types   # → ../packages/shared/src/database.types.ts
```
