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

| Grupo        | Variáveis                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Obrigatórias | `DATABASE_URL`, `JWT_SECRET` (≥ 32, não o placeholder), `CACHE_LIFETIME_SECONDS`, `SPACES_*`, `ENVIRONMENT`                                |
| Sessão       | `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_TTL_SECONDS`                                                                                            |
| E-mail       | `EMAIL_PROVIDER`, `EMAIL_FROM`, `BREVO_API_KEY`, `EMAIL_TIMEOUT_MS`                                                                        |
| Google       | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`                                                        |
| IA           | `AI_PROVIDER` (`none`\|`openai`), `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL` (default `gpt-5.4-mini`), `AI_TIMEOUT_MS`, `AI_LOG_RETENTION_DAYS` |
| Web Push     | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (as três ou nenhuma), `NOTIFICATION_RETENTION_DAYS`                               |
| Operação     | `HEALTHCHECK_TOKEN`, `SWAGGER_*`, `APP_BASE_URL`, `SERVER_PORT`, `LOG_LEVEL`                                                               |

## Rotas HTTP

Inventário completo por arquivo em [`requests/README.md`](requests/README.md); contrato em `docs/openapi.yaml`.

| Área         | Rotas                                                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth         | `auth/{register,login,logout,me,impersonate}`, `auth/password/{forgot,reset}`, `auth/email/{verify/send,confirm}`, `auth/google/{ready,start,callback,complete-registration,link}`                            |
| Usuário      | `users/[id]` (+ `password`, `photo`, `settings`), `users/me` (+ `deletion`, `deletion/cancel`, `deletion/keep`, `email/change`, `export`, `sessions`, `sessions/[sessionId]`, `stats`), `nickname/[nickname]` |
| Admin        | `admin/users`, `admin/users/[id]/impersonation-token`                                                                                                                                                         |
| Notificações | `notifications`, `notifications/read-all`, `notifications/[id]/read`                                                                                                                                          |
| Push         | `push/vapid-public-key`, `push/subscriptions` (POST/DELETE), `push/test`                                                                                                                                      |
| Sistema      | `version`, `examples` (404 em produção), `health`, `health/database`, `docs`, `docs/openapi`                                                                                                                  |

Envelope: `ApiPresenter` (`success` + `message` + `data` / `success: false` + `code`). Erros por `AppError` (`src/errors`), tratados em `handleRoute`.

## Borda HTTP de conta e segurança

- **CSRF:** `assertSameOrigin` nas mutações de autenticação e nas rotas novas com cookie.
- **Rate limit:** em memória por processo (`rateLimit.middleware.ts`, `assertAuthRateLimit`); em multi-instância o limite é por instância (`docs/operators/multi-instance-smoke.md`).
- **Cookies:** `app-session` / `__Host-app-session`, `app-device`, `app-theme`, `app-locale`. Em produção o prefixo `__Host-` exige HTTPS.
- **Headers:** `src/config/securityHeaders.ts` (HSTS, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, CSP em report-only). `/error.html` é a exceção (`SAMEORIGIN`, `frame-ancestors 'self'`) porque o `error-guard.js` a embute em iframe.
- **SSRF:** `RemoteFetch.service` (DNS + IP pinning + redirect manual) com `safeImageUrl` (`ipaddr.js`: só unicast público; `isBlockedHostname` recusa `localhost`, `*.local`, `*.internal`).
- **Health:** só loopback ou `HEALTHCHECK_TOKEN` (`healthAccess.ts`). Swagger só com flag + Basic.
- **Link de retorno e links de notificação:** `safeReturnUrl` e `safeInAppLink` (só caminho interno).
- **Resiliência:** `circuitBreaker` + `retryWithJitter` (Brevo, Spaces, OpenAI); `idempotency.ts`.

## Upload e Spaces

`FileManager` → `SharpImageProcessor` → `Storage.service`. Chave `{ownerId}/{categoria}/{hash}.webp` e `.thumb.webp`. Fases storage/Mongo fora da TX (ADR-007). Exclusão e `retention-purge` apagam as duas chaves; arquivo sem `thumbnailKey` é legado e segue funcionando. `npm run files:backfill-thumbnails` gera os que faltam. [`docs/operators/images.md`](docs/operators/images.md).

## IA

`AIService` (fachada `AiPort`) → `OpenAIService` (`AiVendorPort`). Toda chamada: fornecedor configurado **e** `ai_enabled` ligada → vendor → `AiLog` fora da TX. Métodos: `generateText`, `summarize`, `generateTitle`, `classify`. Entrada limitada a 20 000 caracteres; texto do usuário vem delimitado no prompt. Sem rota HTTP: use cases `transactional = false` (exemplo: `summarizeText`). ADR-012, [`docs/operators/ai.md`](docs/operators/ai.md).

## PWA, atualização e erro no cliente

Ver `CONTEXT.md` (produto) e [`docs/operators/pwa.md`](docs/operators/pwa.md). `ErrorGuardScript` carrega `public/error-guard.js` (intercepta `ChunkLoadError` e a tela padrão do Next e abre `/error.html`); `global-error.tsx` e `AppErrorScreen` usam os catálogos `error.*`.

## Notificações e push

`CreateNotification` grava (fora de TX) e depois chama `WebPushService.sendToUser`. Falha de push é logada e engolida; assinatura 404/410 é removida. Payload ≤ 4 KB (texto cortado). Opt-in por aparelho (`PushSubscription`, até 10). ADR-015, [`docs/operators/web-push.md`](docs/operators/web-push.md).

## Jobs e operação

`npm run cron -- retention-purge --dry-run|--confirm` (`scripts/cron/jobs/retention-purge.mjs`): órfãos de Spaces (7 d), `SessionEvent`/`ActiveSession` vencidos, contas em quarentena > 30 d (anonimiza + apaga objetos + `AiLog`, `Notification`, `PushSubscription`), `AiLog` > 90 d, `Notification` > 180 d. Manifesto de CronJob em `deploy/cron/`. Scripts de operador: `scripts/README.md`.

## Testes e CI

`tests/` espelha `src/`. Componentes e hooks com `@jest-environment jsdom` e `tests/helpers/renderInJsdom.tsx` (sem Testing Library). `tests/i18n/catalogParity.test.ts` exige as mesmas chaves em pt/en/es. CI (`.github/workflows/ci.yml`, só em `pull_request`): `check:lockfile-native`, `npm ci`, `prisma:generate`, lint, typecheck, test, build ([`docs/operators/ci.md`](docs/operators/ci.md)).

## Como manter este arquivo

Mude camada, biblioteca, pipeline de upload, env, rota ou mecanismo de PWA/push/IA → ajuste a seção afetada, a tabela de rotas **e** `docs/openapi.yaml`, e a data do snapshot.
