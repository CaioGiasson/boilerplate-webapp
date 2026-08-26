# Relatório de AI-readiness — Vitraux

> **Referência normativa:** `AI-READINESS-ASSESSMENT.md` (checklist absoluto, genérico). Este arquivo confronta cada item com o **codebase Vitraux** e gera backlog para tornar o repositório mais eficiente para agentes de IA.

| Campo          | Valor                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------- |
| Tipo           | Revisão whitebox de **prontidão para agentes de IA**                                          |
| Alvo           | `CaioGiasson/vitraux` (Next.js 15, Prisma/Mongo, single package)                              |
| Data           | 2026-08-25                                                                                    |
| Escopo         | Docs para agentes, estrutura, contratos, testes, tooling, contexto, i18n, scripts, guardrails |
| Fora de escopo | Qualidade do modelo de IA escolhido; custo de API; prompts fora do repo                       |

**Legenda de Status:** `Aberto` · `Mitigado` · `Não aplica`

**Complexidade (1–5)** / **Confiança (1–5):** mesmas convenções dos outros reports.

---

## Resumo executivo

O Vitraux está **bem preparado** para agentes: `AGENTS.md`/`CLAUDE.md`, CONTRIBUTING, ADRs, glossário, arquitetura documentada, OpenAPI + Swagger gated, CI em PR (`lint` / `typecheck` / `test` / `build` com `prisma:generate`), templates GitHub, CODEOWNERS, `tasks/lessons.md`, i18n e assessments com IDs estáveis.

Importantes AI desta leva mitigados (STRUCT-03, CONTRACT-02 mutações). Residuais de produto ficam no PERFORMANCE-REPORT.

| Área                   | Críticos abertos | Importantes abertos | Minors abertos | Não aplica |
| ---------------------- | ---------------: | ------------------: | -------------: | ---------: |
| AI-readiness (Vitraux) |                0 |                   3 |              8 |          2 |

