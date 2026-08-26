# DevOps, Infraestrutura e Fluxo de Trabalho — App

## 1. Node.js e tooling

- **Node.js 22.19.0** — [`.nvmrc`](../../.nvmrc), `package.json` → `engines.node`.
- **Pre-commit** — Husky + lint-staged (Prettier + ESLint).
- **Antes de PR** — `npm test`, `npm run check`, `npm run build` (recomendado).

## 2. CI/CD (GitHub Actions)

| Workflow                                                     | Gatilho                    | Pipeline                        |
| ------------------------------------------------------------ | -------------------------- | ------------------------------- |
| [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) | **Somente** `pull_request` | lint → typecheck → test → build |

Não há CI em push direto a `main`/`homolog` — o gate é a PR (job `CI / verify`).

Branch **`homolog`** agrupa features para QA manual antes de merge em `main`. Não há branch `develop`.

Branch protection obrigatória (CI-04) **não está disponível** em repo privado no plano Free.

**Política humana (mitigação aceita):** todo merge em `main`/`homolog` via PR com check **`CI / verify`** verde; não fazer push direto que contorne a CI. Upgrade Pro ou repo público só se quiser enforce na plataforma.

## 3. Branches

| Branch                      | Uso                                                                     |
| --------------------------- | ----------------------------------------------------------------------- |
| `main`                      | Produção / integração estável                                           |
| `homolog`                   | QA integrado (servidor local ou ambiente de homologação)                |
| `feat/…`, `fix/…`, `docs/…` | Features a partir de `main`; PR para `main` ou agrupamento em `homolog` |

## 4. Commits

Prefixos [Conventional Commits](https://www.conventionalcommits.org/) com **mensagem em pt-BR**:

```
feat: adicionar rate limit em listagem de imagens
fix: corrigir filtro de soft delete sem deletedAt
docs: atualizar guidelines de arquitetura
test: cobrir toPublicUser contra vazamento de hash
ci: restringir Actions a pull_request
```

## 5. Infra local

- **MongoDB** — Docker Compose, porta host **27717** (ver README).
- **Cron** — `npm run cron -- …` / jobs em [`scripts/cron/`](../../scripts/cron/); doc [`docs/operators/cron.md`](../operators/cron.md).
- **Healthcheck** — `npm run healthcheck` antes de subir em ambiente novo.
- **Graceful shutdown** — SIGTERM → `prisma.$disconnect` ([`docs/operators/graceful-shutdown.md`](../operators/graceful-shutdown.md)).

### Scripts operacionais

Índice completo: [`scripts/README.md`](../../scripts/README.md). Destrutivos exigem `--confirm`; preferir `--dry-run`.

## 6. Twelve-Factor (aplicável)

- Config via env; backing services substituíveis; logs em stdout (`LogManager`); startup rápido.

**Fora de escopo atual:** filas RabbitMQ/BullMQ (backlog REL-05), CDN (SCALE-03).
