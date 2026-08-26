# Relatório de segurança — Vitraux

> **Referência normativa:** os códigos deste relatório citam `SECURITY-ASSESSMENT.md`. Achados **LGPD/GDPR** foram movidos para `PRIVACY-REPORT.md` (referência: `PRIVACY-ASSESSMENT.md`). Este arquivo registra achados de **segurança**, severidade, issues/PRs e status de remediação.

| Campo          | Valor                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Tipo           | Pentest **whitebox** (revisão de código-fonte)                                                                                      |
| Alvo           | Aplicação Vitraux (Next.js 15.5.23, App Router, Prisma/MongoDB, DigitalOcean Spaces)                                                |
| Data           | 2026-08-18 (atualizado 2026-08-21: AUTH-07/08 + SESS-05 + XFER-02 + assessments absolutos)                                          |
| Escopo         | Autenticação, sessão, autorização, upload/importação de imagens, armazenamento, API REST, frontend de senhas, headers, dependências |
| Fora de escopo | Teste dinâmico autenticado em produção, WAF/infra cloud, engenharia social contra usuários reais, revisão legal por advogado        |
| Status inicial | Todos os itens abrem como **Aberto** para tratamento                                                                                |

**Legenda de Status:** `Aberto` · `Em andamento` · `Mitigado` · `Aceito (risco)` · `Falso positivo`

**Complexidade (1–5):** 1 = config/trecho local · 3 = vários arquivos + teste · 5 = arquitetura, produto ou jurídico longo.

**Confiança (1–5):** 1 = hipotético · 3 = plausível com lacuna de runtime · 5 = evidência direta no código desta revisão.

---

## Resumo executivo

A aplicação tem base sólida em vários controles de mercado: senhas com **Argon2**, cookie de sessão **HttpOnly + SameSite=Lax**, JWT verificado com `jose`, autorização por dono nas mutações de imagem, e filtro SSRF inicial no import por URL (bloqueio de hosts/IPs privados + magic bytes).

