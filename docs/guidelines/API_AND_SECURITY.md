# API, Integrações e Segurança — Vitraux

> Contratos HTTP: [`docs/openapi.yaml`](../openapi.yaml) + [`requests/README.md`](../../requests/README.md). Segurança: [`SECURITY-REPORT.md`](../../SECURITY-REPORT.md).

## 1. API Design (REST)

- **Base path** — `/api/v1/…` (App Router em `src/app/api/v1/`).
- **Recursos no plural** — `/users`, `/images`, `/auth/…`.
- **Verbos HTTP** — GET (leitura), POST (criação/ação), PATCH (parcial), DELETE (remoção).
- **Códigos HTTP** — 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500 via erros tipados (`src/errors/`).
- **Resposta padrão** — `ApiPresenter`:
    - Sucesso: `{ success: true, message, data }`
    - Erro: `{ success: false, message, code }`
- **Paginação** — cursor na query (`?cursor=…`); resposta inclui `nextCursor` (null quando acabou). Não usar offset `page/limit` no mosaico.
- **Identificação do usuário** — sessão JWT no cookie; rotas `/users/me` não recebem `userId` na URL.
- **Contrato obrigatório** — endpoint criado/alterado atualiza na mesma PR: `docs/openapi.yaml`, `requests/**/*.http` e `requests/README.md`. Ver [`.cursor/rules/api-contracts.mdc`](../../.cursor/rules/api-contracts.mdc).

### Ações de domínio

Preferir substantivos + verbo HTTP. Sub-recursos quando necessário:

```
POST   /api/v1/auth/login
GET    /api/v1/images?scope=all&cursor=…
PATCH  /api/v1/images/:id/visibility
DELETE /api/v1/users/me
```

---

## 2. Healthcheck

| Superfície                  | O que faz                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `GET /api/health`           | Status ok + link para `/api/health/database` (loopback ou `HEALTHCHECK_TOKEN`)              |
| `GET /api/health/database`  | Ping Mongo                                                                                  |
| `npm run healthcheck` (CLI) | `environment`, `database`, `spaces`, `jwt`, `brevo` (account API se `EMAIL_PROVIDER=brevo`) |

Smoke de **envio** de e-mail: `npm run test-email -- destino@…` (recusa produção).

---

## 3. Integrações externas

- **Isolamento** — Brevo/Spaces/Remote import convertem para modelos internos nos services.
- **Timeout** — `AbortController` + `EMAIL_TIMEOUT_MS` / timeouts nos services.
- **Retry** — `retryWithJitter` em Brevo/Spaces para 429/5xx transitórios.
- **Circuit breaker** — `externalBreakers` para dependências externas.
- **URLs e secrets** — somente variáveis de ambiente (`.env.example`).

### Ambiente

Vitraux usa **`ENVIRONMENT`** (`dev` / `prod`) para regras de boot e operadores, e **`NODE_ENV`** onde o runtime Next/Node exige (ex.: cookie `Secure`, stack em logs). Não duplicar lógica de produto só com `NODE_ENV` quando `ENVIRONMENT` já define o comportamento de negócio.

---

## 4. Segurança e autenticação

- **Auth** — middleware + helpers de sessão (`src/middleware/`, `src/utils/session.ts`); JWT HS256, cookie httpOnly.
- **Autorização** — regras em use cases (`canViewImage`, ownership) e testes em `tests/security/`.
- **Rate limit** — auth e rotas de imagem (`rateLimit.middleware.ts`); in-memory OK em máquina única (`docs/architecture.md`). Multi-pod → gateway/Redis (SCALE-02 N/A hoje).
- **CSRF** — origem validada em mutações sensíveis.
- **Secrets** — `.env` gitignored; placeholders rejeitados no boot (`validateEnv`).
- **Logs** — `LogManager` com redação; sem PII/tokens.
- **Storage** — bucket privado + presigned URLs após authz (ADR-002).

Políticas dedicadas `*.policy.ts` **não** são o padrão atual — authz fica em use cases + utils testados.

---

## Compressão e payloads (API-07)

- Next.js comprime respostas HTTP por padrão no host Node (gzip/brotli conforme runtime/proxy).
- Preferir DTOs enxutos (`toPublicUser`, mosaico) — não serializar entidades Prisma cruas.
- Revisar campos extras em novos endpoints; listagens paginadas (~40) evitam payloads gigantes.
- CDN/edge compression, se houver, fica na borda do deploy — fora do app.

## Idempotency (API-06)

Mutações com risco de retry (create/import image, upload photo, report, register, password reset) aceitam header opcional `Idempotency-Key` (máx. 128 chars). Respostas **2xx** são rejogadas por **24h** a partir de store **in-memory** (deploy single-machine). Replay inclui header `Idempotency-Replayed: true`. Sem o header, o comportamento permanece o de sempre.
