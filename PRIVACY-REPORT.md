# Relatório de privacidade (LGPD / GDPR) — Vitraux

> **Referência normativa:** os códigos deste relatório citam `PRIVACY-ASSESSMENT.md`. Controles técnicos de segurança correlatos estão em `SECURITY-ASSESSMENT.md` / `SECURITY-REPORT.md`.

| Campo          | Valor                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Tipo           | Assessment **LGPD / GDPR** (whitebox + docs operacionais)                                                                     |
| Alvo           | Aplicação Vitraux (Next.js 15.5.23, App Router, Prisma/MongoDB, DigitalOcean Spaces)                                          |
| Data           | 2026-08-18 (extraído de SECURITY-REPORT em 2026-08-21; códigos alinhados a PRIVACY-ASSESSMENT)                                |
| Escopo         | Transparência, bases legais, direitos do titular, minimização, retenção, transferências, responsabilização, menores, precisão |
| Fora de escopo | Pentest de autenticação/sessão/storage (ver `SECURITY-REPORT.md`); revisão legal por advogado                                 |
| Status inicial | Itens abriam como **Aberto**; a maioria está **Mitigado** (ver tabelas)                                                       |

**Legenda de Status:** `Aberto` · `Em andamento` · `Mitigado` · `Aceito (risco)` · `Falso positivo`

**Complexidade (1–5)** e **Confiança (1–5):** mesmas definições do relatório de segurança.

---

## Resumo executivo

O pacote LGPD/GDPR do Vitraux cobre política e termos versionados, aceite no cadastro, age gate 18+, export/exclusão de conta, verificação e troca de e-mail, retenção com job de purge, RoPA, playbook de incidente, encarregado nomeado e DPA DigitalOcean via ToS. Residuais principais: revisão jurídica formal (TRANS-05 no assessment), região de host/Mongo TBD (XFER-03), logs 90d automatizados (RET-03) e moderação CSAM automática (CHILD-03).

| Área        | Críticos | Importantes | Minors |
| ----------- | -------: | ----------: | -----: |
| LGPD / GDPR |        6 |          10 |      6 |

