# Porte tribalRPGBot → boilerplate-webapp — Backlog (fora da Etapa 1)

Snapshot: **2026-10-26**. Status: **refinamento preliminar** — nada foi implementado nem commitado.
Itens desta lista: **4, 6, 9, 10, 13, 17** da lista de candidatos.
Itens da etapa atual: [`porte-tribal-etapa-1.md`](porte-tribal-etapa-1.md) (as convenções gerais, a legenda de caminhos `BP:` / `T:web/` / `T:core/` e o DoD de lá valem aqui também).

Profundidade: menor que a da Etapa 1. Cada item traz objetivo, o que levar e o que deixar, arquivos, dependências, decisões e riscos, mas **vários trechos ainda precisam de leitura de código antes de virar issue** — esses pontos estão marcados com **[ler]**. Nada abaixo deve ser tratado como estimativa fechada.

---

## 1. Visão geral

| #   | Funcionalidade                                              | Esforço | Depende de (Etapa 1)                       | Prioridade sugerida        |
| --- | ----------------------------------------------------------- | ------- | ------------------------------------------ | -------------------------- |
| 4   | Níveis de usuário e cotas (+ página de storage e de planos) | G       | 5 (`role`), 11 (thumbnail na cota)         | Alta (base de monetização) |
| 6   | `UserRequest` — reportar bug / pedir feature                | M       | 5 (admin); 7 (aviso de resposta, opcional) | Média                      |
| 17  | Operação: deploy, restore e runbooks                        | P–M     | 7, 8 (docs que compartilham)               | Média (baixo risco)        |
| 13  | Páginas de produto (landing, about, changelog)              | M       | 8 (versão)                                 | Média                      |
| 9   | Offline-first genérico                                      | G       | 8                                          | Baixa (módulo opcional)    |
| 10  | Realtime por WebSocket                                      | G       | 7 (uso natural), decisão de runtime        | Baixa (módulo opcional)    |

P = até ~1 dia, M = 2–4 dias, G = 1 semana ou mais (ordem de grandeza).

Os itens **9 e 10 mudam o modo de rodar ou a complexidade do boilerplate**. Recomendação: entregar como **módulos opcionais** (ativados por flag/script de setup) ou manter só no tribal e documentar o padrão. Decidir isso antes de gastar esforço.

---

## 2. Achados que afetam este backlog

1. **O hub de realtime do tribal é em memória, por processo.** `T:web/src/realtime/gameRealtimeServer.ts` e `T:core/src/services/gameRealtimeHub.service.ts` indexam conexões por mesa dentro do processo. O boilerplate se preocupa com multi-instância (`npm run smoke:multi-instance`, `docs/operators/multi-instance-smoke.md`). Portar o hub como está **quebra a garantia** do boilerplate quando houver mais de uma instância (item 10).
2. **O boilerplate já tem `src/constants/report.ts`** (resquício de denúncia de conteúdo do projeto de origem: `REPORT_REASONS` com `spam`, `csam`, `nudes_nonconsensual`…). Não é o mesmo conceito de `UserRequest` (bug/feature). Antes do item 6, decidir se esse arquivo é lixo a remover ou base de um futuro fluxo de denúncia — **não misturar os dois**.
3. **O boilerplate não tem `.gitattributes`.** O tribal registrou em `tasks/lessons.md` o problema de CRLF em scripts no Windows. Para o item 17 (scripts `.sh`), um `.gitattributes` com `*.sh text eol=lf` é pré-requisito, senão o script quebra no Linux (`\r` no shebang). Isto é válido mesmo sem portar o item.
4. **Itens 4 e 5 compartilham o mesmo problema de schema.** Campo novo obrigatório em `User` quebra a leitura de documentos antigos no Mongo/Prisma. O tribal resolve com default + script de backfill (`user-level:backfill`). Tratar `level` igual ao `role` do item 5: opcional + backfill.
5. **Há um `ping` público no tribal** (`T:web/src/app/api/ping`) que o offline (item 9) usa como sonda de conectividade. O boilerplate só tem `/api/health*`, que é restrito a loopback/token (`healthAccess.ts`) e **não serve** como sonda de navegador.

---

## 3. Decisões em aberto (backlog)