O risco dominante de **confidencialidade no storage** foi endereçado ([#101](https://github.com/CaioGiasson/vitraux/pull/101)): bucket privado, upload sem `public-read`, leitura via URL assinada após `canViewImage`. Keys legadas `dev/…` migradas com `spaces:migrate-keys` ([#106](https://github.com/CaioGiasson/vitraux/pull/106)).

**Mitigado em 2026-08-19 (PRs #84–#88):** chaves de objeto com 128 bits + prefixo `ownerId` (STOR-02); rate limit in-memory em login/cadastro/nickname/troca de senha (AUTH-05); `JWT_SECRET` recusado se fraco + `iss`/`aud` (CRYP-01); teto de body/base64, sniff de MIME e senha máx. 128 (INP-01).

**Mitigado em 2026-08-19 (PRs #91–#96):** headers globais + clickjacking/HSTS/nosniff; CSP em report-only (HTTP-01); health singleton + `/examples` 404 em production (AUTHZ-06); allowlist de settings (AUTHZ-05); cookie `__Host-` / device só no servidor (SESS-02); teto de título/descrição/tags (INP-03); scripts admin recusados em prod + e-mail mascarado (OPS-03).

**Mitigado em 2026-08-19 ([#99](https://github.com/CaioGiasson/vitraux/pull/99)):** dummy Argon2 + conflito genérico no cadastro (AUTH-06); Origin/Referer em login/cadastro/logout (AUTH-10); SSRF 6to4/NAT64/IP pin (INP-04); `next-intl` ≥ 4.9.2 (OPS-05); `DeleteObject` + `DELETE` de imagem (STOR-03); `jti` + revogação na troca de senha (SESS-04); cota 1 GiB (STOR-05); export JSON (RIGHT-01); aviso de cookies (MIN-02); minors #97/#98.

**Mitigado em 2026-08-20 ([#100](https://github.com/CaioGiasson/vitraux/pull/100)):** MongoDB local com `--auth`, keyfile, usuário admin e bind `127.0.0.1:27717` (OPS-01). Validação em prod exige credencial na `DATABASE_URL` e recusa senha de example. Residual: TLS app→Mongo fora de localhost; produção deve usar Mongo gerenciado/rede interna.

**Mitigado em 2026-08-20 ([#101](https://github.com/CaioGiasson/vitraux/pull/101)):** STOR-01 (bucket privado + presigned GET); SECP-01 (medida técnica de confidencialidade no Spaces). Script `spaces:make-private` para ACL legada; 29 objetos migrados.

**Mitigado em 2026-08-20 ([#102](https://github.com/CaioGiasson/vitraux/pull/102), [#106](https://github.com/CaioGiasson/vitraux/pull/106)):** RIGHT-02 (exclusão imediata de conta + erasure no Spaces + anonimização); residual STOR-02 (migração `spaces:migrate-keys` de keys `dev|prod|test/…` → `{ownerId}/…`, executada no ambiente local).

**Privacidade / LGPD:** ver `PRIVACY-REPORT.md` (retenção, RoPA, DPA, encarregado, direitos do titular).

**Mitigado em 2026-08-20 ([#111](https://github.com/CaioGiasson/vitraux/pull/111), AUTH-11):** nickname canônico (NFC + lowercase + charset Latin); rejeição de controles/NFKC-divergente/homógrafos de outros scripts; register/update/check alinhados; copy i18n; script `nickname:backfill`. Residual: sem UTS #39 completo.

**Mitigado em 2026-08-20 ([#108](https://github.com/CaioGiasson/vitraux/pull/108), [#114](https://github.com/CaioGiasson/vitraux/pull/114)):** HTTP-07 (`security.txt` + `robots.txt`); TEST-01 (Jest authz/signed URL).

**Follow-up pós-teste (main):** create/update/visibility devolvem mosaic com URL assinada (evita tile quebrado após save); modal fecha ao salvar; owner edita tags; botão de denúncia fixo; deep-link `generateMetadata` importa `defaultDocumentTitle`.

**Mitigado em 2026-08-20/21 (verificação de e-mail + AUTH-07/08 + SESS-05):** [#117](https://github.com/CaioGiasson/vitraux/pull/117) / [#118](https://github.com/CaioGiasson/vitraux/pull/118) (`emailVerifiedAt`, challenges); [#121](https://github.com/CaioGiasson/vitraux/pull/121) alerta de novo login (cookie HttpOnly `vitraux-device`); [#122](https://github.com/CaioGiasson/vitraux/pull/122) reset de senha só com e-mail verificado; [#123](https://github.com/CaioGiasson/vitraux/pull/123) listar/revogar sessões ativas no perfil. Residual AUTH-09: TOTP opcional (fora do aceite mínimo).

Ainda aberto no crítico de segurança: ver residual AUTH-09 (TOTP), HTTP-02 (CSP), etc. no assessment. Privacidade: `PRIVACY-REPORT.md`.

| Área                | Críticos | Importantes | Minors |
| ------------------- | -------: | ----------: | -----: |
| Segurança (pentest) |        6 |          16 |     12 |

---

## Controles positivos observados

| Controle                                                                                 | Onde                                                                                             |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Hash de senha Argon2 (não bcrypt/plaintext)                                              | `src/utils/password.ts`                                                                          |
| Cookie de sessão HttpOnly, SameSite=Lax, `__Host-vitraux-session` em HTTPS               | `src/utils/session.ts`                                                                           |
| JWT não é devolvido no JSON de login (só no Set-Cookie)                                  | `src/controllers/Auth/routes/login.route.ts`                                                     |
| Senha nunca persiste em `localStorage` / cookie JS                                       | `src/lib/auth-client.ts`                                                                         |
| IDOR bloqueado em rotas `/users/[id]` via `userIdParam`                                  | `src/middleware/auth.middleware.ts`                                                              |
| Mutação de imagem exige dono; não-dono recebe 404 (não 403)                              | `updateUserImage` / `setImageVisibility`                                                         |
| Feed público não devolve `ownerId` / `fileId`                                            | `listImages.route.ts`                                                                            |
| Import por URL bloqueia localhost, RFC1918, link-local, metadata GCP e redirects manuais | `safeImageUrl.ts`, `RemoteImage.service.ts`                                                      |
| Respostas de erro de API não vazam stack trace                                           | `src/utils/routeHandler.ts`                                                                      |
| `.env` está no `.gitignore`                                                              | `.gitignore`                                                                                     |
| Chave Spaces 16 bytes + `ownerId` + unique/`findByKey`                                   | `File.manager.ts`; `file.prisma`                                                                 |
| JWT: secret ≥32, recusa o exemplo, `iss`/`aud`                                           | `src/config/env.ts`; `src/utils/session.ts`; `instrumentation.ts`                                |
| Rate limit 5/min + lockout + 429 `RATE_LIMITED`                                          | `src/middleware/rateLimit.middleware.ts`                                                         |
| Body JSON limitado, base64 estimado, magic bytes                                         | `src/utils/dataUrl.ts`                                                                           |
| Termos/privacidade no cadastro (versão + timestamp)                                      | `RegisterForm.tsx`; `registerUser.usecase.ts`                                                    |
| Age gate 18+ (UTC date-only); denúncia autenticada de imagem                             | `ageGate.ts`; `Report`; `reportImage.usecase.ts`; `ImageDetail`                                  |
| Headers: nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors, HSTS (não-dev)   | `src/config/securityHeaders.ts`; `next.config.ts`                                                |
| Settings só `SETTINGS_KEYS` + tipos                                                      | `userSetting.schema.ts`; `Settings.manager.ts`                                                   |
| Metadados de imagem limitados (200 / 5k / 20×40)                                         | `imageMetadataLimits.ts`                                                                         |
| Health loopback/token; `/examples` off em production                                     | `healthAccess.ts`; `exampleEndpoint.ts`                                                          |
| Login com dummy Argon2; cadastro com conflito genérico                                   | `password.ts`; `loginUser.usecase.ts`; `registerUser.usecase.ts`                                 |
| Same-origin em login/cadastro/logout                                                     | `csrfOrigin.ts`                                                                                  |
| Fetch de import com IP pin (undici) + 6to4/NAT64/hosts numéricos                         | `safeImageUrl.ts`; `RemoteImage.service.ts`                                                      |
| Cota 1 GiB; `DeleteObject` no Spaces                                                     | `storageQuota.ts`; `File.manager.ts`; `Storage.service.ts`                                       |
| JWT com `jti`; troca de senha define `sessionsRevokedAt`                                 | `session.ts`; `user.prisma`                                                                      |
| Logout 204 idempotente; SessionEvent guarda hash do `jti`                                | `logout.route.ts`; `SessionEvent.repository.ts`                                                  |
| Export JSON da conta; aviso de cookies essenciais                                        | `exportUserData.usecase.ts`; `CookieNotice.tsx`                                                  |
| Mongo local: auth + keyfile + bind loopback (`27717`)                                    | `docker-compose.yaml`; `docs/mongo-auth-setup.md`                                                |
| Bucket privado; leitura via presigned GET após authz                                     | `Storage.service.ts`; `StorageUrl.service.ts`                                                    |
| Exclusão de conta imediata (anonimiza PII, DeleteObject, revoga sessões)                 | `deleteUserAccount.usecase.ts`; `docs/operators/account-deletion.md`                             |
| Retenção / RoPA / incidente / DPIA (docs operacionais)                                   | `docs/operators/retention.md`; `subprocessors-ropa.md`; `incident-response.md`; `dpia-images.md` |
| Migração de keys legadas Spaces (`spaces:migrate-keys`)                                  | `scripts/migrate-spaces-keys.mjs`                                                                |
| Nickname canônico (NFC + lowercase; Latin; backfill)                                     | `src/utils/nickname.ts`; `scripts/backfill-nickname-canonical.mjs`                               |
| Mosaic assinado também em create/update/visibility                                       | `createUserImage` / `updateUserImage` / `setImageVisibility`                                     |
| `security.txt` + `robots.txt`                                                            | `public/.well-known/security.txt`; `public/robots.txt`                                           |

---

## 1. Pentest whitebox

### 1.1 Críticos

| ID      | Issue                                                   | Status   | Complexidade | Confiança | Achado                                                                                                                                                                                                                                                                                                                                              | Onde                                                                                                                           | Impacto                                                                                                                                                                                                                               | Mitigação                                                                                                                                             |
| ------- | ------------------------------------------------------- | -------- | -----------: | --------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| STOR-01 | [#46](https://github.com/CaioGiasson/vitraux/issues/46) | Mitigado |            4 |         5 | Objetos no Spaces eram `public-read`; visibilidade só no Mongo/API. **Correção (#101):** upload sem ACL pública; presigned GET na leitura após `canViewImage`; script `spaces:make-private` para ACL legada. Keys legadas migradas (#106). **Follow-up:** create/update/visibility também devolvem mosaic assinado (tile não quebra após save).     | `Storage.service.ts`; `StorageUrl.service.ts`; `File.manager.ts`; `updateUserImage` / `createUserImage` / `setImageVisibility` | Bypass total do modelo de visibilidade; vazamento de imagens íntimas.                                                                                                                                                                 | Bucket privado; URLs assinadas; nunca `public-read` em PRIVATE/SECRET.                                                                                |
| STOR-02 | [#47](https://github.com/CaioGiasson/vitraux/issues/47) | Mitigado |            2 |         5 | Chave do objeto tem só `randomBytes(4)` (32 bits), no padrão `{ENVIRONMENT}/{avatars\|images}/{8 hex}.{ext}`. **Correção:** `randomBytes(16)`, path `{ownerId}/{category}/{32 hex}.{ext}`, `key` unique, retry em P2002. **Migração legada (#106 / #105):** `spaces:migrate-keys` (CopyObject + Mongo + DeleteObject); executada no ambiente local. | `src/services/Storage/File.manager.ts`; `scripts/migrate-spaces-keys.mjs`                                                      | Enumeração das URLs (prefixo conhecido + 4,3e9 chaves). Em dias, um scanner no Spaces lista o acervo, inclusive privado. Colisão por paradoxo do aniversário (~50% com ~77k arquivos) pode **sobrescrever** arquivo de outro usuário. | Usar 16+ bytes criptográficos (UUID v4 / `randomBytes(16)`). Incluir `ownerId` no prefixo e IAM por prefixo. Detectar colisão antes do `PutObject`.   |
| OPS-01  | [#48](https://github.com/CaioGiasson/vitraux/issues/48) | Mitigado |            2 |         5 | MongoDB no Compose: `--auth`, keyfile, `MONGO_INITDB_ROOT_*`, healthcheck autenticado. Host bind `127.0.0.1:27717:27017` (dev). Scripts `mongo:keyfile`, `mongo:migrate-to-auth`; validação prod na `DATABASE_URL`. **Correção (#100).** Residual: TLS app→Mongo; produção não deve publicar porta do DB.                                           | `docker-compose.yaml`; `.env.example`; `docs/mongo-auth-setup.md`; `src/config/env.ts`                                         | Quem alcançar o host lê/grava usuários, hashes, sessões e metadados de imagens. Compromete toda a base.                                                                                                                               | Bind em `127.0.0.1`, auth, rede interna sem publish em produção. TLS entre app e DB.                                                                  |
| AUTH-05 | [#49](https://github.com/CaioGiasson/vitraux/issues/49) | Mitigado |            3 |         5 | Login, cadastro, troca de senha e `GET /nickname/:nick` sem rate limit, captcha, lockout ou delay uniforme. **Correção:** 5 req/60s por IP+identificador, lockout 60s→5min→15min, 429 genérico + `Retry-After`. Dummy Argon2 no login (AUTH-06). Residual: in-memory (um processo), sem CAPTCHA/Redis.                                              | `login.route.ts`, `register.route.ts`, `checkNickname.route.ts`, `changePassword.route.ts`                                     | Credential stuffing, spraying e enumeração em massa. Argon2 aumenta custo, mas não impede stuffing distribuído.                                                                                                                       | Rate limit por IP+identificador (ex. 5/min), lockout progressivo, CAPTCHA após N falhas, resposta e timing constantes no login.                       |
| CRYP-01 | [#50](https://github.com/CaioGiasson/vitraux/issues/50) | Mitigado |            1 |         5 | `JWT_SECRET` só é exigido como “não vazio”. O valor de exemplo (`change-me-in-production-…`) passa. Healthcheck aceita ≥16 caracteres. **Correção:** recusa vazio/exemplo/`<32`; `iss=vitraux` `aud=vitraux-web`; validação no boot (Node, não Edge). Rotação do secret já emitido continua operacional.                                            | `src/config/env.ts`; `.env.example`; `scripts/healthcheck.mjs`                                                                 | Segredo previsível → forja de JWT → impersonação de qualquer `userId`.                                                                                                                                                                | Recusar secretos curtos/conhecidos no boot; exigir ≥32 bytes aleatórios; rotacionar; `iss`/`aud`; recusar o valor do `.env.example`.                  |
| INP-01  | [#51](https://github.com/CaioGiasson/vitraux/issues/51) | Mitigado |            2 |         5 | Upload de foto de perfil decodifica o data-URL **sem teto de tamanho** antes do `Buffer.from`. MIME declarado pelo cliente, sem magic bytes. Senha sem comprimento máximo (Argon2). **Correção:** stream JSON ≤ ~4 MB, estimativa base64 antes do decode, sniff MIME, senha máx. 128.                                                               | `uploadPhoto.route.ts`; `createImage.route.ts` (MIME); `register.route.ts` / `password.ts`                                     | DoS de memória (JSON/base64 gigante). Hospedagem de HTML/malware com `Content-Type: image/jpeg`. Hash Argon2 de payload enorme trava o event loop.                                                                                    | Limitar body (ex. 4 MB) no route handler; estimar base64 **antes** de decodificar (como em `createImage`); sniff magic bytes; max senha 64–128 chars. |

### 1.2 Importantes

| ID                          | Issue                                                   | Status   | Complexidade | Confiança | Achado                                                                                                                                                                                                                                                                                                                                                                   | Onde                                                                                                | Impacto                                                                                                                                               | Mitigação                                                                                                                                      |
| --------------------------- | ------------------------------------------------------- | -------- | -----------: | --------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| STOR-03                     | [#52](https://github.com/CaioGiasson/vitraux/issues/52) | Mitigado |            3 |         5 | “Orphan” só muda status no Mongo. Não há `DeleteObject` no Spaces. Soft-delete de imagem no repositório não tem rota HTTP. **Correção:** `StorageService.deleteObject`, `DELETE /api/v1/images/:id` (dono) apaga Mongo + objeto; exclusão de conta (#102) apaga todos os Files do dono. Residual: worker de orphans e lifecycle no bucket.                               | `File.repository.ts` `markOrphanByUrl`; `Storage.service.ts`                                        | Arquivos “apagados” ou avatares antigos permanecem públicos para sempre. Direito ao esquecimento inviável.                                            | Worker que apaga objetos `orphan`; DELETE autenticado de imagem; lifecycle no bucket.                                                          |
| SESS-04                     | [#53](https://github.com/CaioGiasson/vitraux/issues/53) | Mitigado |            4 |         5 | Troca de senha **não revoga** JWTs. Logout só blacklista o token atual. Não há `jti` nem lista de sessões. TTL padrão **7 dias**. **Correção:** `jti` no JWT; `sessionsRevokedAt` vs `iat`; cookie reemitido na troca de senha; logout grava hash do `jti`. UI de sessões ativas (#123 / SESS-05). Residual: TTL 7d (SESS-08), sem TOTP (AUTH-09).                       | `changeUserPassword.usecase.ts`; `logoutUser.usecase.ts`; `ActiveSession`; `JWT_TTL_SECONDS=604800` | Sessão roubada sobrevive à troca de senha. Não dá para “sair de todos os dispositivos”.                                                               | `jti` + store de sessões; revogar todas no change-password; TTL menor (15–60 min) + refresh; botão “encerrar outras sessões”.                  |
| AUTH-06                     | [#54](https://github.com/CaioGiasson/vitraux/issues/54) | Mitigado |            2 |         5 | Enumeração de contas: `GET /api/v1/nickname/:nick` (200 vs 404); cadastro distingue e-mail vs nickname em uso; login não chama `verifyPassword` se o usuário não existe (oracle de tempo). **Correção:** dummy Argon2; conflito genérico no cadastro; GET nickname exige auth (perfil). Residual: oráculo autenticado no perfil.                                         | `checkNickname.route.ts`; `registerUser.usecase.ts`; `loginUser.usecase.ts`                         | Mapeamento de base para phishing, stuffing e engenharia social.                                                                                       | Dummy Argon2 quando o usuário não existe; mensagens genéricas no cadastro; rate limit forte no check de nick; não expor existência por status. |
| AUTH-04                     | [#55](https://github.com/CaioGiasson/vitraux/issues/55) | Mitigado |            4 |         5 | Cadastro sem verificação de e-mail. Qualquer um reivindica o e-mail da vítima. **Correção (#117):** `emailVerifiedAt` + token hashed TTL 1h; envio via `EmailService` no register; reenvio e confirmação no perfil / link. Residual: login ainda permitido antes de verificar (UX de perfil); endurecer gate se produto exigir.                                          | `registerUser`; `sendEmailVerification`; `confirmEmailChallenge`; ProfileForm                       | Roubo de identidade (ocupar o e-mail), recuperação futura ambígua, impersonação.                                                                      | Confirmar e-mail; opcionalmente recusar login até verificar.                                                                                   |
| HTTP-01                     | [#56](https://github.com/CaioGiasson/vitraux/issues/56) | Mitigado |            2 |         5 | Sem headers globais (CSP, HSTS, frame-ancestors, nosniff, Referrer-Policy, Permissions-Policy). **Correção (#96):** `next.config.ts` `headers()`; CSP enforced só `frame-ancestors 'none'` + `X-Frame-Options: DENY`; CSP completo em **Report-Only**. ThemeScript em `/theme.js` (CLI-02). Residual: XSS ainda não é bloqueado por CSP; `preload` HSTS omitido.         | `src/config/securityHeaders.ts`; `next.config.ts`                                                   | XSS vira CSRF de sessão (cookie HttpOnly não impede `fetch` com `credentials`). Clickjacking no login (phishing overlay). Referer vaza IDs de imagem. | CSP restritiva; HSTS `preload`; `frame-ancestors 'none'`; `nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`.                       |
| INP-04                      | [#57](https://github.com/CaioGiasson/vitraux/issues/57) | Mitigado |            3 |         4 | SSRF residual no import-by-URL: DNS rebinding (TOCTOU lookup→fetch); IPv6 6to4 (`2002:7f00:1::`) e NAT64 (`64:ff9b::`) não bloqueados; IP decimal/octal como hostname pode passar do parser. **Correção:** bloqueio 6to4/NAT64/`fec0:`/hosts numéricos; undici `lookup` pina o primeiro IP não bloqueado. Residual: revalidar IP pós-redirect além do parse da Location. | `safeImageUrl.ts`; `RemoteImage.service.ts`                                                         | Scan interno / metadata cloud a partir de usuário autenticado. Já há testes para RFC1918 e `::ffff:127.0.0.1`.                                        | Conectar ao IP resolvido (não ao hostname); revalidar IP pós-redirect; bloquear 6to4/NAT64/`fec0:`; rejeitar hostnames não-FQDN numéricos.     |
| STOR-05                     | [#58](https://github.com/CaioGiasson/vitraux/issues/58) | Mitigado |            3 |         5 | Sem cota de armazenamento por usuário. Upload autenticado ilimitado (3 MB/arquivo). **Correção:** `USER_STORAGE_QUOTA_BYTES` = 1 GiB em `storeObject`. Residual: sem UI de uso nem alerta de billing.                                                                                                                                                                    | `createUserImage.usecase.ts`; ROADMAP “Medir uso de espaço”                                         | DoS financeiro no Spaces / enchimento de disco.                                                                                                       | Quota por conta; limite de taxa de upload; alerta de billing.                                                                                  |
| AUTHZ-06                    | [#59](https://github.com/CaioGiasson/vitraux/issues/59) | Mitigado |            1 |         5 | `GET /api/health/database` público criava **novo PrismaClient por request**. `GET /api/v1/examples` gerava documentos sem auth. **Correção (#95):** singleton `DbCommander`; health só loopback/`HEALTHCHECK_TOKEN` (sem `?token=` nem Host spoof em production); `/examples` 404 se `NODE_ENV=production`.                                                              | `src/app/api/health/database/route.ts`; `src/utils/healthAccess.ts`                                 | Esgotamento de conexões Mongo; poluição de DB; recon de dependências.                                                                                 | Autenticar/health só na rede interna; singleton Prisma; remover ou proteger `/examples`.                                                       |
| OPS-05                      | [#60](https://github.com/CaioGiasson/vitraux/issues/60) | Mitigado |            2 |         5 | Dependências com advisory: **next-intl** open redirect (`GHSA-8f24-v5vv-gm5j`, `<4.9.1`); prototype pollution em catalogs; **sharp/libvips** (herdado do Next); **postcss** path traversal; **nanoid** loop infinito. **Correção:** `next-intl` `^4.9.2`. Residual: advisories de `sharp`/`postcss`/`nanoid` via Next.                                                   | `package.json` (`next-intl ^4.1.0`, `next 15.5.23`); `npm audit`                                    | Open redirect → phishing/roubo de sessão (OAuth futuro). RCE/DoS via processamento de imagem.                                                         | Atualizar `next-intl` ≥ 4.9.2; Next patchado; `npm audit fix` com teste de regressão.                                                          |
| AUTH-10                     | [#61](https://github.com/CaioGiasson/vitraux/issues/61) | Mitigado |            2 |         4 | Login CSRF: POST cross-site de formulário para `/api/v1/auth/login` pode gravar cookie da conta do atacante no browser da vítima (`SameSite=Lax` não impede Set-Cookie em POST top-level). **Correção:** `assertSameOrigin` em login/cadastro/logout; em production Origin/Referer é obrigatório. Residual: sem token CSRF nem `SameSite=Strict`.                        | `login.route.ts`; cookie `vitraux-session`                                                          | Vítima autentica na conta do atacante e **envia fotos privadas para o atacante** (ameaça real neste produto).                                         | Token CSRF ou checagem de `Origin`/`Referer`; `SameSite=Strict`; login só em JSON same-origin com header custom.                               |
| AUTH-11                     | [#62](https://github.com/CaioGiasson/vitraux/issues/62) | Mitigado |            3 |         5 | Nickname case-sensitive e sem normalização Unicode. `Admin` ≠ `admin`; homógrafos cirílicos. **Correção:** NFC + lowercase + charset Latin; rejeita controles/NFKC-divergente; unique no canônico; backfill `nickname:backfill`. Residual: sem UTS #39 completo.                                                                                                         | `nickname.ts`; `User.repository.ts` `findByNickname`; register/update/check                         | Impersonação / engenharia social.                                                                                                                     | Canonicalizar (NFC + lowercase) ou rejeitar confusables (UTS #39).                                                                             |
| AUTHZ-05                    | [#63](https://github.com/CaioGiasson/vitraux/issues/63) | Mitigado |            1 |         5 | Settings aceitavam **qualquer** `key` (cadastro e PATCH). **Correção (#92):** allowlist `SETTINGS_KEYS`, tipos (boolean / `pt\|en\|es` / zoom 1–12); `__proto__` e array maior que a allowlist → 400. Leitura também filtra keys desconhecidas.                                                                                                                          | `setUserSetting.usecase.ts`; `userSetting.schema.ts`                                                | Poluição de dados; chaves `__proto__`/`constructor`. Payload grande.                                                                                  | Allowlist (`SETTINGS_KEYS`); validar tipos; limitar tamanho.                                                                                   |
| SESS-02                     | [#64](https://github.com/CaioGiasson/vitraux/issues/64) | Mitigado |            2 |         5 | Cookie sem `__Host-`; device em cookie **não-HttpOnly**. **Correção (#93):** HTTPS usa `__Host-vitraux-session`; HTTP local `vitraux-session`; device UUID no servidor/JWT; `vitraux-device` expirado. Residual: `Secure` via `x-forwarded-proto` fora de production.                                                                                                    | `src/utils/session.ts`; login/register/logout                                                       | XSS lê device id; cookie pode vazar em subpaths/host mal configurado.                                                                                 | `__Host-vitraux-session`; device id server-side; Secure sempre atrás de TLS.                                                                   |
| INP-03                      | [#65](https://github.com/CaioGiasson/vitraux/issues/65) | Mitigado |            1 |         5 | Título/descrição/tags sem `maxLength`. **Correção (#94):** 200 / 5000 / 20 tags × 40 chars no create/update/import; `maxLength` no front. Residual: limite no `trim()`; JSON de upload já tem teto ~4 MB.                                                                                                                                                                | `imageMetadataLimits.ts`; rotas Image                                                               | DoS de documentos; XSS armazenado se no futuro renderizarem HTML.                                                                                     | Limites (ex. título 200, desc 5k, N tags, tag 40 chars).                                                                                       |
| AUTH-07 / AUTH-08 / SESS-05 | [#66](https://github.com/CaioGiasson/vitraux/issues/66) | Mitigado |            5 |         5 | Sem 2FA, sem recuperação de senha segura, sem listagem de sessões, sem alerta de novo login. JWT sem `iss`/`aud`. **Correção:** `iss`/`aud` (CRYP-01); sessões ativas listar/revogar (#123); e-mail de novo login via cookie HttpOnly `vitraux-device` (#121); reset só se e-mail verificado (#122). Residual: TOTP opcional (não no aceite mínimo).                     | `ActiveSession`; `forgotPassword` / `resetPassword`; `loginUser` + `buildNewLoginMail`              | Conta com senha reutilizada cai fácil; tokens reutilizáveis se o mesmo secret for compartilhado.                                                      | TOTP; e-mail de novo dispositivo; `iss`/`aud` no JWT; UI de sessões; reset com token.                                                          |
| OPS-03                      | [#67](https://github.com/CaioGiasson/vitraux/issues/67) | Mitigado |            1 |         4 | `list-users` e `export-from-pinterest` no repo; cookies Pinterest no `.env`. **Correção (#91):** recusa `NODE_ENV=production` / `ENVIRONMENT=prod`; e-mail `a***@e***.com`; README: script local, app não lê `PINTEREST_COOKIES`. Residual: operador ainda pode apontar o script a um Mongo de prod se as flags não forem prod.                                          | `scripts/list-users.mjs`; `scripts/lib/operator.mjs`                                                | Se o script rodar no mesmo host de produção ou o `.env` vazar, PII e sessão de terceiros vazam.                                                       | Não versionar scripts admin no artifact; secrets em vault; nunca reutilizar cookie Pinterest na app web.                                       |

### 1.3 Minors

| ID      | Issue                                                     | Status   | Complexidade | Confiança | Achado                                                                                                                                                                                                                                                                    | Onde                                                                                          | Impacto                                                           | Mitigação                                                                                                             |
| ------- | --------------------------------------------------------- | -------- | -----------: | --------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| CLI-01  | [#97](https://github.com/CaioGiasson/vitraux/issues/97)   | Mitigado |            1 |         5 | Toggle “mostrar senha” troca `type=text`. Senha fica em state React até unmount. **Correção:** timeout 8s; limpar senha no unmount de login/cadastro.                                                                                                                     | `InputPassword.tsx`; `LoginForm.tsx`                                                          | Shoulder surfing; dump de memória do processo renderer.           | Timeout para esconder; limpar state no unmount; `autocomplete` já está correto (`current-password` / `new-password`). |
| OPS-04  | [#97](https://github.com/CaioGiasson/vitraux/issues/97)   | Mitigado |            2 |         4 | Logs de erro serializam `error` com `JSON.stringify` (stack, paths, possível `DATABASE_URL` em falha de conexão). **Correção:** `name`/`message` redactados; stack só fora de production.                                                                                 | `Log.manager.ts`; `Error.manager.ts`; health database                                         | Info disclosure em agregador de logs.                             | Redact; não logar cause de infra em texto pleno; sampler.                                                             |
| CLI-02  | [#97](https://github.com/CaioGiasson/vitraux/issues/97)   | Mitigado |            1 |         5 | `ThemeScript` usa `dangerouslySetInnerHTML` (script estático). **Correção:** `<script src="/theme.js">`. Residual: sem CSP nonce.                                                                                                                                         | `theme-script.tsx`                                                                            | Risco baixo (constante). Sem CSP nonce.                           | Mover para arquivo estático + CSP `nonce`.                                                                            |
| CLI-03  | [#97](https://github.com/CaioGiasson/vitraux/issues/97)   | Mitigado |            1 |         5 | `PublicUser` inclui `email`, `settings`, `deletedAt`, timestamps — só para o próprio usuário, mas XSS exfiltra PII. **Correção:** DTO sem `deletedAt`/timestamps. Residual: e-mail e settings ainda no `/me`.                                                             | `User.repository.ts` `toPublicUser`                                                           | Amplifica XSS.                                                    | Minimizar payload de `/me`; nunca incluir `deletedAt` se não houver soft-delete de conta.                             |
| CLI-04  | [#97](https://github.com/CaioGiasson/vitraux/issues/97)   | Mitigado |            2 |         4 | Deep-link `/image/[id]` coloca título no `<title>` (metadata). Imagens PUBLIC ficam em buscadores. **Correção:** `robots: noindex` se visibilidade ≠ PUBLIC.                                                                                                              | `image/[imageId]/page.tsx`; `document-title.ts`                                               | Indexação de títulos sensíveis em fotos “públicas” por engano.    | `noindex` opcional; robots.txt; conferir visibilidade antes de metadata (já 404 para privada).                        |
| HTTP-05 | [#97](https://github.com/CaioGiasson/vitraux/issues/97)   | Mitigado |            1 |         5 | `<img src={image.url}>` sem CSP/`referrerPolicy`. **Correção:** `referrerPolicy="no-referrer"`; URLs assinadas (#101).                                                                                                                                                    | `MosaicImage.tsx`; `ImageDetail.tsx`; `StorageUrl.service.ts`                                 | Referer vazava URL permanente.                                    | `referrerPolicy="no-referrer"`; presigned GET (STOR-01).                                                              |
| HTTP-07 | [#107](https://github.com/CaioGiasson/vitraux/issues/107) | Mitigado |            1 |         5 | Sem `security.txt`, sem `robots.txt` de API. **Correção:** `public/.well-known/security.txt` (Contact placeholder, Preferred-Languages, Expires ~1 ano) + `public/robots.txt` `Disallow: /api/`. Health permanece loopback/token (AUTHZ-06).                              | `public/.well-known/security.txt`; `public/robots.txt`                                        | Recon.                                                            | `/.well-known/security.txt`; health autenticado.                                                                      |
| SESS-07 | [#97](https://github.com/CaioGiasson/vitraux/issues/97)   | Mitigado |            1 |         5 | Logout de sessão já revogada retorna 401 em vez de 200 idempotente. **Correção:** logout sempre 204 e limpa cookies.                                                                                                                                                      | `logoutUser.usecase.ts`                                                                       | Menor; pode vazar que o token era válido e já foi revogado.       | Logout sempre 204 e limpa cookie.                                                                                     |
| SESS-06 | [#97](https://github.com/CaioGiasson/vitraux/issues/97)   | Mitigado |            2 |         5 | `SessionEvent` guarda o JWT completo. Sem TTL/purge. **Correção:** SHA-256 do `jti` + `exp`; purge best-effort na escrita/leitura.                                                                                                                                        | `sessionEvent.prisma`; `logoutUser.usecase.ts`                                                | Disco cresce; JWT em disco é credencial (mesmo revogada até exp). | Guardar só hash do token + `exp`; job de purge.                                                                       |
| AUTH-12 | [#97](https://github.com/CaioGiasson/vitraux/issues/97)   | Mitigado |            1 |         5 | Autocomplete de senha no registro pode ser desligado (`preventAutofill` / `data-1p-ignore`). **Correção:** removido; `autoComplete="new-password"` permanece.                                                                                                             | `InputPassword.tsx`                                                                           | Usuário escolhe senha fraca se o manager não preenche.            | Não bloquear password managers.                                                                                       |
| STOR-06 | —                                                         | Mitigado |            1 |         5 | `ENVIRONMENT` entra na URL pública (`dev/images/...`). **Correção:** path sem env (STOR-02 / #84). Keys legadas migradas (#106).                                                                                                                                          | `File.manager.ts`; `scripts/migrate-spaces-keys.mjs`                                          | Facilita enumeração (STOR-02) e fingerprint do ambiente.          | Path opaco; não vazar nome do env.                                                                                    |
| TEST-01 | [#113](https://github.com/CaioGiasson/vitraux/issues/113) | Mitigado |            3 |         5 | Sem testes e2e de authz negativa (ex. user B GET imagem PRIVATE de A via URL do Spaces). **Correção:** Jest trava `canViewImage` / `GetImageById` / listagem mine vs público / TTL de presign; `presignImageUrl` só após authz (não chamado em NotFound). Sem Playwright. | `tests/useCases/getImageById.usecase.test.ts`; `tests/security/secM12.authzSignedUrl.test.ts` | Regressão silenciosa do modelo de visibilidade.                   | Testes de integração no storage ACL / signed URL.                                                                     |

### Captura de senhas no frontend (foco pedido)

| Vetor                                      | Situação                                                                                                                                                                                        | Classificação               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Senha em `localStorage` / cookie JS        | **Não ocorre.** Vai no body JSON HTTPS do `fetch` e some. Cookie só tem JWT HttpOnly.                                                                                                           | Controle adequado           |
| XSS + `fetch` com `credentials: 'include'` | Sessão é usada sem ler o cookie. Senha do form ainda está no React state durante o preenchimento. CSP enforced só anti-clickjacking; script-src em report-only (HTTP-01). Theme em `/theme.js`. | Importante (impacto de XSS) |
| Mostrar senha (olho)                       | CLI-01 (timeout 8s + limpar no unmount)                                                                                                                                                         | Mitigado                    |
| Keylogger de extensão / malware no cliente | Fora do controle do app; mitigado em parte por Argon2 no servidor; TOTP ainda residual (AUTH-09).                                                                                               | Residual                    |
| Page-level form hijack / clickjacking      | `frame-ancestors 'none'` + `X-Frame-Options: DENY` (HTTP-01 / #96).                                                                                                                             | Mitigado                    |
| Login CSRF (conta do atacante)             | AUTH-10                                                                                                                                                                                         | Mitigado                    |
| Tráfego HTTP sem TLS                       | HSTS fora de `development`; cookie `__Host-`/Secure em HTTPS (SESS-02). Local HTTP sem HSTS (esperado).                                                                                         | Depende do deploy           |
| Autocomplete                               | Login/registro usam `current-password` / `new-password` — correto para managers.                                                                                                                | Controle adequado           |

> **LGPD/GDPR:** conteúdo movido para [`PRIVACY-REPORT.md`](./PRIVACY-REPORT.md).

---

## 2. Mapa OWASP Top 10 (2021) → achados Top 10 (2021) → achados

| OWASP                              | Achados                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| A01 Broken Access Control          | STOR-01 (mitigado); STOR-02 (mitigado + keys legadas #106); STOR-03 (mitigado); AUTH-10 (mitigado)                                |
| A02 Cryptographic Failures         | CRYP-01 (mitigado); SESS-04 (mitigado parcial: jti/revoke; TTL 7d); TLS/HSTS HTTP-01                                              |
| A03 Injection                      | SSRF INP-04 (mitigado); settings AUTHZ-05 (mitigado)                                                                              |
| A04 Insecure Design                | Storage público mitigado (STOR-01); erasure de conta mitigado (RIGHT-02 / #102); quota (STOR-05)                                  |
| A05 Security Misconfiguration      | OPS-01 (mitigado: auth + bind loopback); HTTP-01 (headers; CSP report-only); AUTHZ-06 (mitigado)                                  |
| A06 Vulnerable Components          | OPS-05 (next-intl mitigado; residual sharp/postcss/nanoid)                                                                        |
| A07 Identification & Auth Failures | AUTH-05/I03 (mitigados, residual CAPTCHA/Redis); SESS-04/I04/I15 mitigados (residual TTL/TOTP/login pré-verify); AUTH-11 mitigado |
| A08 Software/Data Integrity        | Colisão de chave STOR-02 (mitigado; keys legadas #106); upload sem magic bytes INP-01 (mitigado)                                  |
| A09 Logging & Alerting             | OPS-04 (mitigado); sem alerta de login / stuffing                                                                                 |
| A10 SSRF                           | INP-04 (mitigado: pin + 6to4/NAT64)                                                                                               |

---

## 3. Ordem sugerida de correção

1. ~~**Não publicar dados reais** até STOR-01 (ACL / URLs assinadas).~~ Entregue (#101). ~~Mongo autenticado (OPS-01).~~ Entregue (#100). ~~STOR-02 (entropia + migração de keys legadas).~~ Entregue (#84, #106).
2. ~~Rate limit + secret JWT forte (AUTH-05, CRYP-01).~~ Entregue (#85, #88). CAPTCHA/Redis seguem abertos.
3. ~~Limites de body/MIME/senha (INP-01)~~ Entregue (#86). ~~DeleteObject + DELETE de imagem (STOR-03).~~ Entregue no lote autônomo; ~~exclusão de conta (RIGHT-02).~~ Entregue (#102). Residual: worker de orphans.
4. ~~Headers (HTTP-01).~~ Entregue (#96); CSP script-src ainda report-only. ~~Revogação na troca de senha (SESS-04).~~ Entregue (`jti` + `sessionsRevokedAt` + UI #123). ~~AUTH-07/08 + SESS-05 (reset/novo login/sessões).~~ Entregue (#121–#123); residual AUTH-09 (TOTP) / SESS-08 (TTL).
5. ~~Pacote LGPD.~~ Ver `PRIVACY-REPORT.md`.
6. ~~Dependências (`next-intl`) e CSRF de login.~~ Entregue no lote autônomo. Residual: audit de sharp/postcss/nanoid.

---

## 4. Como usar este arquivo

Atualize a coluna **Status** conforme o board. Itens de privacidade: `PRIVACY-REPORT.md`. Board: [Evolução do Vitraux](https://github.com/users/CaioGiasson/projects/3/views/1).

**PRs mergeadas em 2026-08-19:** [#84](https://github.com/CaioGiasson/vitraux/pull/84) STOR-02 · [#85](https://github.com/CaioGiasson/vitraux/pull/85) CRYP-01 · [#86](https://github.com/CaioGiasson/vitraux/pull/86) INP-01 · [#87](https://github.com/CaioGiasson/vitraux/pull/87) (privacidade — ver PRIVACY-REPORT) · [#88](https://github.com/CaioGiasson/vitraux/pull/88) AUTH-05 · [#91](https://github.com/CaioGiasson/vitraux/pull/91) OPS-03 · [#92](https://github.com/CaioGiasson/vitraux/pull/92) AUTHZ-05 · [#93](https://github.com/CaioGiasson/vitraux/pull/93) SESS-02 · [#94](https://github.com/CaioGiasson/vitraux/pull/94) INP-03 · [#95](https://github.com/CaioGiasson/vitraux/pull/95) AUTHZ-06 · [#96](https://github.com/CaioGiasson/vitraux/pull/96) HTTP-01 · [#99](https://github.com/CaioGiasson/vitraux/pull/99) lote autônomo (STOR-03–I03, I06, I07, I09, I10; RIGHT-01, I04, I10; minors #97/#98).

**PRs mergeadas em 2026-08-20:** [#100](https://github.com/CaioGiasson/vitraux/pull/100) OPS-01 · [#101](https://github.com/CaioGiasson/vitraux/pull/101) STOR-01 + SECP-01 · [#102](https://github.com/CaioGiasson/vitraux/pull/102) RIGHT-02 · [#104](https://github.com/CaioGiasson/vitraux/pull/104) fluxo de review de PRs · [#106](https://github.com/CaioGiasson/vitraux/pull/106) migração de keys Spaces.

---

## 5. Pré-refinamento

Rascunho de caminho técnico para cada item, antes de abrir issue. Um parágrafo por ID (máx. 100 palavras). Agrupar ou fatiar no refinamento formal.

### STOR-01

**Entregue (#101):** upload sem `public-read`; presigned GET na leitura (`StorageUrl.service`); script `spaces:make-private` para ACL legada. **Keys legadas (#106):** migradas com `spaces:migrate-keys`.

### STOR-02

**Entregue (#84 + #106):** `randomBytes(16)`, path `{ownerId}/{category}/`, unique/`findByKey`. Script `spaces:migrate-keys` reescreve keys `{env}/…` no Spaces e no Mongo (`File` / `Image.url` / `User.photoUrl`).

### OPS-01

**Entregue (#100):** Compose com `--auth`, keyfile, `MONGO_INITDB_ROOT_*`, bind `127.0.0.1:27717`, scripts de keyfile/migração, guia `docs/mongo-auth-setup.md`, validação prod em `validateEnv`/`healthcheck.mjs`. Residual operacional: TLS app→Mongo; VM de produção com Mongo gerenciado ou rede interna sem publish público.

### AUTH-05

Middleware de rate limit (memória no single-node; Redis se houver mais instâncias) nas rotas de login, register, password e nickname: chave IP+identificador, teto baixo (ex. 5/min) e lockout progressivo. Após N falhas, CAPTCHA. Login sempre dispara um `verify` dummy se o usuário não existir (AUTH-06). Resposta HTTP idêntica em stuffing. Testar que o 429 não vaza qual campo falhou.

### CRYP-01

Em `validateEnv`/`getJwtSecret`: rejeitar vazio, o literal do `.env.example`, e secretos com entropia baixa (mín. 32 bytes aleatórios). Falhar o boot em `ENVIRONMENT=prod` se a regra quebrar. Healthcheck replica a mesma regra (não só `length >= 16`). Opcional: `iss`/`aud` no `SignJWT`/`jwtVerify`. Rotacionar o secret atual se já foi commitado ou compartilhado.

### INP-01

Replicar em `uploadPhoto.route` o `estimateBase64DecodedBytes` de `createImage`. Limite de body no App Router (~4 MB). Depois do decode, `sniffImageMime` (já usado no import) e recusar mismatch com o MIME do data-URL. `assertPasswordPolicy`: máximo 64–128 caracteres antes do Argon2. Testes: payload enorme → 400; polyglot HTML com `data:image/jpeg` → 400.

### STOR-03

`StorageService.delete(key)` com `DeleteObject`. Worker (cron) lê `File` com `status=orphan` e apaga no Spaces; só então remove ou marca `deleted`. Expor `DELETE /api/v1/images/:id` (dono, `softDeleteById` + orphan). Lifecycle no bucket como rede de segurança. Sem delete real, RIGHT-02 não fecha. Testar que a URL antiga passa a 403/404.

### SESS-04

Incluir `jti` (UUID) no JWT e gravar sessão ativa (userId, jti, device, exp). `requireAuth` exige jti presente e não revogado. Em `changeUserPassword`, revogar todas as sessões do user (ou todas menos a atual) e reemitir cookie. TTL de acesso 15–60 min + refresh. UI: “encerrar outros dispositivos”. Purge de sessões expiradas (SESS-06). Logout continua blacklisting o jti, não o JWT inteiro.

### AUTH-06

Login: se o nick/e-mail não existe, `verifyPassword` contra hash dummy constante (timing). Cadastro: uma mensagem só (“não foi possível cadastrar”) para nick/e-mail em uso — o check de nick no cliente fica rate-limited (AUTH-05) e, se possível, só autenticado no perfil. Evitar 404 vs 200 como oráculo público; 204 uniforme é aceitável se ainda houver rate limit.

### AUTH-04

**Mitigado (parcial):** após `register`, challenge `verify` (token SHA-256, TTL 1h) + `EmailService`. Perfil: accordion amarelo/verde; reenvio e colagem de token; páginas `/verify-email`. Residual vs aceite original: login/sessão ainda funcionam antes de `emailVerifiedAt` (para permitir a seção no perfil). Reset de senha entregue em AUTH-07 (#122) e exige e-mail verificado.

### HTTP-01

Em `next.config.ts`, `headers()` globais: HSTS (`max-age=31536000; includeSubDomains`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restritiva, `Content-Security-Policy` com `frame-ancestors 'none'` (e nonce no `ThemeScript`, CLI-02). Começar CSP em report-only. Cookie `Secure` sempre atrás de TLS. Verificar login/mosaico depois, por causa de inline scripts.

### INP-04

Ampliar `isBlockedIp` para 6to4 (`2002:`), NAT64 (`64:ff9b:`), `fec0:`, e hostnames só-numéricos. O fetch deve conectar ao IP já resolvido (undici `dispatcher` / `connect` pin), não só checar DNS e depois usar o hostname (fecha rebinding). Revalidar IP a cada redirect. Estender `RemoteImage.service.test.ts` com esses casos. Manter magic bytes e teto de body.

### STOR-05

Somar `File.sizeBytes` por `ownerId` (published). Constante `USER_STORAGE_QUOTA_BYTES`. `createUserImage`/`uploadUserPhoto`/`import` recusam com 403 se estourar. Mostrar uso no perfil (item do ROADMAP). Rate limit de uploads (AUTH-05). Quando houver álbuns, a cota continua por usuário. Alerta de billing no Spaces se a soma global disparar.

### AUTHZ-06

Health de DB: não criar `PrismaClient` por request — usar `DbCommander.getClient()`. Restringir `/api/health*` a localhost, token ou rede interna. Remover `GET /api/v1/examples` (e o use case) do build de produção, ou exigir auth e não persistir. Isso também ajuda AUTHZ-07 e MIN-01 (menos dado residual).

### OPS-05

`npm update next-intl` para ≥ 4.9.2 (open redirect). Avaliar bump de `next` no patch 15.x que puxe `sharp`/`postcss` corrigidos antes de pular para 16. `npm audit` no CI como gate. Rodar `npm test` e smoke de i18n (`pt`/`en`/`es`) depois. Não usar `overrides` cegos sem reproduzir o mosaico e o login.

### AUTH-10

Em login/register/logout, exigir `Origin` (ou `Referer`) igual ao host da app; 403 se faltar em produção. Alternativa: header custom same-origin (`X-Requested-With`) que form cross-site não manda. Cookie `SameSite=Strict` no session (pode quebrar deep-link externo — testar). CSRF clássico nas outras mutações cai no mesmo helper. Cobre o caso “vítima loga na conta do atacante”.

### AUTH-11

**Mitigado:** canonicalizar nickname (NFC + lowercase `en-US`, strip zero-width); charset Latin+dígitos+`_`/`-`; rejeitar controles e formas que divergem sob NFKC. Unique no valor canônico. `findByNickname` / register / update / check / login por nick alinhados. Script `nickname:backfill` + `docs/operators/nickname-canonicalization.md`. Sem lib UTS #39 completa (scripts não Latin rejeitados). Alinha PREC-01 (copy i18n).

### AUTHZ-05

`setUserSetting` e o array de settings no register só aceitam keys de `SETTINGS_KEYS`, com tipo por chave (`boolean` para `darkMode`/`showSecretImages`, enum de locale, número limitado para zoom). Recusar o resto com 400. Teto do array = número de keys. Testes de mass assignment (`__proto__`, keys longas).

### SESS-02

Cookie de sessão: nome `__Host-vitraux-session`, `Secure`, `Path=/`, sem `Domain`. `Secure=true` quando há HTTPS, não só `NODE_ENV`. Device: gerar no servidor no login e guardar na sessão; apagar o cookie JS `vitraux-device` ou torná-lo HttpOnly via Set-Cookie da API. Combina com SESS-04 (jti) e MIN-01 (minimização).

### INP-03

Zod (ou helpers) nos routes de create/update/import: título ≤ 200, descrição ≤ 5000, no máx. 20 tags, cada uma ≤ 40, charset limitado. Rejeitar antes do Prisma. Espelhar no frontend (`maxLength`) para UX. Teste de payload inflado → 400. Busca já escapa regex; o teto evita só o documento gigante.

### AUTH-07 / AUTH-08 / SESS-05

**Mitigado (aceite mínimo):** AUTH-07 reset com e-mail verificado (#122); AUTH-08 alerta de novo login (#121); SESS-05 listar/revogar sessões (#123); `iss`/`aud` em CRYP-01/SESS-03. Residual: AUTH-09 TOTP; SESS-08 TTL curto + refresh.

### OPS-03

Manter scripts no repo, mas não no artifact de `next start`. `PINTEREST_COOKIES` só em secret local, nunca na app web. `list-users` atrás de checagem de `ENVIRONMENT=dev` ou recusar se `NODE_ENV=production`. Documentar no README que export Pinterest é ferramenta de operador, não feature de produto. Mascarar e-mail no stdout (SECP-07).

### CLI-01

No unmount de `LoginForm`/`RegisterForm`/`ProfileForm`, `setPassword('')`. Toggle “mostrar”: voltar para `type=password` após N segundos ou `blur`. Não logar o value. Autocomplete permanece. Risco residual de shoulder surfing é aceitável se o timeout existir.

### OPS-04

`LogManager.error` só serializa `name` + `message` já sanitizado. Nunca `JSON.stringify(error)` cru. Redact `mongodb://`, tokens, `password`. Em produção, sem `stack` (ou só amostrado). Health de DB não loga a exception inteira. Revisa SECP-07 no mesmo PR se possível.

### CLI-02

Extrair o IIFE do tema para `/public/theme.js` (conteúdo estático) ou script com `nonce` gerado no layout quando a CSP (HTTP-01) existir. Evitar `dangerouslySetInnerHTML` com string montada. O cookie `vitraux-theme` continua sendo a fonte; o script só aplica a classe `dark`.

### CLI-03

`toPublicUser` / DTO de `/me`: `id`, `name`, `nickname`, `email`, `photoUrl`, `settings` (allowlist). Remover `deletedAt`, `createdAt`/`updatedAt` se o cliente não usa. Settings só as keys conhecidas (AUTHZ-05). Menos PII se XSS aparecer antes da CSP.

### CLI-04

`generateMetadata`: se `visibility !== PUBLIC`, `robots: { index: false }` mesmo para o dono. Página pública: título ok; opcional `noindex` por setting do dono. `robots.txt` não precisa bloquear `/image/` se a metadata já filtrar. Confirmar que PRIVATE continua 404 para anônimo (já é o caso).

### HTTP-05

Em todo `<img>` de mosaico/detalhe/avatar: `referrerPolicy="no-referrer"`. Quando STOR-01 entregar signed URL, o `src` deixa de ser permanente. Não usar `crossOrigin` sem CORS no Spaces. Isso reduz vazamento da URL “secreta” via Referer para terceiros.

### HTTP-07

**Mitigado:** `public/.well-known/security.txt` (RFC 9116: `Contact: mailto:cainitech@gmail.com`, `Preferred-Languages: pt, en`, `Expires: 2027-08-21T00:00:00.000Z`; Canonical omitido até URL de produção estável) e `public/robots.txt` com `Disallow: /api/`. Health inalterado (AUTHZ-06).

### SESS-07

`logoutUser`: se o token é inválido ou já está em `SessionEvent`, ainda assim limpar o cookie e devolver 204. Não 401 em logout. Cliente trata qualquer resposta como “saiu”. Evita oracle de “este JWT existiu”.

### SESS-06

`SessionEvent.token` passa a ser SHA-256 do JWT (ou o `jti` de SESS-04). Índice em `occurredAt`. Job apaga eventos com `exp` passado. Não guardar o JWT em claro. Se I02 vier antes, a tabela de sessões ativas substitui parte deste modelo e o evento vira só auditoria.

### AUTH-12

Remover `preventAutofill`, `data-1p-ignore` e `data-lpignore` do registro e da troca de senha. `autoComplete="new-password"` basta. Password managers aumentam a qualidade da senha (política já exige 8+ e 3 classes).

### STOR-06

Parar de prefixar a key com `getStorageConfig().environment`. Path opaco: `{ownerId}/{random}.{ext}` (STOR-02). Ambiente fica só em bucket/conta separados (`vitraux-dev` vs `vitraux-prod`), não na URL. Atualizar URLs existentes na migração de C01/C02.

### TEST-01

**Mitigado (#113):** suite Jest (sem Playwright) cobre authz negativa e o caminho signed URL: `canViewImage` (visitante/outro usuário/SECRET), `GetImageById` (NotFound sem chamar `presignImageUrl`; sucesso devolve URL assinada, não a canônica), listagem pública só `PUBLIC` / mine via `listVisibilitiesForMine`, TTL privado < público. GET HTTP real no Spaces (403 na URL crua) permanece cobertura de infra pós-C01, fora do unit test.
