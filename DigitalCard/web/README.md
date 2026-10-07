# Digital Card — Web (React + Vite)

Нийтийн карт, editor, CRM, статистик, QPay төлбөр, байгууллага, платформ админ.

## Ажиллуулах

```bash
cd ../backend && supabase start && supabase db reset   # backend (../backend/README.md)
cd ../web
cp .env.example .env.local      # VITE_SUPABASE_ANON_KEY = `supabase status`-ийн ANON_KEY
npm install
npm run dev                     # http://localhost:5173
```

| Команд | Үүрэг |
|---|---|
| `npm run dev` | Хөгжүүлэлтийн сервер |
| `npm run build` | `tsc -b` + production build (`dist/`) |
| `npm run typecheck` / `npm run lint` | TypeScript strict, ESLint |
| `npm test` | Vitest (огноо, CSV, статистик, i18n) |

E2E (Prompt 01/04-ийн шалгуурууд): `cd ../qa && npm install && npm run test:e2e`.

## Орчны хувьсагч

| Нэр | Тайлбар |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase (anon түлхүүр нийтэд ил байдаг, нууц биш) |
| `VITE_PUBLIC_BASE_URL` | QR, хуваалцах линкийн домэйн (`https://digitalcard.mn`) |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| (PWA) | `public/manifest.webmanifest`, `public/sw.js` — тохиргоогүй; production build-д л бүртгэгдэнэ |
| `VITE_DEMO_MODE` | `true` зөвхөн local demo-д: demo нэвтрэх товч, «зочин болж нээх». Production-д `false` — demo бүртгэл, нууц үг bundle-д огт орохгүй |

## Бүтэц

```
src/
├── App.tsx               route + lazy loading
├── pages/
│   ├── PublicCard.tsx    /c/:slug — supabase-js-гүй, хамгийн жижиг bundle
│   ├── Landing.tsx, Legal.tsx (legal/*.md), auth/*
│   ├── app/              Dashboard, CardEditor, CardPrint, Contacts, Stats, Billing, Org, Settings
│   └── admin/Admin.tsx   MFA (TOTP) шаардана
├── templates/            10 загвар, нэг CardData interface (parts.tsx: AutoFitText, Avatar…)
├── components/           UI, QR, Turnstile, ExchangeForm (нээгдэх үед ачаална), PayModal, Passkeys, WalletButton, TwoFactor
├── lib/                  supabase, auth, queries, dates (Asia/Ulaanbaatar), print геометр
└── i18n/                 web.mn.json / web.en.json (+ packages/shared i18n)
netlify.toml              SPA redirect, /c/* 60с кэш, CSP / X-Frame-Options / Referrer-Policy, sw.js no-cache
public/                   manifest.webmanifest, sw.js (PWA), icons/, .well-known (universal links + passkey)
netlify/edge-functions/   card-og.ts — /c/:slug-д OG meta tag тарина
```

Стек: React 19.3 + React Compiler, React Router 7 (View Transitions), Vite 8, Tailwind 4 (`src/index.css` `@theme`), TypeScript 7 typecheck. WCAG 2.2 AA (axe 0 зөрчил, 2026-10-07).

## Шалгуурын үр дүн (local, 2026-10-04; шинэчлэл 2026-10-07 — `docs/AUDIT_2026-10.md`)

| # | Шалгуур | Үр дүн |
|---|---|---|
| 1 | Бүртгэл → Pro (QPay mock) → карт → нийтлэх → өөр хөтөчөөс /c/:slug | ✅ E2E |
| 2 | `?src=qr` → qr_open тоологдоно; .vcf кирилл зөв | ✅ E2E (жинхэнэ утсан дээрх шалгалт QA-д) |
| 3 | 10 загвар × 2 өнгө, урт нэр эвдрэхгүй | ✅ E2E (20 screenshot) |
| 4 | PDF 96×61 мм, PNG 300 dpi (1134×720), QR 24 мм | ✅ E2E |
| 5 | Бүх хугацаа ≥ 30 ≥ 7 ≥ Өнөөдөр | ✅ E2E + unit |
| 6 | Багц дууссан → засварлах боломжгүй, карт нийтэд | ✅ E2E |
| 7 | Lighthouse mobile /c/:slug | Performance 97, Accessibility 100, SEO 100 |
| 8 | Production build-д demo текст/нууц үг байхгүй | ✅ `grep` цэвэр |
| 9 | Зочин exchange → contacts (source=exchange); Free хязгаар → мессеж | ✅ E2E + backend тест |
| 10 | Өнөөдрийн follow-up dashboard-д; [Холбогдсон] → алга болно | ✅ E2E |
| 11 | Free CRM талбар UI-д түгжээтэй (DB ч татгалзана) | ✅ E2E + pgTAP |
| 12 | Passkey нэмэх/нэвтрэх, Wallet, PWA офлайн, e-barimt QR | ✅ E2E (passkey, wallet, pwa, fun-01) |
| 13 | Нийтийн карт Slow 4G | LCP 2.05 с, CLS 0, JS 390 KB |
