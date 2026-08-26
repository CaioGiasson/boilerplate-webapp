# Glossário — App

Termos de domínio e infra usados no código. Arquitetura: [`architecture.md`](architecture.md).

| Termo                               | Significado                                                                                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mosaic / mosaico**                | Grade visual de imagens na home ou feed; pode incluir mosaico global de usuários que optaram por aparecer.                                    |
| **Image**                           | Entidade principal de conteúdo (`Image` no Prisma): foto do usuário com título, tags, URL, visibilidade.                                      |
| **Visibility**                      | Enum `PUBLIC`, `PRIVATE`, `SECRET`, `PROTECTED` — controla quem vê a imagem e como aparece no mosaico.                                        |
| **SECRET**                          | Visibilidade oculta por padrão; usuário precisa setting `showSecretImages` para ver as próprias.                                              |
| **PROTECTED**                       | Visibilidade intermediária (não listada publicamente como PUBLIC).                                                                            |
| **Challenge (e-mail)**              | Fluxo de confirmação de posse de e-mail via token/código (`emailTokenHash`, purposes `verify`, `change_old`, `change_new`, `password_reset`). |
| **PublicUser**                      | DTO sanitizado exposto na API — sem `passwordHash`, tokens, campos LGPD internos.                                                             |
| **Nickname**                        | Identificador público único do usuário (`@nick`); canonical lowercase para lookup.                                                            |
| **Setting / KeyValueObject**        | Preferência persistida em `User.settings` (ex.: `darkMode`, `language`, zoom levels).                                                         |
| **showSecretImages**                | Setting boolean — exibe imagens SECRET no perfil do dono.                                                                                     |
| **appearInGlobalMosaic**            | Setting boolean — opt-in para aparecer no mosaico global.                                                                                     |
| **homeZoomLevel / imagesZoomLevel** | Settings numéricos de zoom do board (desktop).                                                                                                |
| **Session (JWT)**                   | Cookie HTTP-only com claims `userId` + `device`; validado via `jose`.                                                                         |
| **Device cookie**                   | UUID persistido para detectar novo login (`app-device`).                                                                                      |
| **ActiveSession**                   | Registro server-side de sessões ativas (revogação, listagem).                                                                                 |
| **SessionEvent**                    | Auditoria de eventos de sessão (login, logout, revoke).                                                                                       |
| **File**                            | Metadado de objeto no Spaces (key, ownerId, category `images` \| `avatars`).                                                                  |
| **Storage key**                     | Caminho no bucket: `{ownerId}/{category}/{32hex}.{ext}`.                                                                                      |
| **Spaces**                          | DigitalOcean Spaces (S3-compatible) para fotos e avatares.                                                                                    |
| **Presigned URL**                   | URL temporária assinada para download de objeto privado.                                                                                      |
| **UseCaseMasterPort**               | Classe base dos use cases — validate + execute em transação Prisma.                                                                           |
| **Prisma (Db.manager)**             | Singleton `getPrismaClient` + `runInTransaction` / `runWithoutTransaction`.                                                                   |
| **Composition root**                | `src/container/dependencies.ts` — wiring de dependências.                                                                                     |
| **Brevo**                           | Provedor de e-mail transacional (`Brevo.service`).                                                                                            |
| **EmailService**                    | Fachada de envio de e-mail; use cases não chamam Brevo direto.                                                                                |
| **Rate limit**                      | Middleware em rotas auth sensíveis (`assertAuthRateLimit`).                                                                                   |
| **CSRF / same-origin**              | `assertSameOrigin` em POST/PATCH de auth.                                                                                                     |
| **Healthcheck**                     | Probes `/api/health*` — loopback ou token `HEALTHCHECK_TOKEN`.                                                                                |
| **Operator script**                 | CLI em `scripts/` para migração/backfill — não roda em produção.                                                                              |
| **Retention purge**                 | Job cron que remove dados/arquivos expirados (LGPD).                                                                                          |
| **Locale**                          | Idioma da UI: `pt`, `en`, `es` (`AppLocale`).                                                                                                 |
| **next-intl**                       | Biblioteca de i18n no App Router; catálogos em `src/constants/texts/`.                                                                        |
| **Report (Image)**                  | Denúncia de conteúdo (`ReportImage` use case).                                                                                                |
| **Export user data**                | Portabilidade LGPD — exporta dados do usuário.                                                                                                |
| **DeletedAt (soft delete)**         | Campo nullable — documentos “apagados” permanecem para retenção/auditoria.                                                                    |
