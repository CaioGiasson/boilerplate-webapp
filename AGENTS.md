# AGENTS.md — Boilerplate Webapp

Guia conciso para agentes de IA e contribuidores. Detalhes de setup local: [`README.md`](README.md).

## Fluxo obrigatório (zero ad-hoc)

**Não há tarefas ad-hoc.** Todo pedido de implementação segue: refinar → **issue no board** → branch → implementar → PR (`Closes #N`) → review (`Reviewed`). Pedido direto no chat, checkup ou “só desta vez” **não** isenta issue. Detalhes: [`.cursor/rules/issue-workflow.mdc`](.cursor/rules/issue-workflow.mdc) e [`docs/issue-workflow.md`](docs/issue-workflow.md).

## Stack

- **Node.js 22.19.0** (ver [`.nvmrc`](.nvmrc) e `package.json` → `engines`)
- Next.js 15 (App Router) + React 19 + TypeScript strict
- Prisma + MongoDB
- Tailwind CSS, next-intl (pt/en/es)
- Jest, ESLint, Prettier, Husky

## Idioma

| O quê                                                       | Idioma                |
| ----------------------------------------------------------- | --------------------- |
| Código (variáveis, funções, tipos, arquivos `*.ts`/`*.tsx`) | **Inglês**            |
| Commits, PRs, comentários no código, docs do repo           | **Português (pt-BR)** |

Guidelines: [`docs/guidelines/CONVENTIONS.md`](docs/guidelines/CONVENTIONS.md) (nomenclatura, tipagem, limpeza — **obrigatório** para código novo).

## Camadas (resumo)

Ver [`docs/architecture.md`](docs/architecture.md). Sufixos: `*.usecase.ts`, `*.repository.ts`, `*.route.ts`.

## Pre-commit (lint-staged)

Husky roda **lint-staged** no commit: Prettier em `**/*` (`package.json` → `lint-staged`). Formata o staging inteiro de propósito — não restringir globs sem motivo. Pular hooks só com pedido explícito (`--no-verify` proibido nos Never).

## Comandos