| ID  | Decisão                                                                                           | Recomendação                                                                                                         | Afeta |
| --- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----- |
| B1  | Nomes e valores dos níveis (tribal: Aprendiz/Explorador/Aventureiro/Herói/Lenda; 100 MB → 200 GB) | Nomes neutros (ex.: `FREE`, `PLUS`, `PRO`, `MAX`) e cotas **configuráveis** no catálogo, não hard-coded              | 4     |
| B2  | Catálogo de cotas no banco (`userLevel`) ou só em constantes                                      | Catálogo no banco com **fallback em constantes** (como o tribal)                                                     | 4     |
| B3  | `ADMIN` como nível (tribal) ou `role` separado (Etapa 1, D1)                                      | Manter `role` separado; `level` só para plano                                                                        | 4, 5  |
| B4  | Gerenciador de arquivos do usuário (`/storage`: listar, apagar, substituir)                       | Incluir em sub-issue própria; é onde a cota "aparece" para o usuário                                                 | 4     |
| B5  | Reports aceitam anexo                                                                             | Não na 1ª versão (evita cota/moderação de upload)                                                                    | 6     |
| B6  | Aviso ao admin quando chega pedido novo (e-mail Brevo e/ou notificação)                           | E-mail opcional por env; notificação in-app depois do item 7                                                         | 6     |
| B7  | Offline e realtime como módulos opcionais                                                         | **Sim**, atrás de flag/documentação de ativação                                                                      | 9, 10 |
| B8  | Transporte em tempo real: WebSocket (`ws` + servidor customizado) ou SSE                          | **Avaliar SSE primeiro** — funciona com `next start`, sem servidor customizado; WS só se houver tráfego bidirecional | 10    |
| B9  | Hub multi-instância (Redis/pub-sub/change streams)                                                | Só se o boilerplate quiser garantir multi-instância com realtime; senão documentar "1 instância"                     | 10    |
| B10 | Landing: quão genérica                                                                            | Shell com seções configuráveis via constantes + i18n; **sem** demo animada nem ilustrações do produto                | 13    |
| B11 | Política de changelog/versão do tribal (`[Não lançado]`, PR de bump)                              | Adotar só se o time quiser; é processo, não código                                                                   | 13    |
| B12 | `deploy.sh` com PM2 como padrão do boilerplate                                                    | Template documentado, não script obrigatório (o README já aceita systemd/PM2)                                        | 17    |
| B13 | Backup agendado do Mongo (o tribal tem **restore**, não verifiquei um backup agendado)            | Criar `backup-mongodb.sh` + cron manifest, se o time quiser                                                          | 17    |

---

## 4. Refinamento por item

### Item 4 — Níveis de usuário e cotas

**Objetivo:** substituir a cota fixa (`USER_STORAGE_QUOTA_BYTES = 1 GB` em `BP:src/constants/storageQuota.ts`) por planos com cota por nível, base para monetização futura. **Sem cobrança nem checkout** — o tribal também não tem (a troca de nível é feita pelo operador via script).

**Origem:**

- Schema: `T:core/prisma/models/userLevel.prisma` (enum `UserLevelName` + model `userLevel` catálogo, `storage` em MB) e `User.level` (default `FREE`, `@@index([level])`).
- Constantes: `T:core/src/domains/storage/userLevel.constants.ts` (`USER_LEVEL_STORAGE_MB`, `USER_LEVEL_RANK`, `USER_LEVEL_NAMES`, `storageMbToBytes`, `isUserLevelName`, `compareUserLevels`), `quotaCategories.ts`, `storage.constants.ts`.
- Serviço: `T:core/src/services/storage/storageQuota.service.ts` (111 linhas), `T:core/src/repositories/userLevel.repository.ts`.
- Seed do catálogo: `T:core/prisma/seed.ts`.
- Scripts: `T:web/scripts/change-user-level.mjs` (74), `backfill-user-level-explorer.mjs` (68).
- UI: `T:web/src/components/plans/PlanPageClient.tsx` (220), `T:web/src/components/storage/StoragePageClient.tsx` (491), `T:web/src/design-system/StorageProgressBar.tsx` (já na Etapa 1, item 14).
- Use cases do gerenciador: `listUserStorageFiles`, `deleteUserStorageFile`, `getUserStorageFileContent`, `replaceUserStorageFile`, `getUserStorageStats` (em `T:web/src/useCases/`).

