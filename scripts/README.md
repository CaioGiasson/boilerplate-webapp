# Scripts — índice de comandos

Mapeamento `npm run …` → efeito. Setup geral: [`README.md`](../README.md). Guardrails: [`AGENTS.md`](../AGENTS.md).

**Legenda:** 🔴 destrutivo/mutante · 🟡 operador local · 🟢 seguro/dev · `--dry-run` lista sem mutar · `--confirm` executa mutação

## Desenvolvimento e build

| Comando                        | Efeito                                                            | Flags              | Prod?              |
| ------------------------------ | ----------------------------------------------------------------- | ------------------ | ------------------ |
| `npm run dev`                  | Prisma merge/generate + Next dev (Turbopack); porta `SERVER_PORT` | —                  | 🟢                 |
| `npm run build`                | Build de produção                                                 | —                  | 🟢                 |
| `npm run start`                | Servidor após build (porta `SERVER_PORT`)                         | —                  | 🟢                 |
| `npm run lint`                 | ESLint                                                            | —                  | 🟢                 |
| `npm run typecheck`            | `tsc --noEmit` (app)                                              | —                  | 🟢                 |
| `npm run analyze`              | Build com `@next/bundle-analyzer` (FE-05)                         | `ANALYZE=true`     | 🟡 local           |
| `npm run check`                | Prettier write + ESLint                                           | —                  | 🟢                 |
| `npm test`                     | Jest                                                              | —                  | 🟢                 |
| `npm run prisma-merge`         | Merge `prisma/models/*.prisma`                                    | —                  | 🟢                 |
| `npm run prisma:generate`      | Merge + `prisma generate`                                         | —                  | 🟢                 |
| `npm run prisma:push`          | Sync schema → MongoDB                                             | —                  | 🔴 cuidado em prod |
| `npm run healthcheck`          | Valida env, Mongo, Spaces, JWT (Google opcional)                  | —                  | 🟢                 |
| `npm run test-environment`     | Valida deps + integração real Brevo e Google OAuth                | —                  | 🟢                 |
| `npm run load:k6`              | Teste de carga k6 (list + login)                                  | `BASE_URL`, `K6_*` | 🟡 local/staging   |
| `npm run smoke:multi-instance` | Smoke 2 processos (SCALE-04)                                      | `BASE_URL_A/B`     | 🟡 local           |

## MongoDB local

| Comando                         | Script                       | Efeito                                       | Flags | Prod?           |
| ------------------------------- | ---------------------------- | -------------------------------------------- | ----- | --------------- |
| `npm run mongo:keyfile`         | `generate-mongo-keyfile.mjs` | Gera `secrets/mongo-keyfile` (gitignored)    | —     | 🟢 local        |
| `npm run mongo:migrate-to-auth` | `mongo-migrate-to-auth.mjs`  | Cria/atualiza user admin no container Docker | —     | 🔴 local Docker |

## DigitalOcean Spaces

| Comando                        | Script                       | Efeito                                        | Flags                     | Prod? |
| ------------------------------ | ---------------------------- | --------------------------------------------- | ------------------------- | ----- |
| `npm run spaces:make-private`  | `migrate-spaces-private.mjs` | ACL `private` em objetos legados              | `--dry-run` · `--confirm` | 🔴    |
| `npm run spaces:migrate-keys`  | `migrate-spaces-keys.mjs`    | CopyObject + update Mongo + delete key antiga | `--dry-run` · `--confirm` | 🔴    |
| `npm run spaces:purge-orphans` | `purge-orphan-files.mjs`     | Alias → retention purge                       | `--dry-run` · `--confirm` | 🔴    |

Doc migração de keys: [`docs/operators/spaces-key-migration.md`](../docs/operators/spaces-key-migration.md).

## Cron / retenção

| Comando                           | Script                          | Efeito                                | Flags                     | Prod? |
| --------------------------------- | ------------------------------- | ------------------------------------- | ------------------------- | ----- |
| `npm run cron -- <job>`           | `cron/run.mjs`                  | Dispatcher de jobs                    | job args                  | varia |
| `npm run cron -- retention-purge` | `cron/jobs/retention-purge.mjs` | Purga dados/arquivos expirados (LGPD) | `--dry-run` · `--confirm` | 🔴    |
| `npm run cron:retention`          | idem                            | Atalho direto ao job retention        | `--dry-run` · `--confirm` | 🔴    |

Exemplo cron: `npm run cron -- retention-purge --dry-run`

## Backfills (Mongo)

| Comando                                    | Script                                 | Efeito                                   | Flags                     | Prod? |
| ------------------------------------------ | -------------------------------------- | ---------------------------------------- | ------------------------- | ----- |
| `npm run backfill-image-visibility`        | `backfill-image-visibility.mjs`        | Define `visibility: PUBLIC` onde ausente | —                         | 🔴    |
| `npm run backfill:hide-from-global-mosaic` | `backfill-hide-from-global-mosaic.mjs` | Sync `hideFromGlobalMosaic` (DATA-04)    | —                         | 🔴    |
| `npm run nickname:backfill`                | `backfill-nickname-canonical.mjs`      | Normaliza nickname canonical             | `--dry-run` · `--confirm` | 🔴    |
| `npm run email:backfill-verified`          | `backfill-email-verified.mjs`          | Backfill `emailVerifiedAt`               | —                         | 🔴    |

## Operador / debug (recusa produção)

Scripts com `refuseIfProduction()` — **não rodar no host de `next start`**.

| Comando                         | Script                      | Efeito                                        | Args          | Prod?          |
| ------------------------------- | --------------------------- | --------------------------------------------- | ------------- | -------------- |
| `npm run list-users`            | `list-users.mjs`            | Lista 10 usuários recentes (e-mail mascarado) | —             | 🟡 recusa prod |
| `npm run export-from-pinterest` | `export-from-pinterest.mjs` | Baixa boards Pinterest → `exports/`           | URL, `-test`  | 🟡 recusa prod |
| `npm run test-email`            | `test-email.mjs`            | Smoke send Brevo                              | `recipient@…` | 🟡 recusa prod |
| `npm run unconfirm-account`     | `unconfirm-account.mjs`     | Reseta verificação de e-mail                  | `user@…`      | 🟡 recusa prod |

## Padrão dry-run / confirm

Scripts mutantes exigem **`--confirm`** ou **`--dry-run`**:

```bash
npm run spaces:migrate-keys -- --dry-run    # preview
npm run spaces:migrate-keys -- --confirm    # executa
```

Implementação compartilhada: `scripts/cron/lib/args.mjs`, `scripts/lib/operator.mjs`.

## Husky

| Comando           | Efeito                                                     |
| ----------------- | ---------------------------------------------------------- |
| `npm run prepare` | Instala hooks Husky (pre-commit: prettier via lint-staged) |

## Referências

- [`AGENTS.md`](../AGENTS.md) — bloco **Never**
- [`docs/operators/`](../docs/operators/) — runbooks detalhados
- [`docs/operators/database-pool.md`](../docs/operators/database-pool.md) — pool Prisma/Mongo (DATA-06)
- [`docs/operators/multi-instance-smoke.md`](../docs/operators/multi-instance-smoke.md) — SCALE-04
- [`tests/load/list-and-auth.k6.js`](../tests/load/list-and-auth.k6.js) — QA-03 k6 script
- [`tasks/lessons.md`](../tasks/lessons.md) — incidentes conhecidos
