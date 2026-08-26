# Avaliação absoluta de privacidade — Vitraux (LGPD / GDPR)

| Campo          | Valor                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Tipo           | Referência **absoluta** de privacidade (baseline + itens do assessment LGPD/GDPR) — não apenas gaps do pentest                     |
| Alvo           | Aplicação Vitraux (Next.js App Router, Prisma/MongoDB, DigitalOcean Spaces)                                                        |
| Data           | **2026-08-21**                                                                                                                     |
| Controlador    | **Vitraux**, operado por **Caio Felipe Giasson**                                                                                   |
| Encarregado    | **Caio Felipe Giasson** — `cainitech@gmail.com`                                                                                    |
| Base normativa | LGPD (Lei 13.709/2018) arts. 6–9, 14, 18, 33–35, 37, 39, 46–49; GDPR arts. 5–6, 8, 12–17, 28, 30, 32, 35, 44–49 (quando aplicável) |
| Cruzamentos    | `PRIVACY-REPORT.md` · `SECURITY-ASSESSMENT.md` · `SECURITY-REPORT.md` · `PERFORMANCE-ASSESSMENT.md`                                |
| Fontes         | `content/legal/*`, `docs/operators/*.md`, código de cadastro/export/exclusão/retenção                                              |

**Legenda:** ✅ cumprido · ❌ não cumprido

Este documento descreve o **estado atual** dos controles de privacidade do produto e da operação, como checklist permanente. Diferencia-se do `SECURITY-REPORT.md`, que registra achados de pentest/assessment com status de tratamento; aqui o foco é **cumprimento / não cumprimento** do controle esperado.

---

## Checklist

| Código   | Assessment | Descrição breve                                          |
| -------- | ---------- | -------------------------------------------------------- |
| TRANS-01 | ✅         | Política de privacidade publicada (`/privacy`)           |
| TRANS-02 | ✅         | Termos de uso publicados (`/terms`)                      |
| TRANS-03 | ✅         | Informação em camadas (cadastro / sidebar / rodapé)      |
| TRANS-04 | ✅         | Textos legais em pt / en / es                            |
| TRANS-05 | ❌         | Revisão jurídica formal por advogado                     |
| BASE-01  | ✅         | Aceite versionado de termos e privacidade no cadastro    |
| BASE-02  | ✅         | Bases legais documentadas na política                    |
| BASE-03  | ✅         | Finalidades limitadas; sem marketing sem opt-in          |
| RIGHT-01 | ✅         | Acesso e portabilidade (export JSON da conta)            |
| RIGHT-02 | ✅         | Eliminação / exclusão com anonimização + `DeleteObject`  |
| RIGHT-03 | ✅         | Correção de dados (perfil + troca de e-mail verificada)  |
| RIGHT-04 | ✅         | Confirmação de tratamento / transparência                |
| MIN-01   | ✅         | Minimização (device server-side, settings allowlist)     |
| MIN-02   | ✅         | Aviso de cookies essenciais (sem trackers de marketing)  |
| MIN-03   | ✅         | Preferências tema/locale documentadas como funcionais    |
| MIN-04   | ✅         | Opt-out do mosaico global (`appearInGlobalMosaic`)       |
| MIN-05   | ✅         | Anonimização de e-mail/nick na exclusão                  |
| RET-01   | ✅         | Política de retenção documentada                         |
| RET-02   | ✅         | Job automatizado de purge (orphans, sessões)             |
| RET-03   | ❌         | Retenção automatizada de logs de host/agregador (90d)    |
| XFER-01  | ✅         | Transparência de transferência Spaces nyc3 / EUA         |
| XFER-02  | ✅         | DPA DigitalOcean via ToS aceito na criação da conta      |
| XFER-03  | ❌         | Região de app host e Mongo de produção documentada       |
| SECP-01  | ✅         | Confidencialidade de imagens + DPIA curta                |
| SECP-02  | ✅         | Playbook de incidente de dados                           |
| SECP-03  | ✅         | Encarregado nomeado (pessoa física + e-mail)             |
| SECP-04  | ✅         | RoPA / registro de suboperadores                         |
| SECP-05  | ✅         | Canal de denúncia UGC / CSAM                             |
| SECP-06  | ✅         | Prova de posse de e-mail (verificação)                   |
| SECP-07  | ✅         | Minimização de PII em logs e scripts admin               |
| CHILD-01 | ✅         | Age gate 18+ (UTC date-only) no cadastro                 |
| CHILD-02 | ✅         | Bloqueio de menores sem fluxo de responsável             |
| CHILD-03 | ❌         | Moderação automatizada tipo PhotoDNA / NCMEC             |
| PREC-01  | ✅         | Precisão de identificadores públicos (nickname canônico) |