> Todos os **6 críticos** (AGENT-01, DOC-02, CONTRACT-03, TOOL-02, TOOL-03, CTX-02) → **Mitigado** (PRs #176/#178 e lote anterior de docs).

**Assessment genérico:** 37 códigos · neste repo: maioria ✅ nos positivos ou Mitigado · gaps nas tabelas Importantes/Minors.

---

## Controles positivos observados (já ✅ no Vitraux)

| Código      | Evidência                                                                      |
| ----------- | ------------------------------------------------------------------------------ |
| AGENT-02    | `.cursor/rules/issue-workflow.mdc`, `pr-review.mdc` + `docs/issue-workflow.md` |
| DOC-01      | `README.md` (stack, camadas, comandos, endpoints, scripts)                     |
| DOC-05      | `.env.example` alinhado a `src/config/env.ts`                                  |
| STRUCT-01   | `src/controllers`, `useCases`, `repositories`, `services`, `masterPorts`       |
| STRUCT-02   | Sufixos `*.usecase.ts`, `*.repository.ts`, rotas por domínio                   |
| STRUCT-04   | Single `package.json` (claro)                                                  |
| STRUCT-05   | `scripts/`, `docs/operators/`, app em `src/`                                   |
| CONTRACT-01 | `tsconfig.json` `strict` + `noImplicitAny`                                     |
| CONTRACT-02 | Zod/schemas em rotas sensíveis                                                 |
| CONTRACT-03 | `docs/openapi.yaml` + `/api/docs` (gated `SWAGGER_*`)                          |
| TEST-01     | `tests/useCases/**` amplo                                                      |
| TEST-02     | Espelho `tests/` ↔ `src/`                                                     |
| TEST-03     | `npm test` (Jest)                                                              |
| TOOL-01     | ESLint + Prettier + husky/lint-staged                                          |
| TOOL-02     | `npm run typecheck` + CI                                                       |
| TOOL-03     | `.github/workflows/ci.yml` em `pull_request`                                   |
| CTX-01      | `.gitignore` cobre `.env`, build, deps                                         |
| CTX-02      | `.cursorignore`                                                                |
| CTX-03      | `SECURITY` / `PRIVACY` / `PERFORMANCE` / `AI-READINESS` ASSESSMENT+REPORT      |
| CTX-04      | Issues refinadas + `tasks/refinamento-*.md`                                    |
| CTX-05      | Regra de PR review + label `Reviewed`                                          |
| I18N-01     | `src/constants/texts/{pt,en,es,types}.ts` + next-intl                          |
| SCRIPT-01   | Scripts nomeados no `package.json`                                             |
| SAFE-01     | `.env` gitignored; examples; scripts recusam prod                              |

---

## 1. Críticos

Sem estes, o agente gasta muitos tokens explorando e erra escopo/ambiente/contrato com frequência. **Todos mitigados (2026-08-25).**

| ID          | Status   | Complexidade | Confiança | Achado (histórico)                             | Onde / evidência                                     | Impacto (antes)                               | Mitigação entregue                                                     |
| ----------- | -------- | -----------: | --------: | ---------------------------------------------- | ---------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- |
| AGENT-01    | Mitigado |            2 |         5 | Não havia `AGENTS.md` / `CLAUDE.md`.           | raiz                                                 | Cada sessão redescobria stack e guardrails.   | `AGENTS.md` + `CLAUDE.md` com run/test/layers/Never.                   |
| DOC-02      | Mitigado |            3 |         5 | Sem mapa formal de camadas.                    | `docs/architecture.md`                               | Violação de camadas / infra no lugar errado.  | Doc + mermaid rota→UC→repo→service.                                    |
| CONTRACT-03 | Mitigado |            3 |         4 | Sem OpenAPI; contrato só README + `requests/`. | `docs/openapi.yaml`, `/api/docs`, `swaggerAccess.ts` | Paths inventados; regressão de API.           | Inventário OpenAPI + Swagger gated (`SWAGGER_*`) + índice `requests/`. |
| TOOL-03     | Mitigado |            2 |         5 | Sem CI em PR (também PERFORMANCE CI-02).       | `.github/workflows/ci.yml`                           | Sem oráculo compartilhado de “verde”.         | Actions: `prisma:generate` → lint → typecheck → test → build em PR.    |
| TOOL-02     | Mitigado |            1 |         5 | Sem script `typecheck`.                        | `package.json` → `npm run typecheck`                 | Erros de tipo escapavam se build não rodasse. | Script + CI.                                                           |
| CTX-02      | Mitigado |            1 |         5 | Sem `.cursorignore`.                           | `.cursorignore`                                      | Tokens gastos em ruído.                       | Ignorar `node_modules`, `.next`, uploads, transcripts.                 |

---

## 2. Importantes

| ID               | Status   | Complexidade | Confiança | Achado                                                                                              | Onde                       | Impacto                                           | Mitigação                                                   |
| ---------------- | -------- | -----------: | --------: | --------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| AGENT-03         | Mitigado |            2 |         5 | Sem `CONTRIBUTING.md`.                                                                              | (ausente)                  | PR incompleta; agente omite passos.               | CONTRIBUTING espelhando README + fluxo de issue.            |
| AGENT-04         | Mitigado |            2 |         5 | Sem `lessons.md` / memória de erros.                                                                | skills citam; repo não tem | Repete bugs caros (TX root, etc.).                | `tasks/lessons.md` alimentado pós-incidentes.               |
| DOC-03           | Mitigado |            2 |         4 | Sem glossário de domínio.                                                                           | (ausente)                  | Nomes errados (mosaic, challenge, visibility).    | `docs/glossary.md` curto.                                   |
| DOC-04           | Mitigado |            2 |         4 | Sem ADRs; decisões só em reports longos.                                                            | reports markdown           | Refactors contra decisões de produto.             | `docs/adr/` (incl. ADR-007 storage phases, ADR-008 DI).     |
| STRUCT-03        | Mitigado |            3 |         5 | God-files: `ProfileForm.tsx`, `export-from-pinterest.mjs`, `ImageDetail.tsx`, `User.repository.ts`. | paths citados              | Diffs grandes; contexto inchado; merges frágeis.  | Extrair seções/hooks/helpers.                               |
| CONTRACT-04      | Mitigado |            3 |         4 | Bordas geralmente OK (`toPublicUser`), mas nem sempre consistente.                                  | repositories/use cases     | Vazamento de campos ORM.                          | Checklist DTO nas rotas + testes.                           |
| TEST-04          | Mitigado |            3 |         4 | Factories parciais (`tests/factories/*`); ainda há mocks ad hoc.                                    | `tests/**`                 | Setup verboso; testes frágeis.                    | Expandir factories e padronizar uso.                        |
| TOOL-04          | Mitigado |            1 |         5 | Sem issue/PR templates.                                                                             | (ausente `.github/`)       | Issues pobres; menos aceite para o agente.        | Templates com objetivo/aceite/test plan.                    |
| TOOL-05          | Mitigado |            1 |         5 | Sem CODEOWNERS.                                                                                     | (ausente)                  | Sem sinal de área crítica.                        | CODEOWNERS por `src/useCases`, `src/services/Storage`, etc. |
| SCRIPT-02        | Mitigado |            1 |         5 | Scripts listados no README, sem `scripts/README` completo.                                          | `README.md`                | Agente roda script de ops errado.                 | Índice comando→efeito (+ flags `--dry-run`).                |
| SAFE-02          | Mitigado |            1 |         5 | Guardrails espalhados em rules; não em AGENT-01.                                                    | `.cursor/rules`            | Force-push/prod se o agente não ler a rule certa. | Bloco “Never” em `AGENTS.md`.                               |
| CTX-04 residual  | Aceito   |            2 |         3 | Algumas issues antigas ainda one-liner.                                                             | board histórico            | Escopo ambíguo.                                   | Manter padrão de refinamento (já usado nos críticos).       |
| I18N-01 residual | Mitigado |            2 |         4 | Catálogos bons; risco de string hardcoded em PRs futuras.                                           | components                 | i18n incompleto.                                  | Checklist no AGENTS.                                        |
| DOC-01 residual  | Mitigado |            1 |         4 | README bom; não apontava assessments.                                                               | `README.md`                | Agente não achava reports.                        | Seção “Governança / assessments”.                           |

---

## 3. Minors

| ID                   | Status   | Complexidade | Confiança | Achado                                           | Mitigação                                  |
| -------------------- | -------- | -----------: | --------: | ------------------------------------------------ | ------------------------------------------ |
| CONTRACT-02 residual | Mitigado |            2 |         4 | Zod não cobre 100% das rotas.                    | Expandir schemas gradualmente.             |
| TEST-01 residual     | Mitigado |            3 |         4 | Cobertura sem threshold.                         | `coverageThreshold` (também QA-02 perf).   |
| STRUCT-02 residual   | Mitigado |            1 |         5 | Convenções implícitas.                           | `docs/guidelines/CONVENTIONS.md` + AGENTS. |
| CTX-01 residual      | Mitigado |            1 |         3 | Possíveis artefatos locais não listados.         | `.gitignore` + `.cursorignore` alinhados.  |
| SCRIPT-01 residual   | Mitigado |            1 |         4 | Alguns scripts só no package.json.               | `typecheck` no `scripts/README`.           |
| TOOL-01 residual     | Mitigado |            1 |         5 | Lint-staged formata tudo (`**/*`).               | Documentado em AGENTS (pre-commit).        |
| DOC-05 residual      | Aceito   |            1 |         4 | Hosting/Mongo prod TBD nos comentários.          | Aceito até deploy; ver docs/operators/\*.  |
| AGENT-02 residual    | Mitigado |            2 |         4 | Só 2 rules Cursor; sem rules por glob de camada. | Rules `src/useCases/**` etc.               |

---

## 4. Não aplica

| ID                           | Status                | Motivo                                                                                                                                                                             |
| ---------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STRUCT-04 (monorepo tooling) | Não aplica            | Repo é single-package de propósito; item STRUCT-04 do assessment está **cumprido** pela clareza single-package — não há backlog de Nx/Turborepo.                                   |
| I18N-01 (se single-locale)   | Não aplica _como gap_ | Produto **é** multilíngue e já tem catálogos ✅; não marcar como N/A de produto — listado nos positivos. _(Mantido aqui só para notar: em apps single-locale, I18N-01 seria N/A.)_ |

---

## 5. Mapa assessment → este relatório

| Grupo assessment                                                                                                                          | Vitraux                  |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| AGENT-02, DOC-01/05, STRUCT-01/02/04/05, CONTRACT-01/02/03, TEST-01/02/03, TOOL-01/02/03, CTX-01/02/03/04/05, I18N-01, SCRIPT-01, SAFE-01 | **Positivos**            |
| AGENT-01, DOC-02, CONTRACT-03, TOOL-02/03, CTX-02                                                                                         | **Críticos (mitigados)** |
| (nenhum — STRUCT-03/TEST-04/CONTRACT-04 mitigados)                                                                                        | **Importantes abertos**  |
| Residuais minors                                                                                                                          | **Minors**               |
| Monorepo tooling                                                                                                                          | **Não aplica**           |

---

## 6. Ordem sugerida de backlog

1. Residuais AI: nenhum importante aberto (STRUCT-03 mitigado nesta leva)
2. Cruzar com `PERFORMANCE-REPORT` — FE-06, COUP-05, OBS, REL-05, SCALE-03, QA-04/05

---

## 7. Como usar

Ao fechar um item, atualizar **Status** neste report. O assessment genérico permanece sem ✅ fixos de produto. Cruzar com `PERFORMANCE-REPORT` para CI/typecheck/DI (não duplicar épicos).
