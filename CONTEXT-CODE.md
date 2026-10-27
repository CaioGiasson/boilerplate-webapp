# Código — Boilerplate Webapp

Inventário para agentes de IA: pastas, repositories e métodos, services, managers, controllers, use cases e scripts. **Leia antes de refinar uma issue que cria ou altera** repository, service ou use case, para **reaproveitar** o que existe. Camadas e regras: [`CONTEXT-ARCHITECTURE.md`](CONTEXT-ARCHITECTURE.md).

Snapshot: **2026-10-26**. Os nomes saem do código; método, service ou use case novo, renomeado ou removido atualiza esta lista na mesma entrega.

## Pastas

```
src/
  app/                 App Router: [locale]/ (páginas), api/ (rotas finas), manifest.ts, global-error.tsx
  components/          admin/ auth/ ds-catalog/ errors/ home/ layout/ legal/ notifications/ pwa/ settings/ ui/ (Radix)
  config/              env.ts (getters e validação), securityHeaders.ts
  constants/           app.ts (APP_NAME, APP_VERSION), texts/{pt,en,es,types}.ts, storageQuota.ts, userRole.ts, ...
  container/           dependencies.ts (composition root)
  controllers/         Admin Auth Example Notification Push User  (X.controller.ts + routes/*.route.ts)
  design-system/       componentes reutilizáveis (ver CONTEXT-DS.md)
  errors/              AppError e subclasses
  hooks/               useMediaQuery, useUnreadNotificationCount
  i18n/                routing, navigation, request
  lib/                 clientes de API do browser (auth-client, push-client, notifications-client), pwa/, image/, errors/
  managers/            Cookies Db Error FeatureFlag Log Settings
  masterPorts/         UseCase.masterport.ts
  middleware/          auth.middleware.ts, rateLimit.middleware.ts
  repositories/        acesso ao Prisma
  schemas/             Zod compartilhado (uploadPhoto, userSetting)
  services/            AI Email Example GoogleOAuth resilience Storage WebPush
  useCases/            regras de domínio
  utils/               funções puras e helpers
prisma/models/*.prisma (fonte) → prisma/schema.prisma (gerado por prisma/merge.mjs; não editar)
public/                sw.js, offline.html, error.html, error-guard.js, theme.js, ícones PWA
scripts/               operador e jobs (ver abaixo)
tests/                 espelha src/
docs/                  architecture, adr/, operators/, issues/, openapi.yaml
requests/              .http por área + README (inventário de rotas)
```

## Repositories

Todos recebem `Prisma.TransactionClient` e lançam `RepositoryError` em falha de banco.

| Repository         | Métodos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`             | `create`, `findByEmail`, `findByPendingEmail`, `findByNickname`, `findById`, `listActiveKeyset`, `find*IncludingDeleted`, `updateProfile`, `updatePassword`, `updateLastLoginDevice`, `setEmailChallenge`, `clearEmailChallenge`, `markEmailVerified`, `applyPendingEmail`, `findByEmailTokenHash`, `linkGoogle`, `unlinkGoogle`, `softDeleteQuarantine`, `clearDeletedAt`, `anonymizeAndSoftDelete`, `listIdsWithDeletedAt`, `listIdsDeletedBefore` (+ `User.dto.ts`: `mapUser`, `toPublicUser`; `User.helpers.ts`: `activeWhere`) |
| `File`             | `findByKey`, `createPending` (aceita `thumbnailKey/Url`), `markPublished`, `markFailed`, `markOrphanByUrl`, `findById`, `listPublishedByOwner`, `listOwnedForErasure`, `markOrphanById`, `countPublishedByOwner`, `sumPublishedBytesByOwner`                                                                                                                                                                                                                                                                                        |
| `ActiveSession`    | `create`, `upsertFromClaims`, `listByUserId`, `findByIdForUser`, `deleteById`, `deleteAllForUserExceptJti`, `deleteAllForUser`, `deleteByJti`, `existsForJti`, `purgeExpired`                                                                                                                                                                                                                                                                                                                                                       |
| `SessionEvent`     | `create`, `createFromJtiHash`, `existsForJti`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `FeatureFlag`      | `findLatestValue`, `append`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `AiLog`            | `create`, `countByUserSince`, `sumTokensByUserSince`, `listByUser`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `Notification`     | `create`, `listByUser`, `countUnread`, `markRead`, `markAllRead`, `listAllByUser`                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `PushSubscription` | `upsertByEndpoint`, `listByUser`, `countByUser`, `deleteByEndpoint`, `deleteExpiredByEndpoint`                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `Example`          | `create`, `recoverFromCache` (exemplo da arquitetura)                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## Services (atrás de portas)

| Service                           | Papel                                                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Storage/Storage.service`         | S3/Spaces: `upload`, `deleteObject`, `getPresignedGetUrl`, `buildPublicUrl`, `keyFromCanonicalUrl` (`storage.port.ts`)                           |
| `Storage/File.manager`            | `storeAvatar`, `storeImage` (normaliza + thumbnail), `orphanByUrl`, `deletePublishedByFileId`, `deleteAllOwnedObjectsByOwner`, `thumbnailKeyFor` |
| `Storage/imageProcessor`          | `SharpImageProcessor` (`ImageProcessorPort`), `normalizeToWebp`, `resizeThumbnailWebp`, `isWebpBuffer`                                           |
| `Storage/StorageUrl.service`      | URL assinada com cache; `withSignedPublicUser` (foto e thumbnail)                                                                                |
| `Storage/RemoteFetch.service`     | `fetchImage` seguro contra SSRF                                                                                                                  |
| `Email/Email.service`             | Fachada `getEmailService()` → `Brevo.service` ou noop (`email.port.ts`)                                                                          |
| `GoogleOAuth/GoogleOAuth.service` | Authorization Code (`googleOAuth.port.ts`)                                                                                                       |
| `AI/AI.service`                   | `AIService` (`AiPort`): `generateText`, `summarize`, `generateTitle`, `classify`; `getAIService()`; `AiLog.recorder`; `vendors/OpenAI.service`   |
| `WebPush/WebPush.service`         | `sendToUser`, `isEnabled`, `getPublicKey`, `buildPushBody` (`webPush.port.ts`)                                                                   |
| `resilience/externalBreakers`     | Circuit breakers: brevo, spaces, openai                                                                                                          |
| `Example/Example.service`         | Exemplo de serviço                                                                                                                               |