### Resumo

| Status          | Quantidade |
| --------------- | ---------: |
| ✅ Cumprido     |         33 |
| ❌ Não cumprido |          4 |
| **Total**       |     **37** |

---

## Detalhamento

### TRANS-01 — Política de privacidade publicada (`/privacy`)

✅ Cumprido. A rota localizada `/privacy` serve o markdown versionado em `content/legal/privacy.{pt,en,es}.md` (versão **2026-08-21**). O texto identifica o controlador (**Vitraux** / Caio Felipe Giasson), o encarregado (`cainitech@gmail.com`), finalidades, bases legais, categorias de dados, retenção, transferência Spaces nyc3/EUA, direitos do titular e canal de denúncias. Corresponde a TRANS-01 no `SECURITY-REPORT.md`. Residual: o texto é rascunho operacional até revisão jurídica (TRANS-05).

### TRANS-02 — Termos de uso publicados (`/terms`)

✅ Cumprido. A rota `/terms` publica `content/legal/terms.{pt,en,es}.md` (versão alinhada em `LEGAL_VERSIONS.terms`). Os termos cobrem uso da conta, conteúdo gerado pelo usuário (UGC), proibições (incluindo CSAM) e consequências de violação, complementando a política de privacidade. Aceite obrigatório no cadastro (BASE-01). Relacionado a BASE-01 / CHILD-01 no relatório de segurança.

### TRANS-03 — Informação em camadas

✅ Cumprido. Links para privacidade e termos aparecem no fluxo de cadastro (checkboxes com âncoras), no login, na sidebar e no rodapé do `AppShell`, além do aviso de cookies essenciais. Isso implementa informação em camadas (TRANS-03): aviso curto na interface + páginas completas. O titular não depende só do markdown longo para descobrir o contato de privacidade.

### TRANS-04 — Textos legais em pt / en / es

✅ Cumprido. Política e termos existem nos três locales do produto (`privacy.pt.md` / `.en.md` / `.es.md` e equivalentes de termos). O chrome i18n e o cadastro usam as mesmas versões. Atende TRANS-04 e a expectativa GDPR de linguagem clara para o público do app. Manutenção: qualquer mudança de versão deve atualizar os três idiomas e `LEGAL_VERSIONS`.

### TRANS-05 — Revisão jurídica formal por advogado

❌ Não cumprido. Política, termos, DPIA curta, playbook de incidente e RoPA são documentos **operacionais / rascunho técnico**. O `SECURITY-REPORT.md` e os docs em `docs/operators/` deixam explícito que revisão por advogado e parecer formal estão fora do escopo de código. Até essa revisão, bases legais e redação pública permanecem sujeitas a ajuste. Não bloqueia os controles técnicos já entregues, mas impede afirmar conformidade jurídica plena.

### BASE-01 — Aceite versionado no cadastro

✅ Cumprido. O `RegisterForm` exige checkboxes de Termos e Privacidade; o use case grava `acceptedTermsAt`, `acceptedPrivacyAt` e as versões aceitas (`LEGAL_VERSIONS`). POST sem aceite é recusado. Isso cria evidência de consentimento/ciência no momento do contrato (BASE-01). Versões antigas não são sobrescritas no histórico do aceite registrado na conta.

### BASE-02 — Bases legais documentadas na política

✅ Cumprido. A seção de bases legais em `privacy.*.md` menciona execução de contrato (conta e armazenamento de imagens), consentimento no cadastro, obrigação legal e proteção de direitos de terceiros quando couber (segurança, denúncias). Alinha-se a LGPD art. 7 e GDPR art. 6 em nível de transparência ao titular. Residual: refinamento jurídico (TRANS-05).

### BASE-03 — Finalidades limitadas; sem marketing sem opt-in

✅ Cumprido. Finalidades declaradas: conta, imagens, autenticação/segurança e denúncias/obrigações legais. Não há newsletter, ads ou trackers de marketing no produto; cookies são classificados como essenciais (MIN-02). SECP-06 no relatório reforça finalidade explícita e ausência de marketing sem opt-in. Novas finalidades exigem atualização da política e, se necessário, novo aceite.

