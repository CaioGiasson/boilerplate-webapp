# HTTP requests (REST Client / IntelliJ / VS Code)

Manual API smoke tests for `src/app/api/**`. Use with the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension or JetBrains HTTP Client.

**Contrato formal:** [`docs/openapi.yaml`](../docs/openapi.yaml). UI Swagger (opt-in): `GET /api/docs` com `SWAGGER_ENABLED=true` + Basic auth (`SWAGGER_USER` / `SWAGGER_PASSWORD`); YAML em `GET /api/docs/openapi`.

**Rastreio:** as rotas com tratamento padrão respondem com o header `x-request-id` (reaproveita o enviado, se válido) e repetem o id no corpo dos erros (`requestId`). Ver [`docs/operators/observability.md`](../docs/operators/observability.md).

**Obrigatório:** todo endpoint criado ou alterado deve atualizar o `.http` correspondente, este inventário e `docs/openapi.yaml` na mesma PR ([`.cursor/rules/api-contracts.mdc`](../.cursor/rules/api-contracts.mdc)).

## Variables

| Variable             | Default                 | Description                                             |
| -------------------- | ----------------------- | ------------------------------------------------------- |
| `baseUrl`            | `http://localhost:3000` | App origin                                              |
| `healthcheckToken`   | (empty)                 | Optional `HEALTHCHECK_TOKEN` for remote health checks   |
| `userId`             | —                       | Authenticated user id (from login/register)             |
| `targetUserId`       | —                       | Target user id for admin routes                         |
| `impersonationToken` | —                       | Token from `POST /admin/users/{id}/impersonation-token` |
| `imageId`            | —                       | Image id for CRUD routes                                |
| `sessionId`          | —                       | Session id from `GET /users/me/sessions`                |
| `nickname`           | `alice`                 | Nickname to check availability                          |

After login/register, the session cookie (`app-session`) is stored automatically by REST Client when using `@name login`.

## Index

| File                                                                   | Routes covered                                                               |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [health/healthcheck.http](./health/healthcheck.http)                   | `GET /api/health`, `GET /api/health/database`                                |
| [auth/auth.http](./auth/auth.http)                                     | Login, register, logout, me, password reset, email verification              |
| [users/users.http](./users/users.http)                                 | Profile, password, photo, settings, export, stats, sessions, nickname        |
| [notifications/notifications.http](./notifications/notifications.http) | Notifications list/read, Web Push config, subscribe/unsubscribe, test        |
| [users/twoFactor.http](./users/twoFactor.http)                         | 2FA: status, setup, enable, disable, recovery codes, `POST /auth/2fa/verify` |
| [system/version.http](./system/version.http)                           | `GET /api/v1/version`                                                        |
| [system/ping.http](./system/ping.http)                                 | `GET`/`HEAD /api/ping`                                                       |
| [admin/admin.http](./admin/admin.http)                                 | Admin users list, audit log, impersonation token, `POST /auth/impersonate`   |
| [images/images.http](./images/images.http)                             | List, create, CRUD, visibility, report, import, tags                         |
| [examples/recoverOrGenerate.http](./examples/recoverOrGenerate.http)   | `GET /api/v1/examples` (dev only)                                            |

## Route inventory (`src/app/api`)

