# Digital Card

Үнэгүй дижитал нэрийн хуудас + уулзалтын санах ой (contact exchange, CRM, follow-up). Web-first, Supabase + QPay.

```
DigitalCard/
├── backend/          # Prompt 00 — Supabase (migrations, RLS, Edge Functions, seed, tests)  ✅
├── packages/shared/  # types, plans copy, zod, vCard, templates, i18n (MN/EN)               ✅
├── web/              # Prompt 01 — React + Vite                                             ⏳
├── mobile/           # Prompt 02, 03 — Expo (Android, iOS)                                  ⏳
├── qa/               # Prompt 04 — Playwright, API, k6, Maestro                             ⏳
└── docs/             # DECISIONS.md, төслийн баримтууд
```

## Хурдан эхлэх

```bash
cd backend
cp supabase/.env.example supabase/.env   # бөглө (backend/README.md)
supabase start && supabase db reset
npm run mock &                           # QPay + Turnstile mock
npm test                                 # pgTAP + Edge Function тест

cd ../packages/shared
npm install && npm test && npm run typecheck && npm run lint
```

Дэлгэрэнгүй: [backend/README.md](backend/README.md), шийдвэрүүд: [docs/DECISIONS.md](docs/DECISIONS.md).

## Нийтлэг дүрэм

- TypeScript strict, ESLint + Prettier
- Үнэ, лимит зөвхөн `plans` хүснэгтэд
- Эрх шалгалт = RLS + DB функц/trigger. Frontend зөвхөн UI нуудаг
- Төлбөр зөвхөн веб (QPay v2). Mobile апп дотор үнэ, төлбөр байхгүй
- IP хадгалахгүй; зочны hash нь өдрийн salt-тай
- Нууц түлхүүр `.env`-д (git-д орохгүй), QPay түлхүүр зөвхөн Edge Function secret