### RIGHT-01 — Acesso e portabilidade

✅ Cumprido. `GET /api/v1/users/me/export` (e botão no perfil) devolve JSON da conta: perfil, settings, imagens/metadados e dados de sessão relevantes, conforme `exportUserData.usecase.ts` (RIGHT-01). Residual de produto: sem ZIP de binários nem URLs assinadas embutidas no export — a portabilidade cobre o pacote de dados estruturados da conta. Cruzamento com confidencialidade de objetos: `SECURITY-ASSESSMENT.md` / STOR-01 (leitura via URL assinada na app).

### RIGHT-02 — Eliminação / exclusão de conta

✅ Cumprido. `DELETE /api/v1/users/me` com senha dispara exclusão **imediata** no online: `DeleteObject` no Spaces, soft-delete de imagens, anonimização de PII, revogação de sessões (`sessionsRevokedAt`). Documentado em `docs/operators/account-deletion.md` (RIGHT-02 / MIN-05). Backups offsite seguem ciclo próprio e não bloqueiam o direito no sistema ativo. Ver também MIN-05.

### RIGHT-03 — Correção de dados

✅ Cumprido. Perfil permite corrigir nome, nickname, foto e senha. Troca de e-mail exige senha e verificação do endereço antigo e do novo (challenges `change_old` / `change_new`) — RIGHT-03. Isso fecha a lacuna de e-mail imutável e não verificado. Dados de nascimento do age gate não são expostos em `PublicUser`.

### RIGHT-04 — Confirmação de tratamento / transparência

✅ Cumprido. A política publica categorias tratadas e finalidades; o perfil e o export permitem ao titular ver o que a conta detém. CookieNotice e links legais reforçam transparência contínua (LGPD art. 18 I; GDPR arts. 12–15). Não há “caixa-preta” de marketing: o titular consegue mapear tratamento às finalidades declaradas.

### MIN-01 — Minimização técnica

✅ Cumprido. Cookie de device deixou de ser gravado no cliente; identificador de dispositivo para alerta de novo login é tratado no servidor. Settings passam por allowlist (`SETTINGS_KEYS` / `Settings.manager`). Endpoint `/examples` retorna 404 em production. `SessionEvent` guarda hash do `jti`, não o token em claro. Relacionado a MIN-01, AUTHZ-05, SESS-02, AUTHZ-06 no `SECURITY-REPORT.md` / `SECURITY-ASSESSMENT.md`.

### MIN-02 — Aviso de cookies essenciais

✅ Cumprido. `CookieNotice` informa cookies essenciais (sessão, tema, locale) sem CMP de marketing — não há trackers de anúncio. A política menciona a mesma classificação (MIN-02). Se no futuro houver cookies não essenciais, será necessário consentimento/CMP; hoje o controle adequado é aviso informativo.

### MIN-03 — Tema / locale como funcionais

✅ Cumprido. Preferências de tema e idioma são cookies/configurações de interface, documentadas na política como necessárias ao funcionamento (MIN-03). Não são usadas para publicidade comportamental. Persistência em settings na nuvem segue a allowlist (MIN-01).

### MIN-04 — Opt-out do mosaico global

✅ Cumprido. Setting `appearInGlobalMosaic` (default true) controla se imagens públicas entram no feed `scope=all` da home. Desligado, o titular reduz descoberta indireta por tags/títulos mantendo deep-link se a imagem for PUBLIC (MIN-04). UI em configurações gerais com copy i18n.

### MIN-05 — Anonimização na exclusão

✅ Cumprido. Além de soft-delete, a exclusão grava `email` → `deleted_{id}@invalid.local`, `nickname` → `deleted_{id}`, zera nome/foto/DOB/settings e substitui o hash de senha por sentinela (MIN-05 / RIGHT-02). Evita reuso de identificadores únicos e “exclusão” só cosmético. Objetos no Spaces são apagados com `DeleteObject`.

### RET-01 — Política de retenção documentada