**Regras do tribal que valem aqui:**

- `ADMIN` repete a cota do maior plano e não aparece na página de planos (no boilerplate isso desaparece, B3).
- Nível ausente no usuário conta como o menor plano.
- Linha ausente no catálogo → usa as constantes de fallback.
- Cota: só contam certas categorias de arquivo (`quotaCategories.ts`); o que o sistema gera (ex.: saída de IA) **não** conta. No boilerplate, mapear para `File.category` (`avatar`, `image`) e definir o que conta.
- Barra: < 60 % verde, ≥ 60 % âmbar, > 90 % vermelho.
- Tamanho máximo de mensagem por plano (`messageMaxSize`) é do chat — **não portar**.

**Arquivos (boilerplate):**

| Tipo    | Caminho                                                                                                                    | Nota                                                                                      |
| ------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Novo    | `BP:prisma/models/userLevel.prisma`                                                                                        | enum com nomes neutros (B1) + catálogo                                                    |
| Alterar | `BP:prisma/models/user.prisma`                                                                                             | `level UserLevelName?` (opcional + backfill; achado 4)                                    |
| Novo    | `BP:src/constants/userLevel.ts`                                                                                            | substitui/engloba `storageQuota.ts`                                                       |
| Novo    | `BP:src/repositories/UserLevel.repository.ts`                                                                              |                                                                                           |
| Novo    | `BP:src/services/Storage/StorageQuota.service.ts`                                                                          | `getQuotaBytes(userId)`, `getUsedBytes`, `assertCanStore(userId, bytes)`; usado no upload |
| Alterar | `BP:src/services/Storage/File.manager.ts`, `BP:src/useCases/uploadUserPhoto.usecase.ts`                                    | checar cota **antes** do upload (fora da TX; ADR 007)                                     |
| Alterar | `BP:src/useCases/getUserStorageStats.usecase.ts`                                                                           | cota por nível                                                                            |
| Novo    | `BP:src/useCases/{listUserStorageFiles,deleteUserStorageFile,getUserStorageFileContent,replaceUserStorageFile}.usecase.ts` | B4                                                                                        |
| Novo    | `BP:src/app/api/v1/users/me/storage/*`, `BP:src/controllers/User/routes/*`                                                 | confrontar com as rotas atuais (`getStorageStats`) **[ler]**                              |
| Novo    | `BP:src/app/[locale]/storage/page.tsx`, `BP:src/components/storage/StoragePageClient.tsx`                                  | descartar o que for de ficha/mapa/sticker                                                 |
| Novo    | `BP:src/app/[locale]/plan/page.tsx`, `BP:src/components/plans/PlanPageClient.tsx`                                          | cards de plano; **sem botão de compra**                                                   |
| Novo    | `BP:scripts/change-user-level.mjs`, `BP:scripts/backfill-user-level.mjs`                                                   | `--confirm` em produção                                                                   |
| Novo    | `BP:prisma/seed.ts` ou script `scripts/seed-user-levels.mjs`                                                               | o boilerplate não tem seed hoje                                                           |
| Alterar | `BP:src/repositories/User.dto.ts`, `BP:docs/dto-checklist.md`, `openapi.yaml`, `requests/`                                 | `level` no DTO                                                                            |
| Alterar | `BP:src/constants/texts/*`                                                                                                 | nomes e descrições dos planos                                                             |
| Novo    | `BP:docs/operators/user-levels.md`                                                                                         | como trocar nível, ajustar catálogo                                                       |
| Novo    | `BP:docs/adr/`                                                                                                             | ADR "níveis e cotas"                                                                      |

**Riscos:**

- Cota é checada em **um** ponto (upload); qualquer rota nova de upload que esqueça de chamar `assertCanStore` fura o limite — centralizar no `FileManager`.
- Corrida entre dois uploads simultâneos pode ultrapassar a cota (leitura de uso e gravação não são atômicas). Aceitável com tolerância, mas documentar.
- Mudar a cota fixa de 1 GB para um catálogo muda o comportamento de contas existentes — o backfill precisa mapear todos os existentes para um nível cuja cota seja **≥ 1 GB**, senão usuários passam a "estourar".
- Mudança de nível para menor com uso acima da cota: definir que **não** apaga nada, só bloqueia novos uploads.