## Managers

`Cookies.manager` (cookies no browser), `Db.manager` (`getPrismaClient`, `runInTransaction`, `runWithoutTransaction`), `Error.manager`, `FeatureFlag.manager` (`isFeatureActive`, `FEATURE_FLAGS`, cache 30 s), `Log.manager` (`info`, `warn`, `error`; redige segredos), `Settings.manager` (`SETTINGS_KEYS`, `list`, `set`).

## Use cases

| Área             | Use cases                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Cadastro e login | `registerUser`, `loginUser`, `logoutUser`, `checkNicknameAvailability`, `getUserProfile`                                        |
| Google           | `startGoogleOAuth`, `handleGoogleOAuthCallback`, `completeGoogleRegistration`, `linkGoogleAccount`                              |
| E-mail e senha   | `sendEmailVerification`, `confirmEmailChallenge`, `requestEmailChange`, `forgotPassword`, `resetPassword`, `changeUserPassword` |
| Perfil           | `updateUserProfile`, `uploadUserPhoto`, `setUserSetting`, `getUserStorageStats`, `exportUserData`                               |
| Sessões          | `listUserSessions`, `revokeUserSession`, `revokeOtherUserSessions`                                                              |
| Exclusão         | `deleteUserAccount`, `getAccountDeletionStatus`, `cancelAccountDeletion`, `keepAccountDeletion`                                 |
| Admin            | `listAdminUsers`, `createImpersonationToken`, `consumeImpersonationToken`                                                       |
| Notificações     | `createNotification` (ponto de entrada interno), `listNotifications`, `markNotificationRead`, `markAllNotificationsRead`        |
| Push             | `registerPushSubscription`, `unregisterPushSubscription`, `sendTestPushNotification`                                            |
| IA               | `summarizeText` (exemplo, sem rota)                                                                                             |
| Exemplo          | `recoverOrGenerateExample`                                                                                                      |

## Utils relevantes

`session.ts` (JWT, cookies, impersonamento), `password.ts` / `passwordPolicy.ts`, `nickname.ts`, `emailCode.ts` / `emailToken.ts`, `csrfOrigin.ts`, `safeImageUrl.ts` (`parsePublicHttpUrl`, `isBlockedIp`, `isBlockedHostname`), `safeReturnUrl.ts`, `safeInAppLink.ts`, `adminAccess.ts` (`assertAdmin`), `jsonValueToBoolean.ts`, `parseProbabilityScore.ts`, `maskEmail.ts`, `retryWithJitter.ts`, `circuitBreaker.ts`, `idempotency.ts`, `workUnitPhases.ts`, `routeHandler.ts` (`handleRoute`), `Api.presenter.ts`, `healthAccess.ts`, `swaggerAccess.ts`.

## Scripts (`npm run …`)

Índice completo e flags: [`scripts/README.md`](scripts/README.md).

| Grupo        | Comandos                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| Verificação  | `healthcheck`, `test-environment`, `test-email`, `check:lockfile-native`, `smoke:multi-instance`     |
| Operador     | `change-user-password`, `change-user-role`, `toggle-feature-flag`, `unconfirm-account`, `list-users` |
| Dados        | `user-role:backfill`, `nickname:backfill`, `email:backfill-verified`, `files:backfill-thumbnails`    |
| Spaces       | `spaces:make-private`, `spaces:migrate-keys`, `spaces:purge-orphans`                                 |
| Cron         | `cron -- retention-purge`, `cron:retention`                                                          |
| Geração      | `vapid:keys`, `pwa:icons`, `mongo:keyfile`, `mongo:migrate-to-auth`                                  |
| Projeto novo | `init-project` (renomeia nome/slug/textos legais e gera `.env`), `seed:dev` (admin + usuário de dev) |