✅ Cumprido. `docs/operators/retention.md` define prazos: conta ativa até exclusão; exclusão imediata no online; JWT/`SessionEvent`/`ActiveSession` até `exp`; orphans ~7 dias; logs alvo 90 dias; backups à parte. A política pública resume esses prazos em linguagem simples (RET-01). Decisão de produto: JWT 7 dias documentada como residual de segurança, não como gap de retenção legal não declarado.

### RET-02 — Job automatizado de purge

✅ Cumprido. `npm run cron -- retention-purge` (e CronJob K8s de exemplo em `deploy/cron/`) remove `SessionEvent`/`ActiveSession` com `exp` passado e faz purge de orphans no Spaces (`docs/operators/cron.md`). Sem schedule no host o código existe mas a execução depende de ops — o **controle de produto** (job + docs) está entregue; agendamento contínuo é responsabilidade operacional.

### RET-03 — Retenção automatizada de logs de host/agregador (90d)

❌ Não cumprido. O alvo de **90 dias** para logs de aplicação/host está na política e em `retention.md`, porém **não há worker no app** que rotacione ou purge logs do agregador/host. É processo do operador (checklist de ops). Até existir rotação/retenção automatizada no ambiente de produção, o item permanece aberto.

### XFER-01 — Transparência Spaces nyc3 / EUA

✅ Cumprido. A política e `docs/operators/transfers.md` declaram armazenamento de objetos no DigitalOcean Spaces região **nyc3** (Estados Unidos) e o fluxo browser → app → Mongo + Spaces. Titular é informado da transferência internacional (LGPD arts. 33–35; GDPR Cap. V). Alternativas `gru1`/`fra1` são follow-up opcional, não mitigações já aplicadas.

### XFER-02 — DPA DigitalOcean via ToS