| Method | Path                                           | Auth                   | File                                               |
| ------ | ---------------------------------------------- | ---------------------- | -------------------------------------------------- |
| GET    | `/api/health`                                  | Token / loopback       | `health/route.ts`                                  |
| GET    | `/api/health/database`                         | Token / loopback       | `health/database/route.ts`                         |
| GET    | `/api/v1/examples`                             | No (404 when disabled) | `v1/examples/route.ts`                             |
| POST   | `/api/v1/auth/login`                           | No                     | `v1/auth/login/route.ts`                           |
| POST   | `/api/v1/auth/logout`                          | Optional               | `v1/auth/logout/route.ts`                          |
| GET    | `/api/v1/auth/me`                              | Yes                    | `v1/auth/me/route.ts`                              |
| GET    | `/api/v1/notifications`                        | Yes                    | `v1/notifications/route.ts`                        |
| POST   | `/api/v1/notifications/read-all`               | Yes                    | `v1/notifications/read-all/route.ts`               |
| POST   | `/api/v1/notifications/[id]/read`              | Yes                    | `v1/notifications/[id]/read/route.ts`              |
| GET    | `/api/v1/push/vapid-public-key`                | No                     | `v1/push/vapid-public-key/route.ts`                |
| POST   | `/api/v1/push/subscriptions`                   | Yes                    | `v1/push/subscriptions/route.ts`                   |
| DELETE | `/api/v1/push/subscriptions`                   | Yes                    | `v1/push/subscriptions/route.ts`                   |
| POST   | `/api/v1/push/test`                            | Yes                    | `v1/push/test/route.ts`                            |
| GET    | `/api/v1/version`                              | No                     | `v1/version/route.ts`                              |
| GET    | `/api/ping`                                    | No                     | `ping/route.ts`                                    |
| POST   | `/api/v1/auth/impersonate`                     | No (token in body)     | `v1/auth/impersonate/route.ts`                     |
| GET    | `/api/v1/admin/users`                          | Yes (ADMIN)            | `v1/admin/users/route.ts`                          |
| GET    | `/api/v1/users/me/2fa`                         | Yes                    | `v1/users/me/2fa/route.ts`                         |
| POST   | `/api/v1/users/me/2fa/setup`                   | Yes                    | `v1/users/me/2fa/setup/route.ts`                   |
| POST   | `/api/v1/users/me/2fa/enable`                  | Yes                    | `v1/users/me/2fa/enable/route.ts`                  |
| POST   | `/api/v1/users/me/2fa/disable`                 | Yes                    | `v1/users/me/2fa/disable/route.ts`                 |
| POST   | `/api/v1/users/me/2fa/recovery-codes`          | Yes                    | `v1/users/me/2fa/recovery-codes/route.ts`          |
| POST   | `/api/v1/auth/2fa/verify`                      | No (challenge token)   | `v1/auth/2fa/verify/route.ts`                      |
| GET    | `/api/v1/admin/audit-events`                   | Yes (ADMIN)            | `v1/admin/audit-events/route.ts`                   |
| POST   | `/api/v1/admin/users/[id]/impersonation-token` | Yes (ADMIN)            | `v1/admin/users/[id]/impersonation-token/route.ts` |
| POST   | `/api/v1/auth/register`                        | No                     | `v1/auth/register/route.ts`                        |
| POST   | `/api/v1/auth/password/forgot`                 | No                     | `v1/auth/password/forgot/route.ts`                 |
| POST   | `/api/v1/auth/password/reset`                  | No                     | `v1/auth/password/reset/route.ts`                  |
| POST   | `/api/v1/auth/email/verify/send`               | Yes                    | `v1/auth/email/verify/send/route.ts`               |
| POST   | `/api/v1/auth/email/confirm`                   | No                     | `v1/auth/email/confirm/route.ts`                   |
| GET    | `/api/v1/auth/google/ready`                    | No                     | `v1/auth/google/ready/route.ts`                    |
| GET    | `/api/v1/auth/google/start`                    | No                     | `v1/auth/google/start/route.ts`                    |
| GET    | `/api/v1/auth/google/callback`                 | No                     | `v1/auth/google/callback/route.ts`                 |
| POST   | `/api/v1/auth/google/complete-registration`    | No                     | `v1/auth/google/complete-registration/route.ts`    |
| POST   | `/api/v1/auth/google/link`                     | No (pending cookie)    | `v1/auth/google/link/route.ts`                     |
| GET    | `/api/v1/images`                               | Conditional            | `v1/images/route.ts`                               |
| POST   | `/api/v1/images`                               | Yes                    | `v1/images/route.ts`                               |
| GET    | `/api/v1/images/[id]`                          | Optional               | `v1/images/[id]/route.ts`                          |
| PATCH  | `/api/v1/images/[id]`                          | Yes (owner)            | `v1/images/[id]/route.ts`                          |
| DELETE | `/api/v1/images/[id]`                          | Yes (owner)            | `v1/images/[id]/route.ts`                          |
| PATCH  | `/api/v1/images/[id]/visibility`               | Yes (owner)            | `v1/images/[id]/visibility/route.ts`               |
| POST   | `/api/v1/images/[id]/report`                   | Yes                    | `v1/images/[id]/report/route.ts`                   |
| POST   | `/api/v1/images/from-url`                      | Yes                    | `v1/images/from-url/route.ts`                      |
| GET    | `/api/v1/images/tags`                          | Conditional            | `v1/images/tags/route.ts`                          |
| GET    | `/api/v1/nickname/[nickname]`                  | Yes                    | `v1/nickname/[nickname]/route.ts`                  |
| GET    | `/api/v1/users/[id]`                           | Yes (self)             | `v1/users/[id]/route.ts`                           |
| PATCH  | `/api/v1/users/[id]`                           | Yes (self)             | `v1/users/[id]/route.ts`                           |
| PATCH  | `/api/v1/users/[id]/password`                  | Yes (self)             | `v1/users/[id]/password/route.ts`                  |
| PATCH  | `/api/v1/users/[id]/photo`                     | Yes (self)             | `v1/users/[id]/photo/route.ts`                     |
| PATCH  | `/api/v1/users/[id]/settings`                  | Yes (self)             | `v1/users/[id]/settings/route.ts`                  |
| DELETE | `/api/v1/users/me`                             | Yes                    | `v1/users/me/route.ts`                             |
| GET    | `/api/v1/users/me/deletion`                    | Yes (quarentena)       | `v1/users/me/deletion/route.ts`                    |
| POST   | `/api/v1/users/me/deletion/cancel`             | Yes (quarentena)       | `v1/users/me/deletion/cancel/route.ts`             |
| POST   | `/api/v1/users/me/deletion/keep`               | Yes (quarentena)       | `v1/users/me/deletion/keep/route.ts`               |
| GET    | `/api/v1/users/me/export`                      | Yes                    | `v1/users/me/export/route.ts`                      |
| GET    | `/api/v1/users/me/stats`                       | Yes                    | `v1/users/me/stats/route.ts`                       |
| POST   | `/api/v1/users/me/email/change`                | Yes                    | `v1/users/me/email/change/route.ts`                |
| GET    | `/api/v1/users/me/sessions`                    | Yes                    | `v1/users/me/sessions/route.ts`                    |
| DELETE | `/api/v1/users/me/sessions`                    | Yes                    | `v1/users/me/sessions/route.ts`                    |
| DELETE | `/api/v1/users/me/sessions/[sessionId]`        | Yes                    | `v1/users/me/sessions/[sessionId]/route.ts`        |

Mutating auth routes require same-origin (`Origin` header matching `baseUrl`).
