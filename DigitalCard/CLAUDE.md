# Digital Card — Claude Code-д зориулсан заавар

Monorepo: `backend/` (Supabase), `packages/shared/`, `web/` (Vite + React), `mobile/` (Expo SDK 57), `qa/`, `docs/`.

## Хатуу дүрэм
- Эрх, квот, төлбөрийг **зөвхөн DB** (RLS + trigger + SECURITY DEFINER функц) шийднэ. UI нь нуудаг л. Шинэ дүрэм = шинэ migration + pgTAP тест.
- Schema-г зөвхөн `backend/supabase/migrations/NNNN_*.sql`-ээр өөрчилнө; хуучин migration-ыг засахгүй.
- Үнэ, лимит зөвхөн `plans` хүснэгтэд. Кодонд hardcode хийхгүй.
- **Mobile-д үнэ, «₮», «QPay», «/billing», upsell текст огт байхгүй** — `npm run test:store --prefix qa`.
- IP хаяг хадгалах, лог-д бичихгүй. Нууц түлхүүрийг код/лог/commit-д бичихгүй (`.env`, Edge Function secret).
- TypeScript strict. `packages/shared`-ийг дэд замаар импортлох (`@digitalcard/shared/vcard`) — нийтийн картын bundle-ийг жижиг байлгана.
- Expo: санах ойгоос биш, `mobile/node_modules/<pkg>/build/*.d.ts`-ээс API шалгах (AGENTS.md).
- Шийдвэр бүрийг `docs/DECISIONS.md`-д тэмдэглэ.
- Шинэ хувийн мэдээлэл, гадаад боловсруулагч, эрх (permission) нэмбэл: `web/src/legal/privacy.*.md`, `docs/store/*.md` (privacy label / Data safety), `mobile/app.config.ts` privacyManifests-ийг шинэчил (PDPL: гадаадад дамжуулахад зөвшөөрөл).
- Төлбөр бүр e-barimt-тэй (0014) — төлбөрийн урсгалыг өөрчилбөл TAX-01 тест ногоон байх ёстой.

## Шалгах
```bash
scripts/dev-up.sh --reset                       # Supabase + mock
npm --prefix backend test                       # pgTAP + Edge Functions
cd qa && npm run test:api && npm run test:e2e && npm run test:store
cd packages/shared && npx vitest run ; cd web && npm run typecheck && npm run lint && npm test
cd mobile && npm run typecheck && npm run lint
```
Логик: `docs/LOGIC.md` · Хэрэглэгчийн гарын авлага: `docs/USER_GUIDE.md`.