✅ Cumprido. Registro operacional (2026-08-21): o DPA da DigitalOcean é incorporado aos [Terms of Service 2023](https://www.digitalocean.com/legal/terms-of-service-agreement-2023) e foi aceito na criação da conta do operador (XFER-02 / issue #82). Documentado em `transfers.md` e na política pública. SCCs do DPA cobrem cenários GDPR se houver titulares EEE/UK; público-alvo atual não é a UE.

### XFER-03 — Região de app host e Mongo de produção

❌ Não cumprido. Em `transfers.md` e no RoPA, **app host** e **MongoDB de produção** permanecem **TBD**. Compose local usa localhost com auth; produção ainda não tem região/país preenchidos no mapa operacional nem DPA do host/Mongo cloud marcado. Bloqueia transparência completa da cadeia de transferência além do Spaces.

### SECP-01 — Confidencialidade de imagens + DPIA curta

✅ Cumprido. Medidas técnicas: bucket privado, upload sem `public-read`, leitura via URL assinada após `canViewImage`, keys com entropia + prefixo `ownerId` (STOR-01/C02; SECP-01). DPIA resumida em `docs/operators/dpia-images.md`. Cruzar com `SECURITY-ASSESSMENT.md` para o checklist absoluto de storage. Residual: revisão jurídica da DPIA (TRANS-05); risco residual se credenciais Spaces vazarem.

### SECP-02 — Playbook de incidente de dados

✅ Cumprido. `docs/operators/incident-response.md` define papéis (encarregado, ops, produto), fluxo detectar→conter→avaliar→comunicar (ANPD/titulares), registro mínimo e template de notificação (SECP-03; LGPD art. 48). Complementa `security.txt`. Não substitui assessoria legal em incidente real.

### SECP-03 — Encarregado nomeado

✅ Cumprido. Encarregado: **Caio Felipe Giasson**, e-mail **cainitech@gmail.com**, publicado na política (pt/en/es), RoPA, playbook e `src/constants/legal.ts` (`PRIVACY_OFFICER_NAME` / `PRIVACY_CONTACT_EMAIL`). Cumpre o ponto de contato de responsabilização (SECP-03). Residual jurídico: registro ANPD se/quando o porte exigir.

### SECP-04 — RoPA / suboperadores

✅ Cumprido. `docs/operators/subprocessors-ropa.md` registra controlador, finalidades, categorias, suboperadores (Spaces nyc3 com DPA; Mongo e hosting TBD; e-mail futuro; next/font self-host; Pinterest só CLI do operador). Atende esboço de registro de operações (LGPD art. 37; GDPR art. 30) e cadeia art. 39 / art. 28. Atualizar quando host/Mongo/e-mail de produção forem definidos (ligado a XFER-03).

### SECP-05 — Canal de denúncia UGC / CSAM

✅ Cumprido. Usuários autenticados denunciam via `POST /api/v1/images/:id/report` e UI no detalhe da imagem; registro `Report` com motivos incluindo `csam`. Termos cobrem UGC/CSAM. Processo humano documentado em `docs/operators/csam.md` (CHILD-01). Sem notificação automática a NCMEC/PhotoDNA — ver CHILD-03.

### SECP-06 — Prova de posse de e-mail

✅ Cumprido. Fluxo de verificação com challenges (`emailVerifiedAt`), troca de e-mail verificada nos dois endereços, e reset de senha condicionado a e-mail verificado (SECP-06 / AUTH-04 / AUTH-07 no relatório). Reduz cadastro de e-mail alheio e uso do app como vetor de phishing. Residual de produto: login possível antes da verificação completa, conforme relatório.

### SECP-07 — Minimização de PII em logs e scripts admin

✅ Cumprido. `Log.manager` com redação; scripts admin recusados em production; `list-users` mascara e-mail; denúncias não logam `details` nem DOB (SECP-07 / OPS-03 / OPS-04). Alinha minimização e segurança da informação (LGPD art. 46; GDPR art. 32). Ver `SECURITY-ASSESSMENT.md` para controles de logging correlatos.

### CHILD-01 — Age gate 18+ (UTC date-only)

✅ Cumprido. Cadastro exige `birthDate` (`YYYY-MM-DD`); idade calculada em UTC date-only; no dia civil UTC dos 18 anos o cadastro é permitido. Persistidos `dateOfBirth` e `ageVerifiedAt`, sem exposição em payloads públicos (`docs/operators/age-policy.md`; CHILD-01).

### CHILD-02 — Bloqueio de menores sem fluxo de responsável

✅ Cumprido. Idade &lt; 18 → cadastro recusado (HTTP 400). **Não** há fluxo de consentimento parental nesta versão — decisão de produto documentada: fluxo parental incompleto seria pior que o bloqueio explícito (LGPD art. 14; GDPR art. 8).

### CHILD-03 — Moderação automatizada PhotoDNA / NCMEC

❌ Não cumprido. Não há hash perceptual, PhotoDNA, nem notificação automática a NCMEC/SaferNet/autoridades. O canal e a fila humana existem (SECP-05); processos legais de preservação e reporte são obrigação operacional fora do código (`csam.md`). Item permanece aberto até haver integração ou processo automatizado formal.

### PREC-01 — Nickname canônico

✅ Cumprido. Canonicalização NFC + lowercase, charset Latin, rejeição de controles/NFKC-divergente/homógrafos de outros scripts; register/update/check alinhados; script de backfill (`docs/operators/nickname-canonicalization.md`; AUTH-11 / PREC-01). Reduz impersonação por confusão visual. Residual: sem UTS #39 completo; denúncia de impersonação via SECP-05.

---

## Relação com o relatório

Os códigos deste arquivo são a referência absoluta. O `SECURITY-REPORT.md` usa os **mesmos códigos** nas tabelas LGPD. Controles técnicos que sustentam privacidade (Argon2, cookie HttpOnly, bucket privado, rate limit, headers, etc.) estão em `SECURITY-ASSESSMENT.md`.

| Família  | Códigos principais                             | Docs / código                           |
| -------- | ---------------------------------------------- | --------------------------------------- |
| TRANS-\* | TRANS-01 … TRANS-05                            | `content/legal/*`; `/privacy`, `/terms` |
| BASE-\*  | BASE-01 … BASE-03                              | `RegisterForm`; `registerUser.usecase`  |
| RIGHT-\* | RIGHT-01 … RIGHT-04                            | export; `account-deletion.md`           |
| MIN-\*   | MIN-01 … MIN-05                                | CookieNotice; settings; mosaico         |
| RET-\*   | RET-01 … RET-03                                | `retention.md`; `cron.md`               |
| XFER-\*  | XFER-01 … XFER-03                              | `transfers.md`                          |
| SECP-\*  | SECP-01 … SECP-07                              | DPIA; incidente; RoPA; CSAM             |
| CHILD-\* | CHILD-01 … CHILD-03                            | `age-policy.md`; `csam.md`              |
| PREC-01  | PREC-01 (+ AUTH-11 no assessment de segurança) | nickname canonicalization               |
