# Mobile QA

| Файл | Юу шалгах |
|---|---|
| `store-check.mjs` | **STORE-01** — mobile эх код + bundle-д орсон бүх first-party модульд «₮», «QPay», «/billing», «Pro-д шилжих» байхгүй; `packages/shared/src/plans.ts` bundle-д ороогүй |
| `flows/*.yaml` | [Maestro](https://maestro.mobile.dev) — нэвтрэх/session, QR, deep link → скан үр дүн, contacts CRUD, багц дууссан, бүртгэл устгах |

```bash
npm --prefix ../../mobile run export:android   # bundle + source map
node store-check.mjs                            # STORE-01

# Development build суулгасан emulator / утас дээр:
maestro test flows/
QA_DELETE_EMAIL=... QA_DELETE_PASSWORD=... maestro test flows/06-delete-account.yaml
```

Камерыг Maestro удирдаж чадахгүй тул скан хийсний үр дүнг ижил deep link-ээр (`https://<domain>/c/<slug>`) дуудаж шалгана. Жинхэнэ камераар скан хийхийг гараар (TEST_PLAN.md, M-02) шалгана.
