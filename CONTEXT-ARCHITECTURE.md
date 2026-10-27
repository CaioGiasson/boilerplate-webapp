# Arquitetura — Boilerplate Webapp

Premissas técnicas para agentes de IA. Diagrama e regras de dependência: [`docs/architecture.md`](docs/architecture.md) (fonte do diagrama). Fatos de produto: [`CONTEXT.md`](CONTEXT.md). Decisões: [`docs/adr/`](docs/adr/README.md).

Snapshot: **2026-10-26**.

## Camadas e injeção de dependência

```
HTTP: app/api → controller → useCase → (services | repositories)
```

| Camada           | Pasta                           | Regra                                                                                         |
| ---------------- | ------------------------------- | --------------------------------------------------------------------------------------------- |
| Rota Next        | `src/app/api/**/route.ts`       | Wrapper fino: chama o controller com `getDependencies()`                                      |
| Controller       | `src/controllers/<Área>/`       | `X.controller.ts` + `routes/*.route.ts`: parse HTTP, Zod, auth, CSRF, rate limit, resposta    |
| Use case         | `src/useCases/*.usecase.ts`     | Regra de domínio; estende `UseCaseMasterPort` (`validate` + `execute`)                        |
| Repository       | `src/repositories/`             | **Único** lugar com Prisma; recebe `Prisma.TransactionClient`                                 |
| Service          | `src/services/`                 | Integração externa (Spaces, Brevo, Google, OpenAI, Web Push) atrás de uma porta (`*.port.ts`) |
| Manager          | `src/managers/`                 | Utilitários de processo (db, log, cookies, settings, feature flags)                           |
| Composition root | `src/container/dependencies.ts` | Instancia e injeta (`getDependencies()` com cache de módulo)                                  |

## Transações (ADR-003, ADR-007)

- `UseCaseMasterPort.run()` abre `$transaction` por padrão. Use case de **leitura** ou que **chama serviço externo** sobrescreve `get transactional() { return false }` (então `execute` recebe o client raiz).
- **Chamada externa nunca dentro de `$transaction`** (Spaces, OpenAI, push): fases em `utils/workUnitPhases.ts` (`runStorageUploadThenTransaction`).
- Repository não chama `getPrismaClient()`/`new PrismaClient()` no meio de uma TX (lição "Root Prisma client fora da transação").
- Registros que precisam sobreviver ao rollback (ex.: `AiLog`) usam `runWithoutTransaction` por um recorder próprio.

## Bibliotecas

Next 15.5 · React 19 · TypeScript strict · Tailwind 4 · Radix UI (`src/components/ui`) · `next-intl` 4 · Prisma 6 (MongoDB) · Zod · `jose` (JWT) · `argon2` · `sharp` · `ipaddr.js` · `openai` · `web-push` · `react-easy-crop` · AWS SDK v3 (S3/Spaces) · Jest 29 + `ts-jest` (jsdom por docblock) · ESLint 9 · Prettier · Husky + lint-staged. Node `22.19.0`.

## Variáveis de ambiente

Validadas no boot por `validateEnv()` (`src/config/env.ts`, chamada em `instrumentation-node.ts`). Exemplo comentado em `.env.example`.

