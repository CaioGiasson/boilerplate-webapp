# Qualidade: Observabilidade, Testes, Documentação e Code Review — App

## 1. Observabilidade e logging

- **Proibido `console.log` em código de produção** — usar [`LogManager`](../../src/managers/Log.manager.ts) (`info`, `warn`, `error`) com redação de secrets/PII.
- **Logs estruturados** — JSON serializado no stdout (não arquivos locais gerenciados pela app).
- **Sem PII/tokens** em logs — e-mails mascarados (`maskEmail`), stacks omitidas em production.
- **Métricas/tracing/APM** — backlog (OBS-03/04); não bloquear PR por ausência, salvo se a feature exigir SLO.

Instrumentação de boot: [`src/instrumentation.ts`](../../src/instrumentation.ts) (env + shutdown).

---

## 2. Testes

- **Framework** — Jest; espelho `tests/` ↔ `src/`.
- **Prioridade** — use cases, middleware (rate limit), policies de visibilidade, DTOs públicos.
- **Factories** — [`tests/factories/`](../../tests/factories/) para User/Image.
- **Carga** — [`tests/load/list-and-auth.k6.js`](../../tests/load/list-and-auth.k6.js) (opcional local).
- **E2E Playwright** — backlog QA-05; hoje cobertura crítica via Jest (authz, signed URL).

PRs com lógica nova devem incluir testes do caminho feliz + edge case relevante. Exceção: issue de testes linkada na PR.

---

## 3. Documentação

| Tipo          | Onde                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Contrato HTTP | [`docs/openapi.yaml`](../openapi.yaml) + [`requests/*.http`](../../requests/) + [`requests/README.md`](../../requests/README.md) |
| Arquitetura   | [`docs/architecture.md`](../architecture.md)                                                                                     |
| Operadores    | [`docs/operators/`](../operators/)                                                                                               |
| ADRs          | [`docs/adr/`](../adr/)                                                                                                           |
| Domínio       | [`docs/glossary.md`](../glossary.md)                                                                                             |
| Lições        | [`tasks/lessons.md`](../../tasks/lessons.md)                                                                                     |
| Features      | Repo **e** issue no board (aceite no GitHub + rastro no repo)                                                                    |

**OpenAPI + `.http` são obrigatórios** — todo endpoint criado ou alterado deve atualizar `docs/openapi.yaml` (fonte do Swagger UI), o(s) arquivo(s) `requests/**/*.http` e o inventário em `requests/README.md` na **mesma PR**. Não é opcional nem backlog. Regra: [`.cursor/rules/api-contracts.mdc`](../../.cursor/rules/api-contracts.mdc).

Textos de documentação e issues: **pt-BR**. Código: **inglês**.

---

## 4. Code review

- PRs focadas; link à issue do board.
- Seguir [`GUIA_REVISAO_PR_GERAL.md`](GUIA_REVISAO_PR_GERAL.md) + fluxo [`Reviewed`](../../docs/issue-workflow.md#review-de-prs).
- Níveis: 🔴 bloqueante · 🟡 importante · 🟢 sugestão.
- Template: [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