| Comando                    | Efeito                                                                       |
| -------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`              | Dev server (Turbopack) + Prisma generate; porta `SERVER_PORT` (default 3000) |
| `npm run build`            | Build de produção (inclui checagem de tipos via Next)                        |
| `npm run start`            | Servidor após `build` (porta `SERVER_PORT`, default 3000)                    |
| `npm test`                 | Jest (`tests/` espelha `src/`)                                               |
| `npm run lint`             | ESLint                                                                       |
| `npm run check`            | Prettier (write) + ESLint                                                    |
| `npm run typecheck`        | `tsc --noEmit` (app; ver `tsconfig.typecheck.json`)                          |
| `npm run healthcheck`      | Sondas locais de dependências (ver abaixo)                                   |
| `npm run test-environment` | Valida deps + integração real Brevo e Google OAuth                           |
| `npm run prisma:push`      | Sincroniza schema Prisma → MongoDB (**altera o DB**)                         |

Índice completo de scripts operacionais: [`scripts/README.md`](scripts/README.md).

### `npm run healthcheck`

Script CLI (`scripts/healthcheck.mjs`) — **não** envia e-mail de produção; valida integração/configuração.

| Sonda         | O que testa                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `environment` | Variáveis obrigatórias (`DATABASE_URL`, `JWT_SECRET`, `SPACES_*`, `ENVIRONMENT`, …)                                                   |
| `database`    | Ping Mongo via Prisma (`$runCommandRaw({ ping: 1 })`)                                                                                 |
| `spaces`      | `HeadBucket` no bucket DigitalOcean Spaces                                                                                            |
| `jwt`         | Assina e verifica JWT de teste (segredo válido)                                                                                       |
| `brevo`       | Se `EMAIL_PROVIDER=brevo`: `GET /v3/account` na API Brevo (API key + `EMAIL_FROM` presentes). Se `none`/`disabled`: **skipped** (ok). |

### `npm run test-environment`

Script CLI (`scripts/test-environment.mjs`) — mais rigoroso que o healthcheck: exige **Brevo** (`EMAIL_PROVIDER=brevo` + `GET /v3/account`) e **Google OAuth** (OpenID discovery + probe de credenciais no token endpoint). Exit ≠ 0 se qualquer check falhar. Não loga secrets.

Para smoke de **envio** real: `npm run test-email -- destino@example.com` (não roda em produção).

Rotas HTTP `/api/health` e `/api/health/database` são separadas (loopback ou token); listagem em [`requests/README.md`](requests/README.md).

## Camadas

```
HTTP: app/api → controller → useCase → (services | repositories)
```

| Camada           | Pasta                           | Responsabilidade                               |
| ---------------- | ------------------------------- | ---------------------------------------------- |
| Rota Next        | `src/app/api/`                  | Thin wrapper: chama controller                 |
| Controller       | `src/controllers/`              | Parse HTTP, Zod, chama useCase, monta resposta |
| Use case         | `src/useCases/`                 | Regras de domínio; estende `UseCaseMasterPort` |
| Repository       | `src/repositories/`             | **Único** lugar com Prisma direto              |
| Service          | `src/services/`                 | Integrações externas (Spaces, Brevo, etc.)     |
| Composition root | `src/container/dependencies.ts` | Instancia e injeta dependências                |

Regras de dependência e diagrama: [`docs/architecture.md`](docs/architecture.md).  
Glossário de domínio: [`docs/glossary.md`](docs/glossary.md).  
Decisões arquiteturais: [`docs/adr/README.md`](docs/adr/README.md).  
Guidelines do time: [`docs/guidelines/`](docs/guidelines/).

### Convenções de arquivo

- `*.usecase.ts`, `*.repository.ts`, `*.route.ts`
- Testes espelhados em `tests/useCases/`, `tests/controllers/`, etc.
- UI em `src/components/`; textos em `src/constants/texts/{pt,en,es}.ts`

## Never (guardrails)

**Nunca** faça o seguinte sem instrução explícita do mantenedor:

| Proibido                                                                                                                 | Motivo                                    |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `git push --force` em `main`/`master`                                                                                    | Histórico compartilhado                   |
| Commitar `.env`, secrets, cookies Pinterest                                                                              | Vazamento de credenciais                  |
| Rodar scripts de operador em produção (`list-users`, `export-from-pinterest`, migrações Spaces sem `--dry-run` primeiro) | Risco operacional / LGPD                  |
| Scripts destrutivos sem `--confirm`                                                                                      | Exigem confirmação explícita              |
| `prisma:push` em banco compartilhado/prod sem revisão                                                                    | Altera schema/dados no Mongo              |
| Instanciar `PrismaClient` ou `getPrismaClient()` fora de repository/use case TX / fases ADR-007                          | Quebra unidade de trabalho                |
| Acessar Mongo/Spaces direto de controller ou componente React                                                            | Viola camadas                             |
| Strings de UI hardcoded em componentes                                                                                   | Use catálogos i18n (ver checklist abaixo) |
| Endpoint novo/alterado sem `requests/*.http` + `docs/openapi.yaml`                                                       | Contrato HTTP obrigatório                 |
| `--no-verify` / pular hooks sem pedido                                                                                   | Pre-commit formata e valida               |
| Alterar `git config` do ambiente                                                                                         | Política do projeto                       |
| Implementar sem issue no board (tarefa ad-hoc)                                                                           | Sempre issue → branch → PR                |
| Review de PR só com Bugbot/ferramenta externa                                                                            | Usar `.cursor/rules/pr-review.mdc`        |

Regras Cursor: [`.cursor/rules/issue-workflow.mdc`](.cursor/rules/issue-workflow.mdc), [`.cursor/rules/git-workflow.mdc`](.cursor/rules/git-workflow.mdc), [`.cursor/rules/api-contracts.mdc`](.cursor/rules/api-contracts.mdc), [`.cursor/rules/pr-review.mdc`](.cursor/rules/pr-review.mdc), [`.cursor/rules/task-approval.mdc`](.cursor/rules/task-approval.mdc), [`.cursor/rules/use-cases.mdc`](.cursor/rules/use-cases.mdc), [`.cursor/rules/repositories.mdc`](.cursor/rules/repositories.mdc).

## DTO / bordas de API

Checklist: [`docs/dto-checklist.md`](docs/dto-checklist.md). Testes: `tests/repositories/publicUser.dto.test.ts`.

## Contratos HTTP — checklist (obrigatório)

Todo endpoint **criado ou alterado** na mesma PR:

- [ ] Request em `requests/**/*.http` (arquivo da área ou novo + índice)
- [ ] Linha no inventário de [`requests/README.md`](requests/README.md)
- [ ] Path/método/auth/schema em [`docs/openapi.yaml`](docs/openapi.yaml) (Swagger UI lê este arquivo)

Regra Cursor: [`.cursor/rules/api-contracts.mdc`](.cursor/rules/api-contracts.mdc). Faltar isso = **bloqueante** na review.

## i18n — checklist

Antes de abrir PR com UI nova ou alterada:

- [ ] Texto visível ao usuário vem de `src/constants/texts/` (pt, en, es) ou `next-intl`
- [ ] Chaves novas adicionadas nos três catálogos + tipos em `types.ts`
- [ ] Mensagens de erro de API expostas ao usuário também internacionalizadas quando couber
- [ ] Não introduzir string literal em JSX/TSX exceto dados dinâmicos (URLs, IDs, números)

Catálogos: `src/constants/texts/{pt,en,es,types}.ts`. Locales: `pt`, `en`, `es`.

## Fluxo de issues e PRs

Board: [App — Project board](https://github.com/users/CaioGiasson/projects/4/views/1)

### Gate antes de implementar

Pedidos como **“Faça uma tela…”**, **“Coloque uma seção…”**, **“Crie um endpoint…”** (e análogos — inclusive checkup, refactor e catálogo) exigem **refinamento → issue no board → branch → implementação**. Não codificar direto. **Não existem tarefas ad-hoc.**

### Sequência

1. Issues refinadas com contexto, escopo e critérios de aceite — ver [`docs/issue-workflow.md`](docs/issue-workflow.md)
2. Assignee ao iniciar; perguntas/respostas como comentários na issue
3. Branch a partir de `main`; commits em **pt-BR**; **push** na branch remota ao concluir (sem esperar pedido de commit)
4. PR com summary + test plan; vincular issue; documentação no repo quando couber
5. **`homolog`** — branch de QA integrado (sem CI em push; o gate é a PR)
6. **CI** — `.github/workflows/ci.yml` roda **somente em `pull_request`** (lint, typecheck, test, build). **Política humana (CI-04):** merge só com check `CI / verify` verde — branch protection não disponível em repo privado Free.
7. Após abrir PR: review conforme [`.cursor/rules/pr-review.mdc`](.cursor/rules/pr-review.mdc) e [`docs/issue-workflow.md`](docs/issue-workflow.md) (seção Review de PRs); corrigir bloqueantes/importantes; comentar resultado; label **`Reviewed`**. Bugbot **não** substitui este fluxo.

Contribuição humana: [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Memória de lições (`tasks/lessons.md`)

Após corrigir bug **não óbvio** ou incidente operacional, adicione entrada curta em [`tasks/lessons.md`](tasks/lessons.md) (sintoma → causa → fix/prevenção). Não duplicar README.

## Assessments e reports

| Documento                                                                                                       | Descrição              |
| --------------------------------------------------------------------------------------------------------------- | ---------------------- |
| [`AI-READINESS-ASSESSMENT.md`](AI-READINESS-ASSESSMENT.md) / [`AI-READINESS-REPORT.md`](AI-READINESS-REPORT.md) | Prontidão para agentes |
| [`SECURITY-ASSESSMENT.md`](SECURITY-ASSESSMENT.md) / [`SECURITY-REPORT.md`](SECURITY-REPORT.md)                 | Segurança              |
| [`PRIVACY-ASSESSMENT.md`](PRIVACY-ASSESSMENT.md) / [`PRIVACY-REPORT.md`](PRIVACY-REPORT.md)                     | Privacidade / LGPD     |
| [`PERFORMANCE-ASSESSMENT.md`](PERFORMANCE-ASSESSMENT.md) / [`PERFORMANCE-REPORT.md`](PERFORMANCE-REPORT.md)     | Performance            |