Board: [Evolução do Vitraux](https://github.com/users/CaioGiasson/projects/3/views/1).

---

## 1. Assessment LGPD / GDPR

Base: LGPD (Lei 13.709/2018) arts. 6, 7, 8, 9, 14, 18, 46–49; GDPR arts. 5, 6, 12–17, 32, 44–49. ROADMAP já marca **Termos** e **Verificação de idade** como pendentes.

### 1.1 Críticos

| ID       | Issue                                                   | Status   | Complexidade | Confiança | Princípio / artigo                                                                                                                                                              | Achado                                                                                                                                                                                                                                                                                                            | Impacto                                                                               | Mitigação                                                                                        |
| -------- | ------------------------------------------------------- | -------- | -----------: | --------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| TRANS-01 | [#78](https://github.com/CaioGiasson/vitraux/issues/78) | Mitigado |            3 |         5 | Transparência (LGPD art. 9; GDPR art. 13)                                                                                                                                       | Não há política de privacidade, aviso de coleta, nem base legal informada no cadastro. **Correção:** `/privacy` e `/terms` (rascunho PT, chrome i18n). Residual: revisão por advogado. Contato: Caio Felipe Giasson / `cainitech@gmail.com` (SECP-03).                                                            | Tratamento ilícito; impossível consentimento informado; risco de sanção ANPD/UE.      | Política + aviso no registro (quem, o quê, para quê, retenção, transferências, DPO/contato).     |
| BASE-01  | [#79](https://github.com/CaioGiasson/vitraux/issues/79) | Mitigado |            2 |         5 | Consentimento / termos (LGPD arts. 7–8)                                                                                                                                         | Cadastro cria conta só com nickname, e-mail e senha. Sem checkbox de termos, menor, ou finalidade. ROADMAP: Termos pendente. **Correção:** checkboxes + `acceptedTermsAt`/`acceptedPrivacyAt`/versões. Residual: age gate em CHILD-01.                                                                            | Sem evidência de aceite; contas de menores sem art. 14.                               | Termos + privacidade versionados; checkbox; recusar menores sem consentimento do responsável.    |
| SECP-01  | [#80](https://github.com/CaioGiasson/vitraux/issues/80) | Mitigado |            4 |         5 | Medida de segurança desproporcional: fotos PRIVATE/SECRET eram objetos públicos. **Correção (#101):** bucket privado + presigned GET. Residual: DPIA formal e revisão jurídica. | `Storage.service.ts`; `StorageUrl.service.ts`                                                                                                                                                                                                                                                                     | Incidente de confidencialidade em massa.                                              | DPIA (GDPR art. 35); manter controles STOR-01/C02.                                               |
| RIGHT-02 | [#81](https://github.com/CaioGiasson/vitraux/issues/81) | Mitigado |            4 |         5 | Eliminação / right to erasure (LGPD art. 18 IV; GDPR art. 17)                                                                                                                   | **Correção:** `DELETE /api/v1/users/me` com senha; Spaces `DeleteObject`; soft-delete imagens; anonimiza email/nick (`deleted_{id}`); `sessionsRevokedAt`; UI no perfil; exclusão imediata documentada. Residual: backups offsite à parte; legal hold futuro.                                                     | Titular não consegue ser esquecido; cópias eternas no CDN.                            | Fluxo “excluir conta”: anonimizar PII, apagar objetos, revogar JWTs, documentar retenção legal.  |
| XFER-02  | [#82](https://github.com/CaioGiasson/vitraux/issues/82) | Mitigado |            3 |         4 | Transferência internacional (LGPD arts. 33–35; GDPR Cap. V)                                                                                                                     | Spaces em `nyc3` (EUA). **Correção:** política declara EUA; DPA DigitalOcean **incorporado ao ToS** e aceito na criação da conta ([ToS 2023](https://www.digitalocean.com/legal/terms-of-service-agreement-2023)); registro em `docs/operators/transfers.md`. Residual: host/Mongo TBD; migração `gru1` opcional. | Transferência sem garantia adequada.                                                  | DPA com DigitalOcean; SCCs; informar o titular; minimizar (região `gru1`/Frankfurt se possível). |
| CHILD-01 | [#83](https://github.com/CaioGiasson/vitraux/issues/83) | Mitigado |            4 |         5 | Dados de crianças / idade (LGPD art. 14; GDPR art. 8)                                                                                                                           | **Correção:** age gate com `birthDate` (UTC date-only), bloqueio <18, `dateOfBirth`+`ageVerifiedAt` sem exposição em PublicUser; ToS UGC/CSAM pt/en/es; `POST /images/:id/report` + UI; docs age-policy/csam. Residual: sem PhotoDNA/NCMEC automático.                                                            | Tratamento de dados de menor; risco de conteúdo ilegal hospedado (CSAM) sem processo. | Age gate; ToS; canal de denúncia; hash/moderation; obrigação legal de reportar.                  |

### 1.2 Importantes

| ID       | Issue                                                   | Status   | Complexidade | Confiança | Princípio / artigo                                                   | Achado                                                                                                                                                                                                                                                                                                                                                                              | Impacto                                                                                                           | Mitigação                                                                                                  |
| -------- | ------------------------------------------------------- | -------- | -----------: | --------: | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| RIGHT-01 | [#68](https://github.com/CaioGiasson/vitraux/issues/68) | Mitigado |            3 |         5 | Direitos de acesso e portabilidade (LGPD art. 18; GDPR arts. 15, 20) | `/me` e perfil devolvem parte dos dados; não há export JSON/ZIP de conta + imagens + settings + sessões. **Correção:** `GET /api/v1/users/me/export` + botão no perfil (JSON). Residual: sem ZIP nem URLs assinadas (STOR-01).                                                                                                                                                      | Titular não exerce portabilidade.                                                                                 | Endpoint “baixar meus dados” (JSON + lista de URLs ou arquivo).                                            |
| MIN-01   | [#69](https://github.com/CaioGiasson/vitraux/issues/69) | Mitigado |            2 |         5 | Minimização (LGPD art. 6 III; GDPR art. 5.1.c)                       | Cookie `vitraux-device` (1 ano) + settings livres + Example leftover. **Correção (#92/#93/#95):** device só no servidor; allowlist de settings; `/examples` off em production. SessionEvent guarda hash do `jti` (SESS-06).                                                                                                                                                         | Tracking de dispositivo além do necessário para sessão.                                                           | Device só no servidor; expirar; não persistir 1 ano; allowlist de settings.                                |
| RET-01   | [#70](https://github.com/CaioGiasson/vitraux/issues/70) | Mitigado |            3 |         4 | Limitação de retenção (GDPR art. 5.1.e)                              | **Docs:** `docs/operators/retention.md` + resumo em `privacy.{pt,en,es}.md`. Conta ativa até exclusão imediata (RIGHT-02); SessionEvent/ActiveSession até `exp`; orphans alvo 7d; logs 90d; JWT 7d como escolha de produto/residual; backups à parte. **Job:** `npm run cron -- retention-purge` (+ CronJob K8s exemplo). Residual: schedule no host e rotação de logs fora do app. | Acúmulo injustificado (mitigado com política + worker).                                                           | Tabela de retenção + jobs (orphans 7d, sessões/logs).                                                      |
| MIN-02   | [#71](https://github.com/CaioGiasson/vitraux/issues/71) | Mitigado |            2 |         4 | Cookies / rastreadores (LGPD; ePrivacy/GDPR)                         | Cookies: sessão (`vitraux-session` ou `__Host-vitraux-session`), `vitraux-theme`, `vitraux-locale`. `vitraux-device` deixou de ser gravado (#93). **Correção:** aviso informativo de cookies essenciais + menção na política. Residual: sem CMP (não há trackers).                                                                                                                  | Device cookie pode ser qualificado como identificador online (mitigado). Theme/locale funcionais ainda sem aviso. | Banner só se houver não-essenciais; classificar device como necessário ou pedir consentimento; documentar. |
| SECP-06  | [#72](https://github.com/CaioGiasson/vitraux/issues/72) | Mitigado |            4 |         5 | Finalidade e e-mail não verificado                                   | E-mail é identificador de login sem prova de posse (AUTH-04). **Correção:** mesmo fluxo de verificação (#117). Residual: login pré-verificação.                                                                                                                                                                                                                                     | Tratamento de dado alheio; spam/phishing usando o app como “cadastrei seu e-mail”.                                | Verificação; finalidade explícita (conta, segurança, avisos). Sem marketing sem opt-in.                    |
| PREC-01  | [#73](https://github.com/CaioGiasson/vitraux/issues/73) | Mitigado |            3 |         5 | Precisão / homógrafos                                                | Nicknames confusáveis (AUTH-11). **Correção:** canonicalização em AUTH-11 + copy i18n (unicidade ignorando maiúsculas / outros alfabetos). Residual: denúncia de impersonação via CHILD-01.                                                                                                                                                                                         | Usuário enganado ao seguir “perfil”.                                                                              | Normalização; denúncia de impersonação.                                                                    |
| SECP-04  | [#74](https://github.com/CaioGiasson/vitraux/issues/74) | Mitigado |            3 |         4 | Suboperadores                                                        | **Correção (docs):** `docs/operators/subprocessors-ropa.md` — Spaces nyc3, Mongo local/TBD, hosting TBD, `next/font` self-host no runtime, Pinterest só como CLI do operador. DPA Spaces via ToS DO (XFER-02). Residual: host/Mongo de produção a preencher.                                                                                                                        | Cadeia de operadores não mapeada (mitigado no RoPA; contratos humanos pendentes).                                 | RoPA (records of processing); contratos art. 39 LGPD / art. 28 GDPR.                                       |
| SECP-03  | [#75](https://github.com/CaioGiasson/vitraux/issues/75) | Mitigado |            3 |         5 | Responsabilização (art. 6 X)                                         | **Playbook** em `docs/operators/incident-response.md`; DPIA em `dpia-images.md`; `security.txt`. **Encarregado:** Caio Felipe Giasson — `cainitech@gmail.com` (política pt/en/es, RoPA, playbook). Residual: registro ANPD se/quando o porte exigir (jurídico).                                                                                                                     | Accountability com ponto de contato nomeado.                                                                      | Nomear encarregado; playbook de incidente (ANPD em prazo razoável).                                        |
| RIGHT-03 | [#76](https://github.com/CaioGiasson/vitraux/issues/76) | Mitigado |            3 |         5 | Correção (art. 18 III)                                               | Perfil edita nome/nick/foto/senha; **não edita e-mail**. **Correção (#117):** troca com senha + confirmação do endereço antigo (`change_old`) e do novo (`change_new`).                                                                                                                                                                                                             | Dado cadastral imutável e não verificado.                                                                         | Fluxo de troca de e-mail com verificação dos dois endereços.                                               |
| SECP-07  | [#77](https://github.com/CaioGiasson/vitraux/issues/77) | Mitigado |            2 |         5 | Logs e PII                                                           | Logs podem conter stacks e erros de DB. **Correção (#91 + lote):** `list-users` mascara e-mail; `Log.manager` redact + sem stack em production (OPS-04).                                                                                                                                                                                                                            | Vazamento interno.                                                                                                | Não logar e-mail em claro; mascarar; restringir scripts admin.                                             |

### 1.3 Minors

| ID       | Issue                                                   | Status   | Complexidade | Confiança | Princípio / artigo                  | Achado                                                                                                                                                                                                      | Impacto                                                  | Mitigação                                                   |
| -------- | ------------------------------------------------------- | -------- | -----------: | --------: | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| TRANS-03 | —                                                       | Mitigado |            2 |         5 | Informação em camadas               | Metadata HTML genérica (`Vitraux — aplicação Next.js`). Sem contato de privacidade. **Correção:** rotas + links no sidebar/login/registro (TRANS-01/C02 / #87).                                             | Transparência incompleta.                                | Página `/privacy` e `/terms` ligadas no rodapé.             |
| AUTHZ-07 | —                                                       | Mitigado |            1 |         5 | Limitação de armazenamento em cache | `CACHE_LIFETIME_SECONDS=21600` no example / Example boilerplate. **Correção (#95):** `GET /api/v1/examples` 404 em production. Residual: código Example ainda existe em development.                        | Baixo (feature residual).                                | Remover Example de produção.                                |
| MIN-03   | [#98](https://github.com/CaioGiasson/vitraux/issues/98) | Mitigado |            1 |         5 | Dados de tema/locale                | Preferência de UI no cookie e na nuvem. **Correção:** política 2026-08-20 menciona cookies essenciais de sessão, tema e idioma.                                                                             | Legítimo se informado.                                   | Mencionar na política (interesse legítimo / contrato).      |
| MIN-04   | [#98](https://github.com/CaioGiasson/vitraux/issues/98) | Mitigado |            3 |         4 | Imagens PUBLIC no mosaico global    | Feed `scope=all` lista todas as públicas sem paginação aparente. **Correção:** cursor 40 itens; setting `appearInGlobalMosaic`.                                                                             | Perfil indireto por tags/títulos.                        | Paginação; opção “não aparecer no mosaico global”.          |
| TRANS-04 | [#90](https://github.com/CaioGiasson/vitraux/issues/90) | Mitigado |            2 |         5 | i18n (pt/en/es)                     | Textos de privacidade inexistentes em qualquer idioma. **Correção:** `content/legal/privacy.{pt,en,es}.md` e termos no cadastro (#90).                                                                      | GDPR exige linguagem clara.                              | Traduzir avisos.                                            |
| MIN-05   | —                                                       | Mitigado |            2 |         5 | Soft-delete vs. anonimização        | `deletedAt` em User/Image não anonimizava e-mail/nickname (índice unique). **Correção (#102 / RIGHT-02):** exclusão de conta grava `deleted_{id}@invalid.local` / `deleted_{id}` e apaga objetos no Spaces. | “Excluir” incompleto mesmo depois de implementar o flag. | Anonimizar identificadores únicos (`deleted_{id}@invalid`). |

---

## 2. Pré-refinamento (itens de privacidade)

### TRANS-01

Página `/privacy` (e locale) com: controlador, finalidades, bases (contrato/consentimento), dados (conta, imagens, device, logs), retenção, transferências (Spaces), direitos, contato do encarregado. Link no cadastro e rodapé. Texto jurídico revisado; o código só serve o markdown versionado. Sem essa página, checkbox de BASE-01 não informa.

### BASE-01

No `RegisterForm`: checkboxes obrigatórios para Termos e Privacidade, gravar `acceptedTermsAt`, `acceptedPrivacyAt`, versões. Recusar POST sem isso. Bloquear cadastro de menor de 18 anos sem fluxo de responsável (CHILD-01). Versionar arquivos em `content/legal/`. Auditoria: não sobrescrever aceite antigo.

### SECP-01

**Mitigado (#101 + DPIA):** controles técnicos (bucket privado + signed URL + keys com `ownerId`). DPIA curta em `docs/operators/dpia-images.md` (ameaça = vazamento em massa; residual documentado). Revisão jurídica ainda fora do código.

### RIGHT-02

`DELETE /api/v1/users/me`: revogar JWTs (`sessionsRevokedAt` + SessionEvent), DeleteObject de Files/imagens, anonimizar e-mail/nick (`deleted_{id}@invalid.local`, nick `deleted_{id}`), `deletedAt=now`. Confirmação com senha atual. **v1: exclusão imediata** (documentado em política + `docs/operators/account-deletion.md`). Backups offsite geridos à parte.

### XFER-02

**Mitigado:** política pt/en/es declara Spaces `nyc3`/EUA. O DPA DigitalOcean é **parte do TOS** (incorporação por referência) e foi **aceito na criação da conta** do operador — ver [ToS Agreement (2023)](https://www.digitalocean.com/legal/terms-of-service-agreement-2023) e `docs/operators/transfers.md`. Residual: preencher região de app host/Mongo quando o deploy de produção for definido; migração `gru1`/`fra1` opcional.

### CHILD-01

**Mitigado:** tela de idade no registro (`birthDate` YYYY-MM-DD, UTC date-only); bloqueio <18 (sem consentimento parental); termos UGC/CSAM + canal de denúncia; `Report` + `POST /api/v1/images/:id/report` + UI. Processo CSAM/NCMEC fora do repo (`docs/operators/csam.md`). Residual: moderação automática / PhotoDNA.

### RIGHT-01

`GET /api/v1/users/me/export` (auth): JSON com perfil, settings, sessões resumidas, metadados de imagens e lista de URLs (assinadas de curta duração se C01). ZIP opcional na v2. Rate limit 1/dia. O front: botão “Baixar meus dados” no perfil. Não incluir `passwordHash` nem JWT cru.

### MIN-01

Device id só no servidor (SESS-02), TTL = sessão, não 1 ano. Settings allowlist (AUTHZ-05). Não persistir Example. Cookie theme/locale documentados como funcionais (MIN-02). JWT sem `device` em texto se a sessão já guarda o id. Reavaliar se o claim `device` ainda é necessário.

### RET-01

**Mitigado:** `docs/operators/retention.md` + job `scripts/cron/jobs/retention-purge.mjs` (`npm run cron -- retention-purge`, crontab/K8s em `docs/operators/cron.md`). Orphans 7d no Spaces; `SessionEvent`/`ActiveSession` com `exp` passado. Residual: agendar no host de produção; logs 90d continuam processo de ops.

### MIN-02

Classificar cookies: session = necessário; theme/locale = funcionais; device = necessário só se I13 mover para o servidor, senão consentimento. Se sobrar só necessários, aviso informativo no rodapé basta (sem blocker). Se houver analytics no futuro, aí sim CMP. Não instalar banner genérico que pede opt-in inútil.

### SECP-06

**Mitigado (parcial):** mesmo epic que AUTH-04 — prova de posse via token + `EmailService`. Finalidades na política inalteradas (auth/segurança). Residual: conta usável antes da confirmação.

### PREC-01

**Mitigado (com AUTH-11):** canonicalização + copy no registro/perfil (pt/en/es) sobre unicidade ignorando maiúsculas e outros alfabetos. Denúncia de impersonação disponível via canal CHILD-01 (`POST .../report`).

### SECP-04

**Mitigado (docs):** `docs/operators/subprocessors-ropa.md` — Spaces nyc3, Mongo local/TBD, hosting TBD, next/font self-host no runtime, Pinterest como CLI do operador (não suboperador do SaaS). DPA Spaces fechado via ToS DO (XFER-02).

### SECP-03

**Mitigado:** playbook `docs/operators/incident-response.md`; DPIA `dpia-images.md`; `security.txt`. Encarregado: **Caio Felipe Giasson** — `cainitech@gmail.com` (política, RoPA, playbook). Residual: obrigações ANPD de porte/constituição formal se aplicáveis.

### RIGHT-03

**Mitigado:** `POST /users/me/email/change` (senha + novo e-mail) → challenge no endereço **atual** (`change_old`); após confirmação, challenge no **novo** (`change_new`); só então troca `email` e marca verificado. UI no perfil. Índice único no e-mail ativo.

### SECP-07

Junto com OPS-04 e OPS-03: mascarar e-mail (`a***@x.com`) em scripts; nunca logar body de login/register; stdout do `list-users` só em dev. Política de acesso ao log do host. PII em log é incidente se o agregador for amplo.

### TRANS-03

Rotas `/privacy` e `/terms` (next-intl) + links no `AppShell`/rodapé e no login/registro. Metadata `description` menos genérica. Contato de privacidade no rodapé. Conteúdo nasce em C01/C02; esta issue é só a superfície de navegação.

### AUTHZ-07

Remover rota, controller, use case e model `Example` do runtime de produção (AUTHZ-06). `CACHE_LIFETIME_SECONDS` só se algum cache real restar. Menos dado pessoal acidental e menos superfície.

### MIN-03

Uma frase na política: tema e idioma são preferências da conta/contrato, cookies funcionais, sem perfilamento. Código já sincroniza cookie ↔ settings; não precisa de banner se I04 classificar como funcional.

### MIN-04

Paginar `listImages` `scope=all` (cursor `createdAt`+`id`). Setting `appearInGlobalMosaic` (default true) filtrado no search. Quem não quer descoberta sai do feed e mantém o deep-link se a imagem for PUBLIC. Evita perfilamento indireto por tags.

### TRANS-04

Traduzir política e termos em `pt`/`en`/`es` (arquivos paralelos). Cadastro mostra o texto do locale ativo. GDPR: linguagem clara; não machine-translate jurídico sem revisão. Pode ser a mesma issue de C01 com critério “três idiomas”.

### MIN-05

**Entregue no RIGHT-02 (#102):** anonimização de e-mail/nick na exclusão de conta + DeleteObject dos Files do dono.

---

## 3. Como usar este arquivo

Atualize a coluna **Status** conforme o board. Cruzar com `PRIVACY-ASSESSMENT.md` (checklist absoluto). Achados de segurança pura permanecem em `SECURITY-REPORT.md`.