**Critérios de aceite:** nível por usuário; upload acima da cota recusado com erro tipado; página `/storage` mostra uso, lista e permite apagar; `change-user-level` troca o plano; contas antigas não perdem acesso.

**Sugestão de quebra:** (1) schema + catálogo + constantes + backfill + script; (2) `StorageQuota.service` aplicado ao upload; (3) página `/storage`; (4) página `/plan`.

---

### Item 6 — `UserRequest`: reportar bug e pedir feature

**Origem:** `T:core/prisma/models/userRequest.prisma` (enum `UserRequestCategory { BUG FEATURE }`, tipo embutido `UserRequestAnswer { senderId, text, answeredAt }`, índice `[userId, createdAt]`, coleção `UserRequests`); `T:web/src/repositories/UserRequest.repository.ts` (131); use cases `createUserRequest`, `listUserRequests`, `answerUserRequest`, `listAdminUserRequests`; rotas `T:web/src/app/api/v1/users/me/requests`, `…/user-requests/[id]`, `…/admin/user-requests`; UI `T:web/src/components/tribal/ReportErrorsPageClient.tsx` (318) e a seção de pedidos no `AdminPageClient`; página `T:web/src/app/[locale]/report-errors`.

**Fluxo (a confirmar na leitura dos use cases):** usuário autenticado cria pedido (categoria + título + detalhes); lista os próprios; admin lista todos e responde (`answer` único). **[ler]** validações de tamanho, rate limit, e se a resposta gera notificação (no tribal `answerUserRequest.usecase.ts` pode chamar `CreateNotification` — conferir).

**Arquivos (boilerplate):**

| Tipo     | Caminho                                                                                                   | Nota                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Novo     | `BP:prisma/models/userRequest.prisma`                                                                     | `userId @db.ObjectId`; **conferir se `details` é dado pessoal** (é: texto livre)            |
| Novo     | `BP:src/repositories/UserRequest.repository.ts`                                                           |                                                                                             |
| Novo     | `BP:src/useCases/{createUserRequest,listUserRequests,answerUserRequest,listAdminUserRequests}.usecase.ts` | validação com Zod (schema em `BP:src/schemas/`), limites de tamanho, rate limit por usuário |
| Novo     | `BP:src/controllers/UserRequest/*`, rotas em `BP:src/app/api/v1/…`                                        | `admin/*` exige `role === 'ADMIN'` (item 5)                                                 |
| Novo     | `BP:src/app/[locale]/report-errors/page.tsx` (ou `support`), `BP:src/components/support/*`                |                                                                                             |
| Alterar  | `BP:src/components/admin/AdminPageClient.tsx`                                                             | seção "Pedidos"                                                                             |
| Alterar  | `BP:src/lib/errors/appErrorCopy.ts`, `BP:public/error.html`                                               | o texto de erro da Etapa 1 deixa de ter de omitir o menu de reporte                         |
| Alterar  | `exportUserData`, purge, `docs/operators/retention.md`                                                    | pedidos do usuário                                                                          |
| Alterar  | `BP:docs/openapi.yaml`, `requests/`, `texts/*`                                                            |                                                                                             |
| Decisão  | `BP:src/constants/report.ts`                                                                              | achado 2 — não confundir; remover se for resquício                                          |
| Opcional | e-mail ao admin (Brevo) / notificação ao autor (item 7)                                                   | B6                                                                                          |

**Riscos:** spam/abuso (rate limit e tamanho); texto livre com dado pessoal ou até conteúdo ilícito → moderação mínima (campo `status`/fechamento? o tribal só tem `answer`); retenção sem política = acúmulo indefinido.

**Critérios de aceite:** usuário cria e vê os próprios pedidos; admin vê todos e responde; não admin não acessa rotas admin; exportação e exclusão de conta cobrem os pedidos; limite de criação por janela.

---

### Item 17 — Operação: deploy, restore e runbooks

**Origem:** `tribalRPGBot/deploy.sh` (46), `restore-mongodb.sh` (170), `migrate.sh` (208), `bot-deploy.sh` (46, **ignorar**), `scripts/deploy-npm-ci.sh`; docs `T:web/docs/operators/{restore-mongodb,migrate-mongo-atlas-to-local,pwa,game-realtime,send-push,web-push-vapid}.md`; manifesto de cron `T:web/deploy/cron/cronjob-retention-purge.yaml` (o boilerplate já tem equivalente em `BP:deploy/cron/`).