| Grupo        | Variáveis                                                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Obrigatórias | `DATABASE_URL`, `JWT_SECRET` (≥ 32, não o placeholder), `CACHE_LIFETIME_SECONDS`, `SPACES_*`, `ENVIRONMENT`                                    |
| Sessão       | `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_TTL_SECONDS`                                                                                                |
| E-mail       | `EMAIL_PROVIDER`, `EMAIL_FROM`, `BREVO_API_KEY`, `EMAIL_TIMEOUT_MS`                                                                            |
| Google       | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`                                                            |
| IA           | `AI_PROVIDER` (`none`\|`openai`), `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL` (default `gpt-5.4-mini`), `AI_TIMEOUT_MS`, `AI_LOG_RETENTION_DAYS`     |
| Web Push     | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (as três ou nenhuma), `WEB_PUSH_ALLOWED_HOSTS` (extra), `NOTIFICATION_RETENTION_DAYS` |
| 2FA          | `TWO_FACTOR_ENCRYPTION_KEY` (32 bytes em base64; opcional, mas **inválida recusa o boot**)                                                     |
| Jobs         | `JOBS_WORKER` (`off` desliga), `JOBS_POLL_INTERVAL_MS`, `JOBS_SUCCEEDED_RETENTION_DAYS`, `JOBS_FAILED_RETENTION_DAYS`                          |
| Retenção     | `AUDIT_LOG_RETENTION_DAYS` (365), `AI_LOG_RETENTION_DAYS`, `NOTIFICATION_RETENTION_DAYS`                                                       |
| E2E          | `E2E_DATABASE_URL`, `E2E_PORT`                                                                                                                 |
| Operação     | `HEALTHCHECK_TOKEN`, `SWAGGER_*`, `APP_BASE_URL`, `SERVER_PORT`, `LOG_LEVEL`, `LOG_FORMAT`                                                     |

## Rotas HTTP

Inventário completo por arquivo em [`requests/README.md`](requests/README.md); contrato em `docs/openapi.yaml`.

| Área         | Rotas                                                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth         | `auth/{register,login,logout,me,impersonate}`, `auth/password/{forgot,reset}`, `auth/email/{verify/send,confirm}`, `auth/google/{ready,start,callback,complete-registration,link}`                            |
| Usuário      | `users/[id]` (+ `password`, `photo`, `settings`), `users/me` (+ `deletion`, `deletion/cancel`, `deletion/keep`, `email/change`, `export`, `sessions`, `sessions/[sessionId]`, `stats`), `nickname/[nickname]` |
| Admin        | `admin/users`, `admin/users/[id]/impersonation-token`                                                                                                                                                         |
| Notificações | `notifications`, `notifications/read-all`, `notifications/[id]/read`                                                                                                                                          |
| Push         | `push/vapid-public-key`, `push/subscriptions` (POST/DELETE), `push/test`                                                                                                                                      |
| Auth (2FA)   | `auth/2fa/verify`, `users/me/2fa`, `users/me/2fa/{setup,enable,disable,recovery-codes}`                                                                                                                       |
| Sistema      | `ping` (sonda pública do navegador, fora de `/v1`), `version`, `examples` (404 em produção), `health`, `health/database`, `docs`, `docs/openapi`                                                              |

Envelope: `ApiPresenter` (`success` + `message` + `data` / `success: false` + `code` + `requestId`). Erros por `AppError` (`src/errors`), tratados em `handleRoute`.

`robots.txt` e `sitemap.xml` saem de `src/app/robots.ts` e `src/app/sitemap.ts` (origem de `APP_BASE_URL`; páginas públicas em `src/constants/publicPages.ts`, com `alternates` por idioma). São `force-dynamic` (leem `APP_BASE_URL` por requisição, não do build). `openGraph` básico (título e nome do site) fica no layout de `[locale]`; sem `metadataBase`, que gravaria a origem do build nos ícones das páginas estáticas.

## Borda HTTP de conta e segurança

- **CSRF:** `assertSameOrigin` nas mutações de autenticação e nas rotas novas com cookie.
- **Rate limit:** em memória por processo (`rateLimit.middleware.ts`, `assertAuthRateLimit`); N réplicas não são previstas; as limitações estão em [`docs/known-issues/scalability.md`](docs/known-issues/scalability.md) (ESC-01…ESC-10).
- **Cookies:** `app-session` / `__Host-app-session`, `app-device`, `app-theme`, `app-locale`. Em produção o prefixo `__Host-` exige HTTPS.
- **Headers:** `src/config/securityHeaders.ts` (HSTS, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, CSP em report-only). `/error.html` é a exceção (`SAMEORIGIN`, `frame-ancestors 'self'`) porque o `error-guard.js` a embute em iframe.
- **SSRF:** `RemoteFetch.service` (DNS + IP pinning + redirect manual) com `safeImageUrl` (`ipaddr.js`: só unicast público; `isBlockedHostname` recusa `localhost`, `*.local`, `*.internal`).
- **Health:** só loopback ou `HEALTHCHECK_TOKEN` (`healthAccess.ts`). Swagger só com flag + Basic.
- **Link de retorno e links de notificação:** `safeReturnUrl` e `safeInAppLink` (só caminho interno).
- **Paginação:** listas novas usam cursor (keyset `createdAt` + `id`) por `src/utils/pagination.ts`: `parsePageQuery` (`?cursor&limit&q&order`, limite 20 por padrão e 100 no máximo), `keysetWhere`/`keysetOrderBy` no repository (`take: limit + 1`) e `toPage` no use case. Resposta `{ items, pageInfo: { nextCursor, hasNext, limit } }`, sem total. Referência: `listAdminUsers` + `AdminUsersSection` (`DataTable` + `Pagination`). Notificações têm cursor próprio (`<ISO>_<id>`, contrato anterior, mantido).
- **Observabilidade:** `handleRoute` atribui um `requestId` (`x-request-id` de entrada válido ou UUID) que vai no header da resposta, no corpo dos erros e em todo log da requisição (`AsyncLocalStorage`, `src/lib/requestContext.ts`). `LogManager` emite JSON em produção (`LOG_FORMAT`). Destino externo de erros por `registerErrorReporter` (sem SDK embutido). [`docs/operators/observability.md`](docs/operators/observability.md).
- **2FA:** `src/utils/totp.ts` (RFC 6238, base32, códigos de recuperação), `twoFactorCrypto.ts` (AES-256-GCM do segredo), `twoFactorChallenge.ts` (JWT de 5 min com audiência própria). `LoginUser` devolve `two_factor_required` em conta com 2FA; `completeLogin` (`useCases/shared/`) abre a sessão e é compartilhada com `VerifyTwoFactorLogin`. Sem a chave, conta com 2FA responde 503 (falha fechada). [`docs/operators/two-factor.md`](docs/operators/two-factor.md).
- **Auditoria:** `AuditEventRepository.record` (append-only, nunca lança) é chamado nos use cases de ações sensíveis e nos scripts de operador (`scripts/lib/audit.mjs`); `ip` e `requestId` vêm do `AsyncLocalStorage` da requisição. Lista só para ADMIN em `GET /api/v1/admin/audit-events`. [`docs/operators/audit-log.md`](docs/operators/audit-log.md).
- **Resiliência:** `circuitBreaker` + `retryWithJitter` (Brevo, Spaces, OpenAI); `idempotency.ts`.

## Upload e Spaces

`FileManager` → `SharpImageProcessor` → `Storage.service`. Chave `{ownerId}/{categoria}/{hash}.webp` e `.thumb.webp`. Fases storage/Mongo fora da TX (ADR-007). Exclusão e `retention-purge` apagam as duas chaves; arquivo sem `thumbnailKey` é legado e segue funcionando. `npm run files:backfill-thumbnails` gera os que faltam. [`docs/operators/images.md`](docs/operators/images.md).

## IA

`AIService` (fachada `AiPort`) → `OpenAIService` (`AiVendorPort`). Toda chamada: fornecedor configurado **e** `ai_enabled` ligada → vendor → `AiLog` fora da TX. Métodos: `generateText`, `summarize`, `generateTitle`, `classify`. Entrada limitada a 20 000 caracteres; texto do usuário vem delimitado no prompt. Sem rota HTTP: use cases `transactional = false` (exemplo: `summarizeText`). ADR-012, [`docs/operators/ai.md`](docs/operators/ai.md).

## PWA, atualização e erro no cliente

Ver `CONTEXT.md` (produto) e [`docs/operators/pwa.md`](docs/operators/pwa.md). `ErrorGuardScript` carrega `public/error-guard.js` (intercepta `ChunkLoadError` e a tela padrão do Next e abre `/error.html`); `global-error.tsx` e `AppErrorScreen` usam os catálogos `error.*`.

## Notificações e push

`CreateNotification` grava (fora de TX) e depois chama `WebPushService.sendToUser`. Falha de push é logada e engolida; assinatura 404/410 é removida. Payload ≤ 4 KB (texto cortado). Opt-in por aparelho (`PushSubscription`, até 10). O `endpoint` só é aceito em serviço de push conhecido (FCM, Mozilla, Windows, Apple; `WEB_PUSH_ALLOWED_HOSTS` acrescenta) — o servidor faz POST nele, então host livre seria SSRF. ADR-015, [`docs/operators/web-push.md`](docs/operators/web-push.md).

## Jobs e operação

**Jobs em background:** fila no Mongo (`Job`; `JobRepository.enqueue` na transação do use case = outbox; `claimNext` atômico; retry com backoff de 30 s a 1 h, `maxAttempts` 5; job travado é retomado; at-least-once). Catálogo em `src/jobs/types.ts`, handlers em `src/jobs/registry.ts` (hoje: `email.send`), `processNextJob` e o worker (`src/jobs/worker.ts`) **no processo web**, ligado em `registerNodeInstrumentation` (`JOBS_WORKER=off` desliga) e parado no graceful shutdown. Payload zerado ao concluir. [`docs/operators/jobs.md`](docs/operators/jobs.md).

`npm run cron -- retention-purge --dry-run|--confirm` (`scripts/cron/jobs/retention-purge.mjs`): órfãos de Spaces (7 d), `SessionEvent`/`ActiveSession` vencidos, contas em quarentena > 30 d (anonimiza + apaga objetos + `AiLog`, `Notification`, `PushSubscription`), `AiLog` > 90 d, `Notification` > 180 d, `AuditEvent` > 365 d (e zera o IP dos eventos de contas purgadas), `Job` concluído > 7 d e falho > 30 d. Manifesto de CronJob em `deploy/cron/`. Scripts de operador: `scripts/README.md`.

## Imagem Docker

`Dockerfile` multi-stage (`node:22.19.0-bookworm-slim`), sem `output: standalone` (os scripts de operador e o cron rodam na mesma imagem), `CMD` com `node` direto (graceful shutdown), usuário `node`, healthcheck em `/api/ping`. `docker-compose.app.yaml` sobe app + Mongo sobre o `docker-compose.yaml`. [`docs/operators/docker.md`](docs/operators/docker.md).

## Testes e CI

**E2E:** Playwright em `e2e/` (projetos `api` e `ui`), contra `npm run start` e um banco `e2e` separado (`npm run e2e:prepare`, depois `npm run e2e`); workflow `.github/workflows/e2e.yml` com Mongo 7 em replica set (verde na PR #10; ainda não é check exigido para o merge). [`docs/operators/e2e.md`](docs/operators/e2e.md).

`tests/` espelha `src/`. Componentes e hooks com `@jest-environment jsdom` e `tests/helpers/renderInJsdom.tsx` (sem Testing Library). `tests/i18n/catalogParity.test.ts` exige as mesmas chaves em pt/en/es. CI (`.github/workflows/ci.yml`, só em `pull_request`): `check:lockfile-native`, `npm ci`, `npm audit --omit=dev` (informativo, não bloqueia), `prisma:generate`, lint, typecheck, test, build ([`docs/operators/ci.md`](docs/operators/ci.md)).

## Como manter este arquivo

Mude camada, biblioteca, pipeline de upload, env, rota ou mecanismo de PWA/push/IA → ajuste a seção afetada, a tabela de rotas **e** `docs/openapi.yaml`, e a data do snapshot.