**O que levar:**

| Peça                                                                                  | Decisão                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deploy.sh`                                                                           | **Template** (B12). Valioso pelo padrão: todo o corpo dentro de `main()` e `main "$@"; exit $?` na mesma linha, porque o `git pull` pode reescrever o próprio script durante a execução (comentário do tribal explica). Passos: stash → pull → `npm ci` → build → `pm2 restart` → `pm2 status`. Trocar nomes `tribal-web` por variável (`PM2_APP`) |
| `restore-mongodb.sh`                                                                  | **Portar generalizado**: `mongodump` de `DATABASE_URL_OLD` e `mongorestore --drop` em `DATABASE_URL`, exige `--confirm`, não edita `.env`, **nunca apaga o dump** em `backups/`, reinicia o processo. Remover o `PM2_BOT`. Imagem `mongo:7.0` fixada. **[ler]** o script inteiro antes: ele é destrutivo (`--drop`)                                |
| `migrate.sh`                                                                          | **Não portar** — migração pontual Atlas → local                                                                                                                                                                                                                                                                                                    |
| Docs `restore-mongodb.md`                                                             | portar, generalizado; `migrate-mongo-atlas-to-local.md` **não**                                                                                                                                                                                                                                                                                    |
| Docs `pwa.md`, `web-push-vapid.md`, `send-push.md`                                    | já estão na Etapa 1 (itens 8 e 7)                                                                                                                                                                                                                                                                                                                  |
| Docs `game-realtime.md`                                                               | só se o item 10 for feito, renomeado para `realtime.md`                                                                                                                                                                                                                                                                                            |
| Backfills do tribal (`push-settings`, `map-defaults`, `messages:backfill-deleted-at`) | **não portar** (domínio), mas manter o **padrão** (idempotente, `--dry-run`/`--confirm`) documentado em `BP:scripts/README.md`                                                                                                                                                                                                                     |

**Arquivos (boilerplate):**

| Tipo     | Caminho                                                                        |
| -------- | ------------------------------------------------------------------------------ |
| Novo     | `BP:.gitattributes` — `*.sh text eol=lf` (achado 3) e, opcional, `* text=auto` |
| Novo     | `BP:deploy/deploy.sh` (ou raiz), `BP:deploy/restore-mongodb.sh`                |
| Novo     | `BP:docs/operators/restore-mongodb.md`, `BP:docs/operators/deploy.md`          |
| Alterar  | `BP:README.md` — seção "Deploy" aponta para o template                         |
| Alterar  | `BP:scripts/README.md` — padrão de scripts de operador                         |
| Opcional | `BP:deploy/backup-mongodb.sh` + cron manifest (B13)                            |

**Riscos:** scripts destrutivos exigem `--confirm`, mensagem clara do alvo (host/db **sem credenciais** no log) e a regra do `AGENTS.md` de operações irreversíveis; `.sh` no Windows (CRLF); assumir PM2 quando o usuário usa systemd/Docker.

**Critérios de aceite:** `restore-mongodb.sh` sem `--confirm` só mostra a ajuda; com `--confirm` restaura em ambiente de teste e mantém o dump; `.gitattributes` evita CRLF; runbook testado por alguém que não escreveu.

---

### Item 13 — Páginas de produto (landing, about, changelog)

**Origem (`T:web/`):** `src/components/landing/{LandingPage,LandingAuthLinks,BrandSymbols,landingFonts,Landing.module.css}` e as peças de demo (`LandingDemo*`, `GimasMap`, `LandingAiExamples`); `src/app/[locale]/{about,changelog,instructions}`; `src/components/tribal/{AboutPageClient,ChangelogPageClient}.tsx`; `src/lib/tribal/changelogGroups.ts`; `src/constants/tribal/changelog-entries.ts`; `src/components/layout/{GlobalLoading,PageTitleContext,EyeLoader}.tsx`; política em `.cursor/rules/{changelog,version-bump}.mdc` e `CHANGELOG.md`.

**Estado do boilerplate:** `BP:src/app/[locale]/page.tsx` renderiza `BP:src/components/home/HomePageClient.tsx` (62 linhas, "Hello World").

**O que levar e o que deixar:**

| Peça                                                                             | Decisão                                                                                                            |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `LandingPage` + `LandingAuthLinks`                                               | **Portar a estrutura** (hero, seções, links de login/cadastro conforme sessão); conteúdo via i18n genérico (B10)   |
| `LandingDemo*`, `GimasMap`, `LandingAiExamples`, `BrandSymbols`, fontes de marca | **Não** (marca e produto do tribal)                                                                                |
| `/about`                                                                         | Template simples (o que é, versão, links legais)                                                                   |
| `/changelog` + `changelogGroups` + `changelog-entries.ts`                        | **Portar a mecânica** (entradas versionadas, agrupamento); **B11** para o processo de `[Não lançado]` e PR de bump |
| `/instructions/discord`                                                          | **Não**                                                                                                            |
| `GlobalLoading`, `PageTitleContext`                                              | **Portar** (genéricos; teste existe em `T:web/tests/components/layout/GlobalLoading.test.tsx`)                     |
| `EyeLoader`                                                                      | **Não** (marca)                                                                                                    |
| `useShortcutBookmarks`                                                           | **Não** (jogos)                                                                                                    |

**Arquivos (boilerplate):**

| Tipo     | Caminho                                                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alterar  | `BP:src/app/[locale]/page.tsx`, `BP:src/components/home/*` → landing                                                                               |
| Novo     | `BP:src/components/landing/*`, `BP:src/app/[locale]/about/page.tsx`, `…/changelog/page.tsx`, `BP:src/components/changelog/ChangelogPageClient.tsx` |
| Novo     | `BP:src/constants/changelog-entries.ts`, `BP:src/lib/changelogGroups.ts`                                                                           |
| Novo     | `BP:src/components/layout/GlobalLoading.tsx`, `PageTitleContext.tsx`                                                                               |
| Alterar  | `BP:src/constants/texts/*` (3 idiomas), `BP:src/constants/navigation.ts`, `BP:src/lib/build-document-metadata.ts` (SEO)                            |
| Opcional | `BP:CHANGELOG.md`, `BP:.cursor/rules/changelog.mdc`, `version-bump.mdc` (B11)                                                                      |
| Testes   | `BP:tests/components/layout/GlobalLoading.test.tsx`                                                                                                |

**Ligação com a Etapa 1:** o `/changelog` lê `APP_VERSION` (mesma constante do item 8); a regra "a versão só sobe na PR de bump" evita recarregar todos os clientes a cada merge.

**Riscos:** a landing do tribal depende de CSS Modules e fontes próprias (`landingFonts.ts`) — avaliar peso; texto de marketing em 3 idiomas dá trabalho de manutenção; SEO/OG exigem imagens que o boilerplate não tem.

**Critérios de aceite:** `/` mostra landing com CTA conforme sessão; `/changelog` lista entradas do arquivo de constantes; páginas nos 3 idiomas; sem referência ao produto do tribal.

---

### Item 9 — Offline-first genérico (módulo opcional)

**Origem (`T:web/src/`):** `lib/offline/*` (ver tabela), `components/offline/*`, `app/api/ping`, `lib/pwa/*`; documentação no `CONTEXT-ARCHITECTURE.md` do tribal, seção "Offline, PWA e fila".

**Mecanismos genéricos do tribal (a preservar):**

- **Conectividade por sonda, não por eventos do navegador:** `GET /api/ping` (sem auth, sem cache, sem banco), timeout 1 s; histerese de 2 probes falhos para ficar offline e 1 sucesso para voltar; `navigator.onLine === false` vale offline imediato; heartbeat de 10 s **só** enquanto offline; falha de fetch reportada por `networkFailureReporter` também dispara sonda.
- **IndexedDB por usuário** (`<app>-offline-<userId>`), stores com `keyPath: 'id'`, `DB_VERSION` controlado.
- **Snapshots de telas** (`screenSnapshots.ts`): leitura offline de listas já carregadas, teto de itens por store.
- **Outbox com idempotência**: `clientMessageId` (UUID gerado no enfileiramento, nunca regenerado); flush FIFO; erro retryable (rede, 5xx, 401/408/429) mantém e interrompe; 4xx não retryable marca `failed` e segue; o servidor deduplica por `[senderId, clientMessageId]`.
- **Lock entre abas** (`crossTabLock.ts`): `navigator.locks` com lease.
- **UI:** `OfflineIndicator`, `OnlineOnlyOverlay` (bloqueia telas que exigem rede), `OfflineSnapshotNotice`, `OfflineFavicon`.

| Peça do tribal                                                                                                                                                                                | Decisão                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `connectivityState.ts` (40), `pingService.ts` (16), `networkFailureReporter.ts` (34), `ConnectivityProvider.tsx` (167), `OfflineIndicator`, `OnlineOnlyOverlay` (74), `OfflineSnapshotNotice` | **Portar**                                                           |
| `offlineDb.ts` (120), `screenSnapshots.ts` (63), `crossTabLock.ts` (71), `runWithConcurrency.ts`                                                                                              | **Portar**, stores reduzidas                                         |
| `chatOutbox.logic.ts` (48), `chatOutbox.ts` (52), `syncChatOutbox.ts` (120), `ChatOutboxSyncHost`                                                                                             | **Generalizar** em `outbox` por tipo de operação — não portar o chat |
| `sheet*`, `createSheetOffline`, `persistSheetsFromNetwork`, `gamesSnapshot`, `gameCoverCache`, `SheetOfflineSyncHost`, `OfflineFavicon` com assets de marca                                   | **Não**                                                              |
| `PwaCacheWarmHost`                                                                                                                                                                            | opcional                                                             |

**Arquivos (boilerplate):** `BP:src/lib/offline/*`, `BP:src/components/offline/*`, `BP:src/app/api/ping/route.ts` (público, sem DB, `Cache-Control: no-store`, **fora** do rate limit pesado), provider montado em `AppShell`, textos nos 3 idiomas, `BP:docs/operators/offline.md`, `BP:docs/adr/` (ADR "conectividade por sonda"), `BP:src/utils/idempotency.ts` (já existe `withIdempotencyKey` — **reutilizar** no lado servidor em vez de criar índice único por modelo) **[ler]** como o util funciona.

**Pré-requisitos:** item 8 (SW) e algum fluxo de escrita real no boilerplate para justificar a outbox (hoje as mutações são perfil/configuração; offline para elas é opcional).

**Riscos e decisões:**

- **Privacidade:** o tribal **não limpa** a outbox no logout porque pode ter dado pendente; em dispositivo compartilhado isso expõe conteúdo do usuário anterior. Decidir política (avisar antes de sair, ou limpar com confirmação).
- Complexidade sem ganho se o app é majoritariamente "online-only": **o boilerplate não deve impor** (B7).
- Resolução de conflito: o tribal tem regras específicas de ficha (`cloud-newer` etc.) — no genérico, definir "último vence" ou conflito explícito.

**Critérios de aceite:** derrubar a rede mostra o indicador em ≤ 3 s e volta ao reconectar; telas com snapshot abrem offline; uma operação enfileirada offline é enviada uma única vez ao voltar (teste com reenvio forçado); tudo atrás de flag/módulo.

---

### Item 10 — Realtime por WebSocket (módulo opcional)

**Origem:** `T:web/server.ts` (30 linhas, servidor HTTP customizado que anexa o WebSocket), `T:web/src/realtime/{authenticateUpgrade,gameRealtimeServer,realtimeFrames,realtimeOrigin}.ts` (43 + 368 + 37 + 13), `T:web/scripts/emit-server.mjs` e `emit-instrumentation-node.mjs` (esbuild gera `dist-server`), `T:core/src/services/gameRealtimeHub.service.ts`, `T:core/src/domains/realtime/*` e `T:core/src/realtime.ts`, cliente `gameRealtimeClient.ts`; docs `T:web/docs/operators/game-realtime.md`.

**Comportamento (tribal):** caminho `/api/v1/realtime`; protocolo versionado (frame `hello`); ping a cada 20 s; reconexão a cada 5 s ± 500 ms, suspensa offline ou com aba oculta; polling HTTP de fallback só quando o socket caiu e o app está online; após reconectar: flush da fila e só então catch-up; autenticação do upgrade reutiliza o JWT do cookie (`authenticateUpgrade`) e verifica origem (`realtimeOrigin`); eventos filtrados por visibilidade.

**Consequências arquiteturais (obrigatório decidir antes):**

| Mudança                                                        | Impacto no boilerplate                                                                                                                                      |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Servidor Node customizado (`server.ts`) em vez de `next start` | script `start` muda (`node scripts/next-port.mjs start` → `dist-server`); build ganha etapa esbuild; **não roda** em hospedagem que impõe o runtime do Next |
| Dependências: `ws`, `esbuild`, `tsx`                           | superfície de manutenção maior                                                                                                                              |
| Hub em memória por processo (achado 1)                         | **quebra** a premissa multi-instância do boilerplate; exige pub/sub externo (B9) ou ficar limitado a 1 instância                                            |
| `instrumentation-node`                                         | já há `BP:src/instrumentation.ts` — conferir conflito                                                                                                       |
| CSP `connect-src`                                              | liberar `wss:` para a origem                                                                                                                                |
| Proxy reverso                                                  | precisa repassar `Upgrade`/`Connection` (nginx/Caddy)                                                                                                       |

**Alternativa recomendada (B8): SSE.** Para o caso de uso do boilerplate (avisar a aba aberta de nova notificação, item 7, e atualizar contadores), Server-Sent Events via route handler do Next funciona com `next start`, sem servidor customizado e sem `ws`. WebSocket só se surgir tráfego cliente→servidor em tempo real. **Se escolhido SSE, quase nada do `gameRealtimeServer.ts` é reaproveitável**, apenas o desenho (frames versionados, hub por tópico, reconexão com jitter, fallback para polling).

**Arquivos (versão WebSocket, se confirmada):**

| Tipo    | Caminho                                                                                                                                                    |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novo    | `BP:server.ts`, `BP:src/realtime/{authenticateUpgrade,realtimeHub,realtimeFrames,realtimeOrigin}.ts` (hub **genérico por tópico**, p. ex. `user:<id>`)     |
| Novo    | `BP:scripts/emit-server.mjs`; alterar `BP:package.json` (`build`, `start`, `dev`)                                                                          |
| Novo    | `BP:src/lib/realtime/realtimeClient.ts` + provider React                                                                                                   |
| Alterar | `BP:src/config/securityHeaders.ts` (`connect-src`), `BP:docs/openapi.yaml` (documentar o upgrade), instruções de deploy (o boilerplate não tem Dockerfile) |
| Novo    | `BP:docs/operators/realtime.md`, ADR "transporte em tempo real"                                                                                            |
| Novo    | `BP:tests/realtime/{authenticateUpgrade,realtimeFrames}.test.ts` (origem em `T:web/tests/realtime`)                                                        |

**Primeiro consumidor sugerido:** evento `notification.created` (item 7) para atualizar o sino sem polling.

**Riscos:** vazamento entre usuários se o filtro de tópico falhar (teste obrigatório); conexões presas atrás de proxy sem `Upgrade`; limite de conexões por processo; reconexão em tempestade após deploy (jitter já previsto).

**Critérios de aceite:** (WS) cliente autenticado conecta, recebe somente eventos do próprio tópico, reconecta com jitter, cai para polling se o socket falhar; (SSE) idem sem servidor customizado. Em ambos: documentado o limite de instâncias.

---

## 5. Ordem sugerida do backlog

1. **17** (barato; `.gitattributes` serve a todo o resto) e **13** (visibilidade do produto).
2. **4** depois que **5** e **11** estiverem prontos (reaproveita `role`, thumbnail e cota).
3. **6** depois do **5**; ganha valor quando o **7** existir (aviso de resposta).
4. **9** e **10** apenas se houver caso de uso real; começar por **B8 (SSE)**.

Conflitos de arquivo com a Etapa 1: `BP:package.json`, `BP:src/constants/texts/*`, `BP:docs/openapi.yaml`, `BP:AppShell.tsx`/`Sidebar.tsx`/`navigation.ts`, `BP:prisma/models/user.prisma` (itens 4 e 5 — fazer em PRs sequenciais) e `retention-purge` (itens 4 e 6).

---

## 6. Próximo passo sugerido

Responder **B1–B3** (bloqueiam o item 4) e **B8** (define se o item 10 existe). Os demais podem esperar a Etapa 1 terminar.
