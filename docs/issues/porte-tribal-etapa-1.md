# Porte tribalRPGBot → boilerplate-webapp — Etapa 1 (refinamento)

Snapshot: **2026-10-26**. Status: **refinamento apenas** — nada foi implementado nem commitado.
Escopo da etapa: itens **1, 2, 3, 5, 7, 8, 11, 12, 14, 15, 16, 18, 19, 20** da lista de candidatos.
Itens fora da etapa: [`porte-tribal-backlog.md`](porte-tribal-backlog.md).

Legenda de caminhos usada neste documento:

| Prefixo   | Significa                                       |
| --------- | ----------------------------------------------- |
| `BP:`     | `boilerplate-webapp/` (destino)                 |
| `T:web/`  | `tribalRPGBot/apps/web/` (origem, app Next)     |
| `T:core/` | `tribalRPGBot/packages/core/` (origem, domínio) |

Estrutura: o tribal separa `core` (use cases, repositories, services) e `web` (Next). O boilerplate é um pacote único (`BP:src/`). **Todo código vindo de `T:core/` entra em `BP:src/` seguindo `app/api → controller → useCase → repository | service`** (ver `BP:docs/architecture.md`). Não existe portar "o core": cada peça é reescrita nas camadas do boilerplate.

---

## 1. Achados da leitura que mudam o escopo original

Estes pontos contradizem ou refinam o que a lista de candidatos afirmava. Leia antes dos itens.

1. **Item 15 (segurança) encolheu.** O boilerplate **já** tem proteção SSRF: `BP:src/services/Storage/RemoteFetch.service.ts` (lookup DNS, IP pinning via undici, redirect manual limitado) e `BP:src/utils/safeImageUrl.ts` (`isBlockedIp`, IPv4-mapped, 6to4, decimal/hex). `safeFetchHost` do tribal (`T:core/src/domains/game/safeFetchHost.ts`) só acrescenta: validação por `ipaddr.js` (`range() !== 'unicast'`, cobre faixas reservadas que a lista manual do boilerplate não cobre) e bloqueio de nomes `localhost`/`*.local`. "Dispositivos nas sessões" também já existe (`DEVICE_COOKIE_NAME`, `ActiveSession`, `SessionEvent`, `lastLoginDevice`). Restam: endurecer `isBlockedIp` e o script `change-user-password`.
2. **Item 16 (CI) pode ser desnecessário.** O motivo do `ci-install-linux-native.sh` no tribal é lockfile gerado no Windows sem binários Linux opcionais. O `BP:package-lock.json` **já lista** `@tailwindcss/oxide-linux-x64-gnu 4.3.3`, `lightningcss-linux-x64-gnu 1.32.0`, `@swc/core-linux-x64-gnu 1.15.47`, `@parcel/watcher-linux-x64-glibc 2.6.0` e `@img/sharp-linux-x64 0.34.5`. Portar **só se** o CI do boilerplate falhar depois de adicionar `sharp` e atualizar o Prisma. Os números de versão do script do tribal (sharp `0.33.5`) **não servem** para o boilerplate (`0.34.5`).
3. **Item 18 (testes): correção da lista anterior.** Eu disse que faltavam "testes de i18n (catálogos completos)". Os testes `T:web/tests/i18n/*` cobrem **detecção de locale por geolocalização**, não paridade de catálogos. O incidente de "string só em um catálogo" (`BP:tasks/lessons.md`) **não tem teste em nenhum dos repos**. O item passa a incluir um teste novo de paridade pt/en/es.
4. **Item 5 (admin) exige um papel que o boilerplate não tem.** No tribal, admin é `User.level === 'ADMIN'` e `level` é o eixo de planos/cotas (item 4 do backlog). O boilerplate não tem `level`. Decidido: `User.role` separado (D1).
5. **Item 7 depende do 8.** Os handlers `push` e `notificationclick` vivem no `sw.js` e o registro do SW é do item 8. Ordem real: **8 antes de 7**.
6. **Item 14:** `FormattedTextArea` (594 linhas) é acoplado a chat (reações, menções, checkbox, catálogo de emoji). `Drawer` pode duplicar o `BP:src/components/ui/sheet.tsx` existente. Ambos viram decisões (D5, D9).
7. **Itens 1, 2, 7 criam dado pessoal novo** (prompts/respostas de IA, endpoints de push, notificações). O boilerplate tem trilha LGPD (`exportUserData`, quarentena de 30 dias, `retention-purge`, `docs/operators/subprocessors-ropa.md`, `transfers.md`). Cada item precisa estender essa trilha; o tribal não resolve isso e não há o que portar.
8. **Item 11:** o boilerplate guarda arquivos com ACL privada e URLs assinadas (ADR 002 + `StorageUrl.service`). O `useSignedUrlRefresh` do tribal resolve exatamente URL assinada expirando na tela; confirmar o uso real no perfil antes de portar.

---

## 2. Visão geral

| #   | Funcionalidade                          | Esforço | Depende de            | Onda           |
| --- | --------------------------------------- | ------- | --------------------- | -------------- |
| 20  | Upgrade Prisma 6 + lucide 1.x           | M       | —                     | 0              |
| 18  | Infra e suíte de testes (jsdom, i18n)   | M       | 20 (para rodar tudo)  | 0 → contínuo   |
| 16  | CI: binários nativos Linux              | P       | 11, 20 (condicional)  | 0              |
| 3   | Feature flags                           | P       | 20                    | 1              |
| 2   | `aiLog` (auditoria de IA)               | P–M     | 20                    | 1              |
| 1   | AI Service com vendor plugável          | M       | 2, 3                  | 1              |
| 12  | Tratamento global de erro no front      | M       | —                     | 1              |
| 14  | Componentes do design system            | M       | 11 (ImageCropModal)   | 1–2            |
| 15  | Segurança extra (IP + script de senha)  | P       | —                     | 1              |
| 5   | Papel ADMIN + `/admin` + impersonamento | G       | D1 ✔ decidido        | 2              |
| 11  | Pipeline de imagem (`sharp`, thumbnail) | M–G     | 20                    | 2              |
| 8   | PWA + atualização forçada               | G       | 12                    | 3              |
| 7   | Notificações + Web Push                 | G       | 8, 5 (bloqueio)       | 3              |
| 19  | `CONTEXT*.md` e regra de manutenção     | M       | todos (fecha a etapa) | 4 (+ contínuo) |

P = até ~1 dia, M = 2–4 dias, G = 1 semana ou mais (estimativa de ordem de grandeza, sem leitura de código de destino além da amostra citada).

Ordem recomendada e racional:

- **Onda 0 — base:** 20 → 18 (infra jsdom) → 16 (só verificar). Atualizar o Prisma antes de criar models novos evita regerar migração de schema duas vezes.
- **Onda 1 — serviços independentes:** 3 → 2 → 1; em paralelo 12, 15 e os componentes simples de 14.
- **Onda 2 — conta e arquivos:** 5 e 11 (11 antes de `ImageCropModal` no 14).
- **Onda 3 — cliente instalável:** 8 → 7.
- **Onda 4 — documentação:** 19 fecha; mas **cada PR atualiza o `CONTEXT*.md` da área desde que o 19 existir** (criar o esqueleto do 19 cedo, na onda 0, é viável e recomendado — ver item 19).

Cada item é uma **issue + branch + PR própria** (regra do `BP:AGENTS.md`: "não há tarefas ad-hoc"). Itens G devem ser quebrados em sub-issues (sugestão em cada item).

---

## 3. Decisões em aberto (preciso da sua resposta antes de refinar a issue)

**Decididas em 2026-10-26: D1, D2, D3 e D4** (adotadas as recomendações). As demais seguem em aberto.

| ID  | Decisão                                                                        | Status / recomendação                                                                                                                                                                                                                                                                         | Afeta  |
| --- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| D1  | Papel admin: `User.role` (`USER`/`ADMIN`) ou reaproveitar `level` do tribal    | **✔ DECIDIDO: `role` separado.** Campo opcional no schema + backfill (`null` conta como `USER`); `level` fica para o item 4 do backlog                                                                                                                                                       | 5, 7   |
| D2  | Gravar `aiLog` dentro ou fora da transação do use case                         | **✔ DECIDIDO: fora.** Use cases que chamam IA são `transactional = false` e o `AIService` grava o log por um recorder próprio com `runWithoutTransaction` (ver itens 1 e 2)                                                                                                                  | 1, 2   |
| D3  | Modelos OpenAI padrão (`gpt-5.4`, `gpt-5.4-mini`, `gpt-image-1` no tribal)     | **✔ DECIDIDO: modelos configuráveis por env** com default **`gpt-5.4-mini`** para texto (`OPENAI_TEXT_MODEL`). Imagem opcional via `OPENAI_IMAGE_MODEL` (default `gpt-image-1`, herdado do tribal; sem uso no boilerplate enquanto não houver rota de imagem). Não há segundo modelo "small" | 1      |
| D4  | Expor rota HTTP de IA no boilerplate                                           | **✔ DECIDIDO: sem rota.** Serviço + use case de exemplo + testes; rota só depois, sob admin, rate limit e cota                                                                                                                                                                               | 1      |
| D5  | `FormattedTextArea` (chat)                                                     | **Não portar como está.** Portar no máximo uma toolbar markdown genérica depois                                                                                                                                                                                                               | 14     |
| D6  | Scripts `send-push*`: o tribal usa o `core` compilado                          | `.mjs` autocontido (Prisma + `web-push`) **ou** adicionar `tsx` como devDependency                                                                                                                                                                                                            | 7      |
| D7  | Cache de documentos HTML no service worker vs. logout                          | **Não cachear HTML autenticado** ou limpar caches no logout (`postMessage`)                                                                                                                                                                                                                   | 8      |
| D8  | Thumbnails de legado: o tribal usa endpoints admin + upload feito pelo browser | **Script de servidor com `sharp`** (`files:backfill-thumbnails`), sem endpoints admin                                                                                                                                                                                                         | 11     |
| D9  | `Drawer` do tribal vs `ui/sheet` do boilerplate                                | Comparar visual/API; **portar só se cobrir caso que `sheet` não cobre**                                                                                                                                                                                                                       | 14     |
| D10 | `WeeklyPushPrompt` e componentes de som                                        | **Opcionais.** Push semanal é produto, não infra; som depende de assets                                                                                                                                                                                                                       | 7, 14  |
| D11 | Admin pode impersonar outro admin                                              | **Bloquear** (não verifiquei o comportamento do tribal; é endurecimento)                                                                                                                                                                                                                      | 5      |
| D12 | Retenção de `aiLog` (dias)                                                     | Proposta: **90 dias**, configurável, no `retention-purge`                                                                                                                                                                                                                                     | 2      |
| D13 | Versão do `sharp`                                                              | **`^0.34.5`** (a do lockfile do boilerplate), não `0.33.5` do tribal                                                                                                                                                                                                                          | 11, 16 |
| D14 | `CONTEXT-ARCHITECTURE.md` vs `BP:docs/architecture.md`                         | Manter `docs/architecture.md` como fonte do diagrama; `CONTEXT-ARCHITECTURE.md` aponta para ele e cobre bibliotecas, rotas e infra                                                                                                                                                            | 19     |
| D15 | Política de senha duplicada em `change-user-password.mjs`                      | Duplicar como no tribal **com teste que compara** com `passwordPolicy.ts`, ou rodar via `tsx`                                                                                                                                                                                                 | 15     |

---

## 4. Regras que valem para todos os itens

Extraídas de `BP:AGENTS.md`, `BP:tasks/lessons.md` e das guidelines do time. Não repetidas por item.

1. **Camadas e DI:** controller fino → use case (`UseCaseMasterPort`) → repository (recebe `Prisma.TransactionClient`) → service. Nada de `new PrismaClient()` nem `DbCommander.getClient()` dentro de use case (lição "Root Prisma client fora da transação"). Registrar em `BP:src/container/dependencies.ts`.
2. **Transação:** use case de leitura ou que chama serviço externo sobrescreve `get transactional() { return false }` (lição "TX em todo use case"). Chamada externa nunca dentro de `$transaction` (ADR 007, `BP:src/utils/workUnitPhases.ts`).
3. **Contrato HTTP:** rota nova ou alterada atualiza `BP:docs/openapi.yaml` **e** `BP:requests/*.http` (+ `requests/README.md`). DTO público segue `BP:docs/dto-checklist.md`.
4. **i18n:** texto de UI vai nos **três** catálogos e nos tipos: `BP:src/constants/texts/{pt,en,es,types}.ts`. Código em inglês; docs/comentários/commits em pt-BR.
5. **Erros:** classes de `BP:src/errors` (`ValidationError`, `ForbiddenError`, …), nunca `Error` genérico (a `OpenAI.service` do tribal lança `Error` — reescrever).
6. **Env:** variável nova entra em `BP:src/config/env.ts` (getter + validação), `BP:.env.example`, tabela do `BP:README.md`, `BP:scripts/healthcheck.mjs` / `test-environment.mjs` quando fizer sentido e no `env:` do `BP:.github/workflows/ci.yml`.
7. **Testes por use case/serviço novo** (Jest, `BP:tests/...`), seguindo as factories de `BP:tests/factories`. Cobertura global do `jest.config.js` não pode cair (branches 25 / functions 35 / lines 40).
8. **LGPD:** dado pessoal novo → `exportUserData`, purge na exclusão definitiva (`BP:scripts/cron/jobs/retention-purge.mjs`), `BP:docs/operators/retention.md`, e, se houver fornecedor novo, `subprocessors-ropa.md` e `transfers.md`.
9. **Remover RPG:** nenhum nome de domínio do tribal (`tribal`, `Dungemall`, `game`, `sheet`, `tenant`, `Discord`, `MagIA`, `critão`…) pode vir junto. Prefixos de cache/chave (`tribal-*`) viram `app-*`.
10. **Lições do tribal que valem aqui** (`tribalRPGBot/tasks/lessons.md`): `{...props}` **antes** dos handlers nos componentes do DS; edição em lote por script no Windows gera CRLF (abrir com `newline=''`/usar Edit); limite removido em um lugar precisa ser conferido na rota, no use case, no OpenAPI e no cliente.
11. **Commits:** contínuos na branch da issue, nunca em `main`, conforme `BP:AGENTS.md`.

---

## 5. Refinamento por item

### Item 20 — Upgrade Prisma 5.22 → 6.x e lucide-react 0.475 → 1.x

**Objetivo:** alinhar o boilerplate às versões que o tribal já roda em produção, antes de criar models novos.

**Diferença real de dependências** (comparação de `package.json` dos dois repos; todo o resto é idêntico):

| Pacote           | Boilerplate | Tribal                                             |
| ---------------- | ----------- | -------------------------------------------------- |
| `prisma`         | `5.22.0`    | `^6.16.1`                                          |
| `@prisma/client` | `5.22.0`    | `^6.16.1`                                          |
| `lucide-react`   | `^0.475.0`  | `1.53.0` (+ `overrides` no `package.json` da raiz) |

**Arquivos tocados (boilerplate):**

| Arquivo                                                                                             | Mudança                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BP:package.json`                                                                                   | versões acima; fixar `prisma`/`@prisma/client` no mesmo patch; avaliar `overrides: { "lucide-react": "1.53.0" }` (o tribal usa — conferir se é por peer dep do React 19) |
| `BP:package-lock.json`                                                                              | regerado — **gerar no Windows e conferir se os binários Linux continuam listados** (item 16)                                                                             |
| `BP:prisma/merge.mjs`                                                                               | sem mudança esperada (`generator client { provider = "prisma-client-js" }` continua válido; **não** migrar para o gerador novo `prisma-client`)                          |
| `BP:src/managers/Db.manager.ts`                                                                     | revisar uso de `$transaction` (opções `maxWait`/`timeout`) e tipos `Prisma.TransactionClient`                                                                            |
| `BP:src/design-system/Icon.tsx`, `BP:src/components/**`                                             | ícones renomeados/removidos na v1 do lucide — o typecheck lista os imports quebrados                                                                                     |
| `BP:README.md`, `BP:docs/adr/006-mongodb-prisma-single-db.md`, `BP:docs/operators/database-pool.md` | citam versão/stack; atualizar                                                                                                                                            |

**Passos:**

1. Branch própria; bump; `npm install`; `npm run prisma:generate`.
2. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
3. Smoke real: `docker compose up -d` → `npm run prisma:push` → `npm run healthcheck` → `npm run smoke:multi-instance`.
4. Conferir páginas com ícones (`/ds-components`, sidebar, perfil).

**Riscos:** (a) Prisma 6 é major — ler as release notes (campos `Bytes`, erros removidos, nomes reservados) antes de decidir; o schema do boilerplate é pequeno (5 models) e o do tribal usa o mesmo estilo em Mongo, o que reduz o risco; (b) lockfile gerado no Windows (item 16); (c) lucide 1.x muda nomes de ícone.

**Critérios de aceite:** CI verde; `healthcheck` e `smoke:multi-instance` verdes; nenhum ícone quebrado; `AGENTS.md`/README com as versões novas.

**Testes:** nenhum novo; o objetivo é a suíte atual passar.

---

### Item 18 — Infra e suíte de testes (jsdom, componentes, hooks, i18n)

**Estado atual:** `BP:jest.config.js` roda tudo em `testEnvironment: 'node'`, sem transform de JSX. `jest-environment-jsdom` já é devDependency. `BP:tests/` não tem pastas `components`, `hooks`, `design-system`, `i18n`.

**Como o tribal faz** (`T:web/jest.config.js` + docblock): ambiente padrão `node`; teste de componente declara `/** @jest-environment jsdom */`; `ts-jest` com `tsconfig: { jsx: 'react-jsx' }` no transform; renderização com `react-dom/client` + `act` (sem Testing Library). Não há dependência nova.

**Arquivos tocados:**

| Arquivo                                                        | Mudança                                                                                                                                                    |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BP:jest.config.js`                                            | adicionar `tsconfig: { jsx: 'react-jsx' }` no transform de `.tsx`; manter `isolatedModules`                                                                |
| `BP:tests/helpers/`                                            | helper `renderInJsdom` (container + `createRoot` + `act` + `IS_REACT_ACT_ENVIRONMENT`) — hoje repetido em cada teste do tribal                             |
| `BP:tests/i18n/catalogParity.test.ts`                          | **novo**: importa `pt`, `en`, `es` de `src/constants/texts` e falha se alguma chave existir em um e faltar em outro (previne o incidente da lição de i18n) |
| `BP:tests/components/`, `tests/hooks/`, `tests/design-system/` | pastas novas, preenchidas **junto com cada item**                                                                                                          |

**Testes do tribal que se aplicam ao boilerplate (portar com o item correspondente):**

| Teste origem (`T:web/tests/…`)                                                 | Item       | Observação                                                                 |
| ------------------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------- |
| `design-system/HelperBar.test.tsx`, `Toast.test.tsx`                           | 14         | `Toast` já existe no boilerplate — portar já na onda 0 como prova da infra |
| `components/errors/AppErrorScreen.test.tsx`, `lib/errors/*`                    | 12         |                                                                            |
| `components/auth/ImpersonationConsumer.test.tsx`                               | 5          |                                                                            |
| `hooks/useSignedUrlRefresh.test.tsx`                                           | 11         |                                                                            |
| `lib/image/*`, `compressImageToWebp.test.ts`, `sanitizeUploadFileName.test.ts` | 11         |                                                                            |
| `lib/pwa/*` (appUpdate, webManifest, …)                                        | 8          |                                                                            |
| `lib/push/*`                                                                   | 7          |                                                                            |
| `utils/session.test.ts` (casos de impersonamento)                              | 5          | já existe `BP:tests/utils/session.test.ts` — estender                      |
| `components/layout/GlobalLoading.test.tsx`                                     | backlog 13 |                                                                            |

**Não portar:** `hooks/useChatKeyboardShortcuts`, `useMapSelectionBox`, `useMessageFocus`, `realtime/*`, `sheets/*`, `lib/dice3d`, `lib/mapFog` (RPG/realtime).

**Critérios de aceite:** pelo menos um teste de componente (Toast), um de hook e o teste de paridade i18n rodando no CI; `npm test` continua com um único comando.

**Risco:** `isolatedModules` + JSX exige o `tsconfig` do transform; `tsconfig.typecheck.json` deve incluir `tests/**/*.tsx`.

---

### Item 16 — CI: binários nativos Linux (condicional)

**Decisão de partida:** **não portar de imediato.** Ver achado 2.

**Passos:**

1. Depois dos itens 20 e 11 (que mudam o lockfile), abrir PR de teste e observar o job `verify`.
2. Se `npm ci` ou `next build` falhar por binário ausente (`@tailwindcss/oxide`, `lightningcss`, `@swc/core`, `@img/sharp-*`), portar o que o tribal usa:

| Arquivo (boilerplate)                   | Origem                                            | Mudança                                                                                                   |
| --------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `BP:scripts/ci-install-linux-native.sh` | `tribalRPGBot/scripts/ci-install-linux-native.sh` | **recalcular as versões a partir do lockfile do boilerplate** (sharp `0.34.5`, não `0.33.5`)              |
| `BP:.npmrc`                             | `tribalRPGBot/.npmrc`                             | `include=optional` + `supportedArchitectures` (os/cpu/libc)                                               |
| `BP:package.json`                       | `tribalRPGBot/package.json`                       | bloco `optionalDependencies` com os pacotes Linux                                                         |
| `BP:.github/workflows/ci.yml`           | `tribalRPGBot/.github/workflows/ci.yml`           | `npm ci --include=optional` + step `bash scripts/ci-install-linux-native.sh` (`if: runner.os == 'Linux'`) |

3. Em qualquer cenário, atualizar o `env:` do job `build` com as variáveis novas (`VAPID_*` falsas, `AI_PROVIDER=none`) — obrigatório conforme itens 1 e 7.

**Critério de aceite:** CI verde em PR limpo; sem step "mágico" se o lockfile já resolver.

---

### Item 3 — Feature flags

**Origem:** `T:core/prisma/models/featureFlag.prisma`, `T:core/src/repositories/featureFlag.repository.ts`, `T:core/src/managers/FeatureFlag.manager.ts`, `T:core/src/domains/featureFlag/*`, `T:core/src/utils/jsonValueToBoolean.ts`, `T:web/scripts/toggle-feature-flag.mjs`. Testes: `T:core/tests/unit/managers/FeatureFlag.manager.test.ts`, `…/repositories/featureFlag.repository.test.ts`.

**Como funciona no tribal:** coleção append-only (`key`, `value` Json, `createdAt`); o valor vigente é o registro **mais recente** da chave; chave ausente = desligada; `jsonValueToBoolean` aceita boolean, número, string `"true"/"1"` e objeto `{active|enabled|value}`; o script insere um registro com o valor invertido e exige `--confirm` em produção. O histórico vira trilha de auditoria de graça. **Não há cache** — cada `isFeatureActive` bate no banco.

**Arquivos (boilerplate):**

| Tipo    | Caminho                                                                                                                                        | Origem / nota                                                                                     |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Novo    | `BP:prisma/models/featureFlag.prisma`                                                                                                          | cópia; índice `[key, createdAt]`; manter `@@map` conforme padrão dos outros models do boilerplate |
| Novo    | `BP:src/repositories/FeatureFlag.repository.ts`                                                                                                | recebe `Prisma.TransactionClient`; métodos `getLatest(key)`, `append(key, value)`                 |
| Novo    | `BP:src/managers/FeatureFlag.manager.ts`                                                                                                       | `isFeatureActive(key)`; os managers do boilerplate são singletons — seguir `Settings.manager.ts`  |
| Novo    | `BP:src/utils/jsonValueToBoolean.ts`                                                                                                           | cópia + teste                                                                                     |
| Novo    | `BP:scripts/toggle-feature-flag.mjs`                                                                                                           | usa `scripts/lib/operator.mjs` (`isProductionEnv`) que já existe                                  |
| Alterar | `BP:package.json`                                                                                                                              | script `toggle-feature-flag`                                                                      |
| Alterar | `BP:src/container/dependencies.ts`                                                                                                             | só se o manager for injetado; singleton dispensa                                                  |
| Novo    | `BP:docs/operators/feature-flags.md`                                                                                                           | como ligar/desligar, convenção de nomes, histórico                                                |
| Alterar | `BP:docs/adr/`                                                                                                                                 | ADR curto "feature flags append-only no Mongo"                                                    |
| Novo    | `BP:tests/managers/FeatureFlag.manager.test.ts`, `tests/repositories/FeatureFlag.repository.test.ts`, `tests/utils/jsonValueToBoolean.test.ts` | adaptar os do tribal para `mockDbCommander`                                                       |

**Melhoria sobre o tribal (recomendada):** cache em memória com TTL curto (ex.: 30 s) para não consultar o banco em cada checagem; documentar que em multi-instância a propagação leva até o TTL (`smoke:multi-instance` não precisa mudar).

**Primeiro consumidor:** flag `ai_enabled` lida pelo AI Service (item 1). Evitar flags de produto no boilerplate além dessa.

**Fora do escopo:** UI de admin para alternar flags (opcional depois do item 5); endpoint público de flags.

**Critérios de aceite:** `npm run toggle-feature-flag -- ai_enabled` alterna; `isFeatureActive` respeita o registro mais recente; produção sem `--confirm` falha; testes passam.

---

### Item 2 — `aiLog` (auditoria e custo de IA)

**Origem:** `T:core/prisma/models/aiLog.prisma`, `T:core/src/repositories/aiLog.repository.ts`, `T:core/src/domains/aiLog/*` (`AILogRepositoryPort.create`, `AILogQuotaPort.countByUserSince`).

**Modelo proposto (boilerplate)** — parte do tribal e remove o que é de domínio:

| Campo tribal                                                            | Proposta                                                                                             |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `tenant`, `chatId`                                                      | **remover** (RPG/Discord); se precisar de correlação, um `contextId String?` genérico                |
| `userId String?`                                                        | `userId String? @db.ObjectId` (permite apagar/exportar por usuário)                                  |
| `userName String?`                                                      | **remover** — nome desnormalizado é dado pessoal sem necessidade                                     |
| `query`                                                                 | manter o nome ou renomear para `operation` — **renomear só se a paridade com o tribal não importar** |
| `model`, `message?`, `prompt`, `response`, `tokenCost Int`, `createdAt` | manter                                                                                               |
| índices                                                                 | `[createdAt]`, `[userId, createdAt]`, `[query, createdAt]`                                           |

**Arquivos (boilerplate):**

| Tipo    | Caminho                                                                                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Novo    | `BP:prisma/models/aiLog.prisma`                                                                                                                                                      |
| Novo    | `BP:src/repositories/AILog.repository.ts` — `create`, `countByUserSince`, `sumTokensByUserSince` (novo, para cota/custo), `deleteOlderThan` (retenção), `findAllByUser` (exportação) |
| Novo    | `BP:src/services/AI/aiLog.port.ts` — porta usada pelo `AIService` (não depender do repository)                                                                                       |
| Alterar | `BP:scripts/cron/jobs/retention-purge.mjs` — apagar `aiLog` mais antigo que N dias (D12) e, na exclusão definitiva de conta, os registros do usuário                                 |
| Alterar | `BP:src/useCases/exportUserData.usecase.ts` — incluir `aiLog` do usuário                                                                                                             |
| Alterar | `BP:src/useCases/deleteUserAccount.usecase.ts` / fluxo de purge — remover/anonimizar                                                                                                 |
| Alterar | `BP:docs/operators/retention.md`                                                                                                                                                     |
| Novo    | `BP:tests/repositories/AILog.repository.test.ts`                                                                                                                                     |

**Ponto de projeto crítico (D2, decidido: log fora da TX):** o log de uma chamada paga precisa sobreviver mesmo se o use case falhar depois. Se for gravado com o `TransactionClient` do use case, um rollback apaga a evidência do gasto. Conflito direto com a regra "repositories só usam o client da TX". Solução proposta: os use cases que chamam IA são `transactional = false`, e o `AIService` grava o log por um recorder próprio que usa `runWithoutTransaction` (`BP:src/managers/Db.manager.ts`). Documentar no ADR do item 1.

**LGPD:** `prompt` e `response` contêm conteúdo do usuário → exportação, retenção e exclusão (acima), e menção em `BP:content/legal` (política de privacidade) por revisão jurídica — **não alterar texto legal sem sua aprovação**.

**Critérios de aceite:** toda chamada do AI Service (sucesso) gera um registro com tokens; falha de vendor não grava registro falso; exportação de dados inclui os logs; purge remove.

---

### Item 1 — AI Service com vendor plugável

**Origem:** `T:core/src/services/AIService/AI.service.ts` (339 linhas), `…/vendors/OpenAI.service.ts` (251), `…/Image.generator.ts` (92). Contrato do vendor: `AISummaryVendor` dentro de `AI.service.ts`. Env: `OPENAI_API_KEY` (obrigatória no tribal), `OPENAI_IMAGE_MODEL`.

**Como é no tribal:** `AIService` monta o prompt, chama o vendor, grava `aiLog` e devolve o texto; o vendor só chama a API e devolve `{ text, vendor, model, tokenCost }`. Use case recebe `AIService` (ou uma porta mínima), nunca o SDK. Resposta vazia lança erro sem retry. Em teste, vendor falso. Métodos: `summarize`, `evaluateTopic` (título curto), `inferCheckCommand` (nota 0–100), `inferCommand`, `generateLogs`, `generateImageWithContext`.

**O que levar (genérico) e o que deixar:**

| Levar (reescrito genérico)                                          | Deixar                                                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| contrato de vendor + `AIService` orquestrador                       | `generateLogs`, `inferCommand`/`inferCheckCommand` (acoplados à tabela de comandos do bot), `COMMANDS_DOC_PATH`, prompts de RPG |
| `summarize` (resumo com limite de caracteres)                       | `generateImageWithContext` com prefixos `AI_MAP`/`AI_SCENE` e `FileManager.storeImage` do domínio de jogo                       |
| `evaluateTopic` → `generateTitle`                                   | vínculo com `tenant`, `player`, `chatId`                                                                                        |
| `classify` baseado em `parseProbabilityScore` (nota 0–100 + limiar) |                                                                                                                                 |
| `generateImage` (opcional, atrás de flag)                           |                                                                                                                                 |

**API proposta (boilerplate):**

```ts
// BP:src/services/AI/ai.port.ts
interface AIVendor {
	generateText(input: { prompt: string; model?: string }): Promise<AIVendorTextResult>
	generateImage?(input: { prompt: string; size?: string }): Promise<AIVendorImageResult>
}
// BP:src/services/AI/AI.service.ts — orquestra: feature flag → vendor → aiLog
```

**Arquivos (boilerplate):**

| Tipo    | Caminho                                                                                                                           | Nota                                                                                                                                                                                                                                                                                                    |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novo    | `BP:src/services/AI/ai.port.ts`, `ai.types.ts`                                                                                    | contratos e tipos                                                                                                                                                                                                                                                                                       |
| Novo    | `BP:src/services/AI/AI.service.ts`                                                                                                | `summarize`, `generateTitle`, `classify`, `generateText`, `generateImage?`; checa flag `ai_enabled` (item 3); registra `aiLog` (item 2)                                                                                                                                                                 |
| Novo    | `BP:src/services/AI/vendors/OpenAI.service.ts`                                                                                    | SDK `openai` (`^6.37.0` no tribal); modelos por env (D3); erros do `BP:src/errors` (`InfraError`)                                                                                                                                                                                                       |
| Novo    | `BP:src/services/AI/prompts/*.ts`                                                                                                 | prompts como constantes versionadas, genéricos                                                                                                                                                                                                                                                          |
| Novo    | `BP:src/services/AI/aiResilience.ts`                                                                                              | circuito + timeout usando `BP:src/services/resilience/externalBreakers.ts` e `BP:src/utils/retryWithJitter.ts` (**melhoria**: o tribal não tem retry)                                                                                                                                                   |
| Alterar | `BP:src/config/env.ts`                                                                                                            | `getAIConfig()`: `AI_PROVIDER` (`openai` \| `none`, default `none`), `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL` (default `gpt-5.4-mini`), `OPENAI_IMAGE_MODEL` (default `gpt-image-1`); `isAIReady()` no mesmo padrão de `isGoogleOAuthReady`. **O boilerplate precisa subir sem chave** (o tribal não sobe) |
| Alterar | `BP:src/container/dependencies.ts`                                                                                                | `aiService`                                                                                                                                                                                                                                                                                             |
| Alterar | `BP:.env.example`, `BP:README.md`, `BP:.github/workflows/ci.yml`, `BP:scripts/healthcheck.mjs`, `BP:scripts/test-environment.mjs` | env novas; healthcheck só valida se `AI_PROVIDER=openai`                                                                                                                                                                                                                                                |
| Alterar | `BP:package.json`                                                                                                                 | dependência `openai`                                                                                                                                                                                                                                                                                    |
| Novo    | `BP:src/utils/parseProbabilityScore.ts`                                                                                           | cópia de `T:core/src/utils/parseProbabilityScore.ts` + teste                                                                                                                                                                                                                                            |
| Novo    | `BP:tests/helpers/fakeAIVendor.ts`, `BP:tests/services/AI/AI.service.test.ts`, `…/OpenAI.service.test.ts`                         | vendor falso; teste do vendor mocka o SDK                                                                                                                                                                                                                                                               |
| Novo    | `BP:docs/adr/011-ai-service-vendor-port.md`                                                                                       | decisão de porta/vendor, TX e log (D2)                                                                                                                                                                                                                                                                  |
| Novo    | `BP:docs/operators/ai.md`                                                                                                         | env, flag, custo, troca de vendor                                                                                                                                                                                                                                                                       |
| Alterar | `BP:docs/operators/subprocessors-ropa.md`, `transfers.md`                                                                         | **OpenAI como suboperador** com transferência internacional                                                                                                                                                                                                                                             |

**Use case de exemplo (D4, decidido: sem rota):** um `generateExampleText.usecase.ts` com `transactional = false`, usado só em teste e na documentação, para mostrar o padrão (chamada externa fora da TX; log após). **Sem rota pública.** Se houver rota depois: `requireAuth`, `assertAuthRateLimit`, cota por usuário via `countByUserSince`/`sumTokensByUserSince`, flag.

**Riscos:** custo (abuso por rota exposta); vazamento de dado pessoal no prompt (não mandar PII sem necessidade); o ID de modelo default (`gpt-5.4-mini`, D3) vem da escolha do mantenedor e pode não existir na conta de quem usar o boilerplate: por isso é configurável por env.

**Critérios de aceite:** com `AI_PROVIDER=none` o app sobe e `AIService` responde "indisponível" de forma tipada; com vendor falso os testes cobrem sucesso, resposta vazia, vendor com erro (nenhum `aiLog` falso), flag desligada; troca de vendor = classe nova + mudança no container.

---

### Item 12 — Tratamento global de erro no front

**Origem:** `T:web/src/components/errors/{AppErrorScreen,AngryMaskat,ErrorGuardScript}.tsx`, `T:web/public/error.html` (265 linhas), `T:web/public/error-guard.js` (105), `T:web/src/app/global-error.tsx`, `T:web/src/app/[locale]/error.tsx`, `T:web/src/lib/errors/{appErrorCopy,isFatalClientLoadError,readAppTheme}.ts`.

**O que faz:** `error-guard.js` (estático, compatível com CSP `script-src 'self'`) intercepta `ChunkLoadError` e afins antes de o Next pintar a tela padrão e redireciona para `/error.html`; offline o erro de chunk é ignorado. `AppErrorScreen` é a tela de erro do React (tema lido do cookie); `global-error.tsx` cobre falha no layout raiz; `error.html` é a página 100% estática (também servida pelo SW em 5xx).

**Arquivos (boilerplate):**

| Tipo    | Caminho                                                                                                    | Nota                                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Novo    | `BP:src/components/errors/AppErrorScreen.tsx`                                                              | tira `AngryMaskat` (mascote do produto) — usar ícone genérico do lucide                                          |
| Novo    | `BP:src/components/errors/ErrorGuardScript.tsx`                                                            |                                                                                                                  |
| Novo    | `BP:public/error-guard.js`                                                                                 | porta a lógica; remover referências a marca                                                                      |
| Novo    | `BP:public/error.html`                                                                                     | **remover branding**; textos nos 3 idiomas já ficam hard-coded em `appErrorCopy` porque o HTML não usa next-intl |
| Novo    | `BP:src/app/global-error.tsx`                                                                              |                                                                                                                  |
| Alterar | `BP:src/app/[locale]/error.tsx` (34 linhas hoje)                                                           | passa a usar `AppErrorScreen`                                                                                    |
| Alterar | `BP:src/app/global-not-found.tsx`                                                                          | alinhar visual (opcional)                                                                                        |
| Novo    | `BP:src/lib/errors/appErrorCopy.ts`, `isFatalClientLoadError.ts`, `readAppTheme.ts`                        |                                                                                                                  |
| Alterar | `BP:src/app/[locale]/layout.tsx`                                                                           | `<ErrorGuardScript />` no `<head>`                                                                               |
| Alterar | `BP:src/config/securityHeaders.ts`                                                                         | só se algo novo exigir; `script-src 'self'` já atende                                                            |
| Alterar | `BP:src/constants/texts/*`                                                                                 | se algum texto sair do `appErrorCopy`                                                                            |
| Novo    | `BP:tests/components/errors/AppErrorScreen.test.tsx`, `BP:tests/lib/errors/isFatalClientLoadError.test.ts` | origem em `T:web/tests/components/errors` e `…/lib/errors`                                                       |

**Ajuste obrigatório de texto:** o `APP_ERROR_MESSAGES` do tribal diz "pode reportar o erro pelo menu de usuário" e "nossa equipe já recebeu logs". No boilerplate **não há menu de reporte** (item 6 do backlog) nem coleta de logs de cliente. Reescrever para não prometer o que não existe.

**Acoplamento com o item 8:** o SW pré-cacheia `/error.html`, `/theme.js`, `/error-guard.js` (`ERROR_FALLBACK_URLS`). Nada a fazer aqui, mas o item 8 precisa referenciar estes arquivos.

**Critérios de aceite:** forçar `ChunkLoadError` (renomear um chunk em dev) redireciona para `/error.html`; erro de render mostra `AppErrorScreen` no tema atual e no idioma do cookie; offline não dispara a tela fatal.

---

### Item 14 — Componentes do design system

**Lista, tamanho, dependências e decisão:**

| Componente (origem `T:web/src/design-system/`)                                 | Linhas  | Dependências                                                                        | Decisão                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HelperBar.tsx`                                                                | 37      | lucide                                                                              | **portar**                                                                                                                                                                                                 |
| `MultiIcon.tsx`                                                                | 46      | lucide, `cn`                                                                        | **portar**                                                                                                                                                                                                 |
| `ColorPalettePicker.tsx`                                                       | 38      | `cn`                                                                                | **portar** (conferir se é de ficha/token; se for, descartar)                                                                                                                                               |
| `StorageProgressBar.tsx`                                                       | 37      | `@/constants/storageQuota`                                                          | **portar** adaptando: props `usedBytes`/`quotaBytes` (hoje lê constantes do tribal); usar `BP:src/utils/formatStorage.ts` e `USER_STORAGE_QUOTA_BYTES`; faixas verde < 60 %, âmbar ≥ 60 %, vermelho > 90 % |
| `MultiSelect.tsx`                                                              | 89      | `ui/dropdown-menu`, `Select`                                                        | **portar**; exporta como `AppMultiSelect`                                                                                                                                                                  |
| `Drawer.tsx`                                                                   | 123     | `IconButton`, `cn`                                                                  | **D9**: comparar com `BP:src/components/ui/sheet.tsx`                                                                                                                                                      |
| `ImageCropModal.tsx`                                                           | 118     | **`react-easy-crop`**, `Button`, `Slider`                                           | **portar com o item 11** (depende de `lib/image/cropAndCompress`)                                                                                                                                          |
| `FormattedTextArea.tsx`                                                        | 594     | `lib/tribal/chatCheckbox`, `reactionShortcode`, `reactionEmojiCatalog`, `TextInput` | **D5: não portar**                                                                                                                                                                                         |
| `RollButton`, `HpBar`                                                          | —       | RPG                                                                                 | **ignorar**                                                                                                                                                                                                |
| Som: `components/sound/{SoundMuteButton,ConnectivitySoundHost}`, `lib/sound/*` | —       | assets `.mp3`                                                                       | **D10: opcional**, não recomendado sem caso de uso                                                                                                                                                         |
| `hooks/useMediaQuery.ts`                                                       | pequeno | —                                                                                   | **portar**                                                                                                                                                                                                 |

**Arquivos tocados (por componente portado):** `BP:src/design-system/<Nome>.tsx`, `BP:src/design-system/index.ts` (export), `BP:src/components/ds-catalog/catalog.ts` (entrada + `keywords`), `BP:src/components/ds-catalog/DsComponentExample.tsx` (exemplo), `BP:.cursor/rules/design-system.mdc` (se citar lista), `BP:src/hooks/useMediaQuery.ts`. Dependência nova: `react-easy-crop ^6.2.3` (só com o `ImageCropModal`).

**Regras:** `{...props}` espalhado **antes** dos handlers internos (lição do tribal); sem textos fixos (strings via props ou `useTranslations`); sem referências de domínio.

**Testes:** `BP:tests/design-system/HelperBar.test.tsx` (origem `T:web/tests/design-system`), um para `StorageProgressBar` (faixas de cor) e `MultiSelect` (seleção múltipla).

**Critérios de aceite:** todos aparecem em `/ds-components` com exemplo; typecheck e lint verdes; nenhum import de `@/lib/tribal`.

---

### Item 15 — Segurança extra (escopo reduzido; ver achado 1)

**Entregas:**

**15.a — Endurecer `isBlockedIp` com `ipaddr.js`**

| Arquivo                                          | Mudança                                                                                                                                                                                                  |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BP:package.json`                                | `ipaddr.js ^2.2.0` (provavelmente já transitivo; declarar)                                                                                                                                               |
| `BP:src/utils/safeImageUrl.ts`                   | `isBlockedIp` passa a usar `ipaddr.process(ip).range() !== 'unicast'` (cobre TEST-NET, 240/4, multicast, CGNAT, Teredo, etc.); **manter** `isNonDottedNumericHost`, mapped/6to4 e a validação de octetos |
| `BP:src/services/Storage/RemoteFetch.service.ts` | `assertPublicHost` também recusa `localhost`, `*.localhost`, `*.local` antes do DNS                                                                                                                      |
| `BP:tests/utils/safeImageUrl.test.ts`            | casos novos (192.0.2.1, 198.51.100.1, 203.0.113.1, 240.0.0.1, `224.0.0.1`, `100.64.0.1`, `::ffff:`, `2001::`)                                                                                            |
| `BP:tests/services/`                             | teste de `RemoteFetch` com `localhost`/`.local`                                                                                                                                                          |

Origem: `T:core/src/domains/game/safeFetchHost.ts` (103 linhas: `isBlockedIpAddress`, `normalizeIpv4Literal`, `isBlockedFetchHost`, `isBlockedResolvedHost`). **Não portar o arquivo inteiro** — o boilerplate já resolve o mesmo problema; portar só as lacunas.

**15.b — `change-user-password`**

| Arquivo                               | Mudança                                                                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BP:scripts/change-user-password.mjs` | origem `T:web/scripts/change-user-password.mjs`: argon2, política 8–128 com ≥ 3 classes, grava `passwordHash` e `sessionsRevokedAt`, mascara e-mail no log, não imprime a senha, roda em produção |
| `BP:package.json`                     | script `change-user-password`                                                                                                                                                                     |
| `BP:scripts/lib/operator.mjs`         | já tem `maskEmail`/`isProductionEnv`? conferir; senão acrescentar                                                                                                                                 |
| `BP:docs/operators/`                  | runbook curto (quando usar, exige acesso ao host)                                                                                                                                                 |
| `BP:tests/scripts/`                   | D15: teste que compara a política do script com `src/utils/passwordPolicy.ts`                                                                                                                     |

**Atenção:** argumentos de senha em linha de comando ficam no histórico do shell; o runbook deve dizer isso e sugerir leitura por variável de ambiente (melhoria sobre o tribal — **não verifiquei se o tribal oferece**).

**Critérios de aceite:** IPs reservados bloqueados; script troca a senha e revoga sessões existentes (login antigo passa a dar 401 por `sessionsRevokedAt`).

---

### Item 5 — Papel ADMIN, painel `/admin` e impersonamento

**Pré-requisito:** D1 (**decidido**: `User.role` separado). Abaixo assume `User.role`.

**Origem (tudo em `T:web/src/`):** `useCases/{createImpersonationToken,consumeImpersonationToken,listAdminUsers}.usecase.ts`, `controllers/Auth/routes/impersonate.route.ts`, `controllers/User/routes/createImpersonationToken.route.ts`, `app/api/v1/auth/impersonate/route.ts`, `app/api/v1/admin/users/{route.ts,[id]/impersonation-token/route.ts}`, `utils/session.ts` (impersonamento), `middleware/auth.middleware.ts`, `components/auth/ImpersonationConsumer.tsx` (52), `components/layout/ImpersonationBanner.tsx` (87), `components/tribal/{AdminPageClient (379),AdminUsersSection (173)}.tsx`, `app/[locale]/admin/page.tsx`.

**Comportamento a preservar** (do `CONTEXT.md` do tribal): o admin gera um link `/?impersonate=<token>`; o link só funciona em navegador **sem sessão válida** (com sessão ativa a API responde 409 e nada muda); autentica como o alvo por **10 min, sem renovação**; a sessão **não** vira `ActiveSession`, não dispara e-mail de novo login e cai se o alvo trocar a senha ou sair; ações destrutivas/de conta respondem 403 durante o impersonamento; faixa vermelha com tempo restante e botão Sair; `GET /auth/me` devolve `impersonation: { expiresAt } | null`. O token **é** o JWT de sessão — sem revogação antes de expirar.

**Schema e dados:**

| Arquivo                             | Mudança                                                                                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BP:prisma/models/user.prisma`      | `enum UserRole { USER ADMIN }` e `role UserRole?` (opcional: **no Mongo/Prisma, campo obrigatório ausente em documento antigo quebra a leitura**; tratar `null` como `USER`) + `@@index([role])` |
| `BP:scripts/backfill-user-role.mjs` | grava `USER` nos documentos sem o campo (precedente: `user-level:backfill` do tribal)                                                                                                            |
| `BP:scripts/change-user-role.mjs`   | análogo ao `change-user-level` do tribal: `npm run change-user-role -- <email> <role> [--confirm]` (produção exige `--confirm`) — **única forma de criar um admin**                              |
| `BP:package.json`                   | scripts `user-role:backfill`, `change-user-role`                                                                                                                                                 |

**Backend:**

| Tipo    | Caminho                                                                                                                                    | Nota                                                                                                                                                                                                                                                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alterar | `BP:src/utils/session.ts`                                                                                                                  | claims `sessionType: 'IMPERSONATION'`, `impersonatedBy`; `signImpersonationToken` (600 s), `isImpersonationSession`, `IMPERSONATION_DEVICE`; `verifySessionToken` lê as claims; `clearSessionCookies` com opção `keepDevice` (hoje o parâmetro de contexto é ignorado)                                                                         |
| Alterar | `BP:src/middleware/auth.middleware.ts`                                                                                                     | `requireAuth`, `requireAuthForDeletionDecision` e `tryAuth*` **pulam** o self-heal de `ActiveSession` para sessão de impersonamento; novo `assertNotImpersonation(session)` (403)                                                                                                                                                              |
| Alterar | rotas bloqueadas em impersonamento                                                                                                         | `changePassword`, `requestEmailChange`, `deleteAccount`, `exportUserData`, `revokeSession`, `revokeOtherSessions`, `cancelAccountDeletion`, `keepAccountDeletion` (em `BP:src/controllers/User/routes/`), mais início/vínculo de Google e fluxo de e-mail (`auth/google`, `auth/email`) e, quando existir, `POST /push/subscriptions` (item 7) |
| Novo    | `BP:src/useCases/createImpersonationToken.usecase.ts`                                                                                      | `transactional=false`; exige `role === 'ADMIN'` do chamador, alvo existente; D11 (bloquear alvo admin); `LogManager.info` com ids, **nunca o token**                                                                                                                                                                                           |
| Novo    | `BP:src/useCases/consumeImpersonationToken.usecase.ts`                                                                                     | valida assinatura/tipo/expiração; mesma resposta 401 para qualquer falha                                                                                                                                                                                                                                                                       |
| Novo    | `BP:src/useCases/listAdminUsers.usecase.ts`                                                                                                | 20 por página, mais recentes primeiro; foto via `FileRepository` + `StorageUrlService`                                                                                                                                                                                                                                                         |
| Alterar | `BP:src/repositories/User.repository.ts`                                                                                                   | `listActivePage({ skip, take })`; `findById` já retorna `role`                                                                                                                                                                                                                                                                                 |
| Alterar | `BP:src/repositories/User.dto.ts` + `docs/dto-checklist.md`                                                                                | `role` no DTO próprio; **não** vazar campos sensíveis na listagem admin                                                                                                                                                                                                                                                                        |
| Novo    | `BP:src/controllers/Auth/routes/impersonate.route.ts`, `BP:src/controllers/User/routes/{createImpersonationToken,listAdminUsers}.route.ts` | `assertSameOrigin`, `assertAuthRateLimit(request,'impersonate')`, 409 se já houver sessão                                                                                                                                                                                                                                                      |
| Alterar | `BP:src/controllers/Auth/Auth.controller.ts`, `User.controller.ts`, `BP:src/container/dependencies.ts`                                     | registrar                                                                                                                                                                                                                                                                                                                                      |
| Novo    | `BP:src/app/api/v1/auth/impersonate/route.ts`, `BP:src/app/api/v1/admin/users/route.ts`, `…/admin/users/[id]/impersonation-token/route.ts` |                                                                                                                                                                                                                                                                                                                                                |
| Alterar | `BP:src/controllers/Auth/routes/me.route.ts` (ou equivalente)                                                                              | devolver `impersonation`                                                                                                                                                                                                                                                                                                                       |
| Alterar | `BP:docs/openapi.yaml`, `BP:requests/*.http`                                                                                               | rotas novas                                                                                                                                                                                                                                                                                                                                    |

**Por que o consumo é `POST` chamado pelo cliente e não no `middleware.ts`:** o middleware roda na Edge, sem Prisma, e gravar cookie num GET deixaria prefetch abrir a sessão (comentário do próprio tribal). Manter.

**Frontend:**

| Tipo          | Caminho                                                                                                        | Nota                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Novo          | `BP:src/components/auth/ImpersonationConsumer.tsx`                                                             | lê `?impersonate=`, chama o `POST`, limpa a URL                                                          |
| Novo          | `BP:src/components/layout/ImpersonationBanner.tsx`                                                             | publica altura em `--app-banner-h`                                                                       |
| Novo          | `BP:src/app/[locale]/admin/page.tsx` + `BP:src/components/admin/AdminPageClient.tsx` + `AdminUsersSection.tsx` | **só seção Usuários** (o `AdminPageClient` do tribal também tem jogos, pedidos e otimização — descartar) |
| Alterar       | `BP:src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `BP:src/constants/navigation.ts`                       | banner e link "Admin" só para `role === 'ADMIN'`                                                         |
| Alterar       | `BP:src/lib/auth-client.ts`, `BP:src/components/auth/AuthProvider.tsx`                                         | `role` e `impersonation` no tipo `AuthUser`                                                              |
| Alterar       | `BP:src/constants/texts/{pt,en,es,types}.ts`                                                                   | namespaces `admin` e `impersonation`                                                                     |
| Guard de rota | `/admin`                                                                                                       | server-side (use case) **e** redirecionamento no cliente; o cliente sozinho não é controle de acesso     |

**Documentação:** ADR `BP:docs/adr/012-admin-impersonation.md` (modelo de ameaça, 10 min, sem revogação, auditoria); `BP:docs/operators/incident-response.md` (como investigar uso indevido); política de privacidade — **avisar o jurídico** de que admins podem acessar contas para suporte (não editar `content/legal` sem aprovação).

**Melhoria opcional (recomendada):** auditoria persistida. O tribal só registra via `LogManager.info`, que é efêmero. Gravar `adminId`, `targetUserId`, `issuedAt` em coleção própria (ou reutilizar `SessionEvent` com tipo) permite responder "quem entrou na conta de X?".

**Testes:** use cases (admin ok, não admin 403, alvo inexistente 404, alvo admin bloqueado); `session.test.ts` (claims, TTL 600); `auth.middleware` (não cria `ActiveSession`; `assertNotImpersonation`); rota impersonate (409 com sessão, 401 com token ruim, rate limit); `ImpersonationConsumer.test.tsx`; `ImpersonationBanner`.

**Critérios de aceite:** admin gera link; em aba anônima autentica como alvo por 10 min; banner visível; rotas destrutivas 403; trocar senha do alvo derruba a sessão; `ActiveSession` do alvo não ganha entrada; não admin não vê `/admin` nem consegue chamar as rotas.

**Sugestão de quebra:** (1) `role` + backfill + script + DTO; (2) sessão de impersonamento + middleware + rotas; (3) `/admin` + listagem + UI de impersonamento.

---

### Item 11 — Pipeline de imagem (`sharp`, thumbnail, recorte)

**Origem:** `T:core/src/services/storage/{imageResize,file.manager}.ts`; `T:web/src/services/Storage/{File.manager,resizeThumbnail,isWebpBuffer}.ts`; `T:web/src/lib/image/{compressImageToWebp,cropAndCompress,prepareImageForUpload,sanitizeUploadFileName,resolveFileIdDisplayUrl}.ts`; `T:web/src/design-system/ImageCropModal.tsx`; `T:web/src/hooks/useSignedUrlRefresh.ts`.

**Como funciona no tribal:** `storeImage` normaliza a imagem para WebP (`normalizeToPlatformWebp`, com `.rotate()`), gera thumbnail WebP de 200 px (`THUMBNAIL_PIVOT_PX`), envia os dois ao Spaces e, se o segundo upload falhar, apaga o primeiro (rollback manual). `file.sizeBytes` = imagem + thumbnail (**conta na cota**). O `File` guarda `thumbnail` e `thumbnailKey` (opcionais: linhas legadas não têm).

**Estado do boilerplate:** `BP:src/services/Storage/File.manager.ts` (152 linhas) já tem `storeImage({ buffer, mimeType, ownerId })` e `storeAvatar`, **sem redimensionar nem thumbnail**; `BP:src/constants/fileUpload.ts` valida MIME (`jpeg/png/webp/gif`); `BP:prisma/models/file.prisma` usa `category String` e `mimeType`, sem thumbnail e sem enum `FileType`.

**Escopo mínimo recomendado:** thumbnail + normalização + recorte de avatar. **Não** portar o enum `FileType` nem a migração URL→`fileId` (`backfill-file-ids`, `updateFileUrlReferences.ts`, 203 linhas) — são evolução do tribal que o boilerplate não precisa.

**Backend:**

| Tipo    | Caminho                                                                                                                 | Nota                                                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alterar | `BP:package.json`                                                                                                       | `sharp` (D13 `^0.34.5`); conferir `serverExternalPackages` no `next.config.ts` (o tribal lista `sharp`)                                               |
| Novo    | `BP:src/services/Storage/imageResize.ts`                                                                                | só `normalizeToPlatformWebp`, `resizeThumbnailWebp`, `resizeAvatarWebp`; descartar sheet/battle map/AI                                                |
| Novo    | `BP:src/services/Storage/isWebpBuffer.ts`                                                                               | cópia                                                                                                                                                 |
| Alterar | `BP:src/services/Storage/File.manager.ts`                                                                               | `storeImage`/`storeAvatar` normalizam, geram e enviam thumbnail, com rollback se falhar; devolver `{ url, thumbnailUrl, fileId }`; `sizeBytes` = soma |
| Alterar | `BP:prisma/models/file.prisma`                                                                                          | `thumbnail String?`, `thumbnailKey String?`                                                                                                           |
| Alterar | `BP:src/repositories/File.repository.ts`                                                                                | gravar/ler os campos novos                                                                                                                            |
| Alterar | `BP:src/useCases/uploadUserPhoto.usecase.ts`, `BP:src/useCases/getUserStorageStats.usecase.ts`, `exportUserData`, purge | thumbnail entra na cota, na exportação e no hard-purge (apagar **as duas** chaves)                                                                    |
| Alterar | `BP:scripts/purge-orphan-files.mjs`, `migrate-spaces-*.mjs`                                                             | tratar `thumbnailKey`                                                                                                                                 |
| Novo    | `BP:scripts/backfill-file-thumbnails.mjs` + script npm `files:backfill-thumbnails`                                      | D8: baixa original, gera thumbnail, atualiza `File`; `--dry-run`/`--confirm`                                                                          |
| Alterar | `BP:src/repositories/User.dto.ts`                                                                                       | expor `photoThumbnailUrl` se a UI usar                                                                                                                |
| Alterar | `BP:docs/openapi.yaml`, `BP:docs/adr/002-spaces-private-acl.md`                                                         | campo novo; nota sobre thumbnail privado/assinado                                                                                                     |

**Frontend:**

| Tipo    | Caminho                                                                                                                                                           |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Novo    | `BP:src/lib/image/{compressImageToWebp,cropAndCompress,prepareImageForUpload,sanitizeUploadFileName,resolveFileIdDisplayUrl}.ts` (descartar `compressSticker.ts`) |
| Novo    | `BP:src/design-system/ImageCropModal.tsx` (+ `react-easy-crop`) — item 14                                                                                         |
| Novo    | `BP:src/hooks/useSignedUrlRefresh.ts` — confirmar onde as URLs assinadas expiram na UI                                                                            |
| Alterar | `BP:src/components/auth/ProfileBasicsSection.tsx` / `useProfileForm.ts`                                                                                           | fluxo escolher → recortar → comprimir → enviar |
| Alterar | `BP:src/constants/fileUpload.ts`                                                                                                                                  | limites após compressão                        |
| Alterar | `BP:src/constants/texts/*`                                                                                                                                        | textos do recorte                              |

**Riscos:** (a) `sharp` nativo no deploy (VM/Docker) e no CI (item 16); (b) cota muda de significado ao incluir thumbnail — avisar na doc; (c) rollback manual de upload duplo (testar a falha do segundo `PutObject`); (d) EXIF/orientação (`.rotate()`) e GIF animado (a normalização para WebP estático perde animação — definir se GIF continua aceito).

**Testes:** `imageResize` com fixtures reais pequenas (`tests/fixtures/*.png|jpg`), `File.manager` (rollback, soma de bytes — atualizar `BP:tests/services/File.manager.test.ts`), `compressImageToWebp`, `sanitizeUploadFileName`, `useSignedUrlRefresh` (origem `T:web/tests/...`), script de backfill.

**Critérios de aceite:** avatar enviado vira WebP + thumbnail de 200 px, ambos privados e assinados; falha no segundo upload não deixa objeto órfão; exclusão definitiva apaga as duas chaves; `files:backfill-thumbnails --dry-run` lista os legados.

**Sugestão de quebra:** (1) backend + schema + testes; (2) frontend de recorte; (3) backfill + docs.

---

### Item 8 — PWA e atualização forçada

**Origem (`T:web/`):** `public/sw.js` (475 linhas, `SW_VERSION v12`), `src/app/manifest.ts`, `src/lib/pwa/{webManifest,appUpdate,isPwaInstalled,navigationFallback,trimCache,warmStaticAssets,reusePwaWindow}.ts`, `src/components/pwa/{ServiceWorkerRegistrar,ForceAppUpdate,PwaInstallBanner}.tsx`, `src/app/api/v1/version/route.ts`, `src/constants/app.ts` (`APP_VERSION` lida do `package.json`), `docs/operators/pwa.md`.

**O que faz o `sw.js` do tribal, e o que fica:**

| Bloco do tribal                                                                                                | Boilerplate                                           |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| install/activate/`message SKIP_WAITING`, limpeza de caches antigos                                             | **manter**                                            |
| `/_next/static/` cache-first com teto de entradas; não intercepta em `localhost`                               | **manter** (essencial para DX)                        |
| assets same-origin (imagens/fontes) stale-while-revalidate                                                     | **manter**                                            |
| documentos network-first com fallback offline (documento em cache → shell do locale → `/`)                     | **manter, sujeito a D7**                              |
| `/error.html`, `/theme.js`, `/error-guard.js` pré-cacheados (5xx serve `/error.html`)                          | **manter** (liga com item 12)                         |
| handlers `push` / `notificationclick` + `resolveNotificationUrl`                                               | **manter** (item 7; `link` só relativo e same-origin) |
| imagens dos dados 3D, capas de jogo, retratos de ficha, logos de sistema, `/sounds/*.mp3`, cache `dice-roller` | **remover**                                           |
| prefixo de cache `tribal-*`                                                                                    | `app-*`                                               |

Estimativa: o `sw.js` do boilerplate fica em ~200–250 linhas.

**Arquivos (boilerplate):**

| Tipo    | Caminho                                                                                          | Nota                                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Novo    | `BP:public/sw.js`                                                                                | acima                                                                                                                               |
| Novo    | `BP:src/app/manifest.ts` + `BP:src/lib/pwa/webManifest.ts`                                       | nome/descrição de `APP_NAME`; **descartar `related_applications` autorreferente** do tribal; `display: standalone`, cores de tema   |
| Novo    | `BP:public/pwa-192.png`, `pwa-512.png`, `apple-touch-icon.png`, `favicon.png`                    | **o boilerplate não tem esses ícones** (só `public/img`, `robots.txt`, `theme.js`); precisam de placeholders neutros ou da sua arte |
| Novo    | `BP:src/components/pwa/ServiceWorkerRegistrar.tsx`, `ForceAppUpdate.tsx`, `PwaInstallBanner.tsx` |                                                                                                                                     |
| Novo    | `BP:src/lib/pwa/{appUpdate,isPwaInstalled,navigationFallback,trimCache,warmStaticAssets}.ts`     | `reusePwaWindow` só se o `launch_handler` for mantido                                                                               |
| Novo    | `BP:src/app/api/v1/version/route.ts`                                                             | público, `Cache-Control: no-store`, envelope `ApiPresenter`                                                                         |
| Alterar | `BP:src/constants/app.ts`                                                                        | `export const APP_VERSION = packageJson.version` (precisa `resolveJsonModule`)                                                      |
| Alterar | `BP:next.config.ts`                                                                              | header `/sw.js` com `no-cache, no-store, must-revalidate` (o tribal faz) e, opcional, `Service-Worker-Allowed: /`                   |
| Alterar | `BP:src/config/securityHeaders.ts`                                                               | `worker-src 'self' blob:` **já existe**; `manifest-src` herda `default-src 'self'` — nada a mudar, só testar                        |
| Alterar | `BP:src/app/[locale]/layout.tsx` ou `AppShell.tsx`                                               | montar registrar, `ForceAppUpdate`, banner de instalação; `metadata`: `manifest`, `appleWebApp`, `themeColor`                       |
| Alterar | `BP:docs/openapi.yaml`, `BP:requests/`                                                           | `GET /api/v1/version`                                                                                                               |
| Novo    | `BP:docs/operators/pwa.md`                                                                       | como bumpar versão, depurar SW, limpar cache, política de reload                                                                    |
| Alterar | `BP:src/constants/texts/*`                                                                       | textos do banner de instalação e da atualização                                                                                     |

**`middleware.ts` do boilerplate:** o matcher já exclui caminhos com ponto (`/sw.js`, `/manifest.webmanifest`, `/error.html` ficam fora do next-intl). Nada a mudar.

**Como o forced update funciona:** o cliente consulta `/api/v1/version` a cada 5 min (`VERSION_POLL_MS`); **qualquer string diferente** da `APP_VERSION` embutida no bundle dispara `SKIP_WAITING` + `reload` com atraso de 1800 ms. Consequências: a versão só muda se alguém alterar `version` no `package.json`; todo deploy com versão nova recarrega **todos** os clientes abertos (inclusive com formulário preenchido) — avaliar adiar o reload quando houver input sujo (melhoria; não existe no tribal).

**Riscos e decisões:**

- **D7 (privacidade):** o SW do tribal usa `network-first` para documentos e guarda cópias. Em máquina compartilhada, HTML autenticado em cache sobrevive ao logout. Opções: não cachear documentos de rotas autenticadas, ou limpar os caches de documentos no logout (mensagem `CLEAR_CACHES` ao SW).
- SW defeituoso é difícil de remover: manter a versão (`SW_VERSION`) e o procedimento de rollback documentados.
- Em dev o SW não pode interceptar (`isLocalDevHost`).
- iOS exige instalação para push (item 7).

**Testes:** `appUpdate.test` (`parseServerVersion`, `shouldForceAppUpdate`), `webManifest.test`, `isPwaInstalled`, `navigationFallback`, `ForceAppUpdate` (jsdom), rota `/version`. O `sw.js` em si não tem teste unitário no tribal; um teste do `resolveNotificationUrl` extraído para módulo testável seria uma melhoria.

**Critérios de aceite:** Lighthouse "installable"; segunda visita com rede cortada serve a casca; bump de versão em staging recarrega o cliente em ≤ 5 min; `/sw.js` nunca fica em cache do navegador; logout não deixa HTML autenticado acessível offline (D7).

**Sugestão de quebra:** (1) manifest + ícones + registrar + `/version` + `ForceAppUpdate`; (2) `sw.js` com cache offline; (3) banner de instalação + docs.

---

### Item 7 — Notificações no app e Web Push

**Pré-requisito:** item 8 (SW) e, para o bloqueio em impersonamento, item 5.

**Origem:** `T:core/prisma/models/{notification,pushSubscription}.prisma`; `T:core/src/services/webPush.service.ts` (108); `T:core/src/domains/{push,notification}/*`; use cases `createNotification`, `listNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead`, `getUnreadNotificationsCount`, `registerPushSubscription`, `sendTestPushNotification`, `sendPushBatch`, `sendPushAll`; `T:web/src/app/api/v1/{notifications,push}/*`; `T:web/src/lib/push-client.ts` (150); `T:web/src/lib/push/*`; `T:web/src/components/pwa/{PushAccountSync,WeeklyPushPrompt}.tsx`; `T:web/src/components/tribal/{NotificationsPageClient,NotificationListItem,useNotificationsPolling}`; `T:web/scripts/send-push.mjs`, `send-push-all.mjs`; `T:web/docs/operators/{web-push-vapid,send-push}.md`.

**Modelo de dados (idêntico ao tribal, exceto nomes):**
`Notification { userId, type, title, text, iconUrl?, link?, readAt?, createdAt, updatedAt, deletedAt? }` com índices `[userId, createdAt]` e `[userId, type, createdAt]`; `PushSubscription { userId, endpoint @unique, p256dh, auth, … deletedAt? }` com índice `[userId]`.

**Comportamento do envio (tribal):** `CreateNotificationUseCase` grava a notificação e, se o push estiver configurado e `skipWebPush` não for passado, chama `WebPushService.sendToUser`; **falha de push é logada e engolida** (a notificação persiste). O payload é truncado a 4096 bytes por busca binária. Sem VAPID, push fica desligado e o app segue funcionando. Assinaturas inválidas (404/410) são removidas.

**Arquivos (boilerplate):**

| Tipo    | Caminho                                                                                                                                                                                                                        | Nota                                                                                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novo    | `BP:prisma/models/notification.prisma`, `pushSubscription.prisma`                                                                                                                                                              |                                                                                                                                                                  |
| Novo    | `BP:src/repositories/Notification.repository.ts`, `PushSubscription.repository.ts`                                                                                                                                             | `TransactionClient`; paginação por cursor/`createdAt`                                                                                                            |
| Novo    | `BP:src/services/WebPush/WebPush.service.ts` + `webPush.port.ts`                                                                                                                                                               | lib `web-push ^3.6.7`; tipos (`@types/web-push` ou `.d.ts` próprio como no tribal); 4 KB; limpeza 404/410; `getVapidConfig()` nulo → desligado                   |
| Novo    | `BP:src/useCases/{createNotification,listNotifications,markNotificationAsRead,markAllNotificationsAsRead,getUnreadNotificationsCount,registerPushSubscription,unregisterPushSubscription,sendTestPushNotification}.usecase.ts` | `unregister` não existe no tribal (verificar) — necessário para opt-out; **push é enviado depois do commit** (ADR 007 / `workUnitPhases.ts`), nunca dentro da TX |
| Novo    | `BP:src/controllers/Notification/*`, `BP:src/controllers/Push/*`                                                                                                                                                               |                                                                                                                                                                  |
| Novo    | `BP:src/app/api/v1/notifications/{route.ts,read-all/route.ts,[id]/read/route.ts}`, `…/push/{subscriptions,vapid-public-key,test}/route.ts`                                                                                     | `push/test` só em não-produção ou admin                                                                                                                          |
| Alterar | `BP:src/config/env.ts`                                                                                                                                                                                                         | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (opcionais; push só liga com as três)                                                                   |
| Alterar | `BP:.env.example`, `README.md`, `ci.yml`                                                                                                                                                                                       |                                                                                                                                                                  |
| Alterar | `BP:src/schemas/userSetting.schema.ts`, `BP:src/managers/Settings.manager.ts`                                                                                                                                                  | setting `pushNotificationsEnabled` (boolean; ausente = `true`? **decidir** — o tribal usa 3 booleans de domínio; aqui, 1 genérico)                               |
| Alterar | `BP:public/sw.js`                                                                                                                                                                                                              | `push` + `notificationclick` (item 8)                                                                                                                            |
| Novo    | `BP:src/lib/push-client.ts`, `BP:src/lib/push/notificationPermissionGuide.ts`                                                                                                                                                  | assinar/cancelar, guia de permissão negada                                                                                                                       |
| Novo    | `BP:src/components/pwa/PushAccountSync.tsx`                                                                                                                                                                                    | re-sincroniza a assinatura ao logar                                                                                                                              |
| Novo    | `BP:src/app/[locale]/notifications/page.tsx`, `BP:src/components/notifications/{NotificationsPageClient,NotificationListItem}.tsx`, `useNotificationsPolling.ts`                                                               | lista, marcar lida, marcar todas; badge no sino                                                                                                                  |
| Alterar | `BP:src/components/layout/Sidebar.tsx`, `AppShell.tsx`, `constants/navigation.ts`                                                                                                                                              | sino com contador                                                                                                                                                |
| Alterar | `BP:src/components/settings/GeneralSettingsForm.tsx`                                                                                                                                                                           | toggle de push                                                                                                                                                   |
| Alterar | `BP:src/constants/texts/*`                                                                                                                                                                                                     |                                                                                                                                                                  |
| Novo    | `BP:scripts/send-push.mjs`, `send-push-all.mjs`                                                                                                                                                                                | **D6**; manter validação do payload (`SEND_PUSH_MAX_*`, `isSafeInAppLink`: `link` precisa começar com `/`, sem `//`, `\` ou `:`)                                 |
| Novo    | `BP:docs/operators/web-push-vapid.md`, `send-push.md`                                                                                                                                                                          | geração de chaves (`npx web-push generate-vapid-keys`), rotação                                                                                                  |
| Alterar | `BP:src/useCases/exportUserData`, purge                                                                                                                                                                                        | exportar notificações; apagar notificações **e assinaturas** na exclusão definitiva                                                                              |
| Alterar | `BP:docs/operators/subprocessors-ropa.md`, `transfers.md`, `retention.md`                                                                                                                                                      | serviços de push do navegador (Google/Mozilla/Apple)                                                                                                             |
| Alterar | `BP:docs/openapi.yaml`, `BP:requests/`                                                                                                                                                                                         | todas as rotas                                                                                                                                                   |

**Opcional (D10):** `WeeklyPushPrompt` + `weeklyPushPrompt.ts` — lembrete semanal para ativar push. É decisão de produto; não recomendado como padrão do boilerplate.

**Não portar:** `sendUnreadChatDigest`, `sendGameChatPush`, `sendMapTurnPush`, tipos `GAME_*`/`UNLINKED_DISCORD`, `useNotificationsPolling` acoplado ao chat.

**Segurança:** `link` da notificação só relativo e validado nos **dois** lados (servidor ao criar, SW ao abrir) — risco de open redirect; endpoint de assinatura exige `requireAuth` + `assertNotImpersonation`; `endpoint` e chaves de assinatura são dado pessoal (não exportar `auth`/`p256dh`); `push/test` não pode ficar aberto em produção.

**Testes:** `WebPush.service` (truncamento, 410 remove assinatura, VAPID ausente), use cases (marcar lida só do dono; `markAll`), `isSafeInAppLink`, `push-client` (permissão negada), página de notificações (jsdom), rotas (401, dono).

**Critérios de aceite:** com VAPID configurado, notificação criada gera push no navegador instalado e abre o `link` interno; sem VAPID o app funciona só com sino; cancelar assinatura para o envio; exclusão de conta limpa tudo.

**Sugestão de quebra:** (1) modelo + notificações in-app + sino; (2) Web Push servidor + SW + cliente; (3) scripts operador + docs.

---

### Item 19 — `CONTEXT*.md` e regra de manutenção

**Origem:** `tribalRPGBot/CONTEXT.md` (índice + negócio), `CONTEXT-ARCHITECTURE.md`, `CONTEXT-CODE.md`, `CONTEXT-ENTITIES.md`, `CONTEXT-DS.md`, `CONTEXT-BRAND.md`; regra em `AGENTS.md` (itens "ler o `CONTEXT*.md` da área" e "atualizar na mesma entrega"); `.cursor/rules/issue-workflow.mdc`; `scripts/sync-context-openapi.mjs` + hook `.husky/pre-commit`.

**Proposta para o boilerplate:**

| Arquivo (raiz do boilerplate)             | Conteúdo                                                                                                                                                                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BP:CONTEXT.md`                           | índice (tabela dos arquivos), snapshot (data + versão), papéis (`USER`/`ADMIN`, impersonamento), regras de conta (senha, nickname, e-mail, quarentena de 30 dias, idade), settings aceitas, o que exige rede                       |
| `BP:CONTEXT-ARCHITECTURE.md`              | camadas e DI, bibliotecas, rotas (tabela **gerada à mão a partir do OpenAPI**), upload/Spaces, IA, PWA/offline, borda HTTP de conta, observabilidade; aponta `docs/architecture.md` (D14)                                          |
| `BP:CONTEXT-CODE.md`                      | pastas, repositories e métodos, services, managers e use cases (o inventário que o agente consulta para **reaproveitar**)                                                                                                          |
| `BP:CONTEXT-ENTITIES.md`                  | models Prisma, relações, invariantes; diagrama ER em mermaid; regra "campo novo se documenta no `///` do model"                                                                                                                    |
| `BP:CONTEXT-DS.md`                        | componentes do design system, props, tokens (hoje parte em `.cursor/rules/design-system.mdc` e `/ds-components`)                                                                                                                   |
| **Não criar** `CONTEXT-BRAND.md`          | boilerplate não tem marca; fica como template opcional                                                                                                                                                                             |
| **Não portar** `sync-context-openapi.mjs` | no tribal existe porque o Swagger lê `apps/web/docs/openapi.yaml` (cwd do pacote) e os agentes leem a cópia na raiz. No boilerplate o OpenAPI já está em `BP:docs/openapi.yaml`, caminho único e legível — **sem cópia, sem hook** |

**Conteúdo inicial vem do código atual do boilerplate** (não do tribal): o boilerplate tem 28 use cases, 5 models, 5 repositories etc.; o documento descreve **isso**, e cada item desta etapa acrescenta sua parte na própria PR.

**Regras a copiar para a governança:**

| Arquivo                                                                 | Mudança                                                                                                                           |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `BP:AGENTS.md`                                                          | "Ler o `CONTEXT*.md` da área antes de refinar; atualizar na mesma entrega" + tabela de qual arquivo atualizar por tipo de mudança |
| `BP:CLAUDE.md`                                                          | referência ao `CONTEXT.md` (se o arquivo for ponte para o AGENTS)                                                                 |
| `BP:.cursor/rules/issue-workflow.mdc`, `BP:docs/issue-workflow.md`      | passo "atualizar `CONTEXT*.md`"                                                                                                   |
| `BP:.cursor/rules/pr-review.mdc`, `BP:.github/pull_request_template.md` | item de checklist "CONTEXT da área atualizado" e **bloqueante** quando faltar                                                     |
| `BP:docs/guidelines/GUIA_REVISAO_PR_GERAL.md`                           | idem                                                                                                                              |

**Atenção ao conflito de fontes:** `AGENTS.md`, `docs/architecture.md`, `docs/glossary.md` e o futuro `CONTEXT-*.md` se sobrepõem. Regra proposta: `AGENTS.md` = **processo e regras**; `CONTEXT*.md` = **o que o produto/código é hoje**; `docs/` = **decisões (ADR), guias e runbooks**. Cada fato mora em um lugar só.

**Cuidado do tribal que vale replicar:** snapshot com data no topo de cada arquivo; "Não implementar por inferência" para o que está no ROADMAP; cada arquivo diz quando atualizar.

**Critérios de aceite:** os 5 arquivos existem e batem com o código na data do snapshot (conferir amostra de 10 afirmações contra o código); `AGENTS.md` e templates de PR referenciam; a primeira PR da onda 1 já atualiza `CONTEXT-CODE.md`.

**Quando fazer:** criar o **esqueleto na onda 0** (para as PRs seguintes já atualizarem) e fechar/revisar na onda 4.

---

## 6. Arquivos compartilhados entre itens (onde haverá conflito de merge)

| Arquivo                                                                           | Itens que mexem                | Estratégia                                                                            |
| --------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| `BP:package.json` / `package-lock.json`                                           | 20, 1, 3, 5, 7, 11, 14, 15, 16 | 20 primeiro; depois uma PR por item, lockfile regerado sempre sobre `main` atualizada |
| `BP:.env.example`, `BP:README.md`, `BP:.github/workflows/ci.yml`                  | 1, 7, 16                       | cada PR só acrescenta suas variáveis                                                  |
| `BP:src/config/env.ts`                                                            | 1, 7                           | getters independentes                                                                 |
| `BP:src/container/dependencies.ts`                                                | 1, 5, 7                        | cada PR acrescenta blocos disjuntos                                                   |
| `BP:src/constants/texts/{pt,en,es,types}.ts`                                      | 5, 7, 8, 11, 12, 14            | namespaces separados por item; teste de paridade (item 18) pega divergência           |
| `BP:docs/openapi.yaml`, `BP:requests/`                                            | 5, 7, 8, 11                    |                                                                                       |
| `BP:src/components/layout/{AppShell,Sidebar}.tsx`, `constants/navigation.ts`      | 5, 7, 8                        | **maior risco de conflito**; fazer 5 → 8 → 7 em sequência                             |
| `BP:src/app/[locale]/layout.tsx`                                                  | 8, 12                          |                                                                                       |
| `BP:prisma/models/user.prisma`                                                    | 5                              | só o item 5                                                                           |
| `BP:scripts/cron/jobs/retention-purge.mjs`, `exportUserData`, `deleteUserAccount` | 2, 7, 11                       | cada item estende; testar purge ponta a ponta no fim                                  |
| `BP:next.config.ts`, `securityHeaders.ts`                                         | 8, 11, 12                      |                                                                                       |
| `BP:src/utils/session.ts`, `auth.middleware.ts`                                   | 5, 7                           | 5 primeiro (7 só consome `assertNotImpersonation`)                                    |

---

## 7. Definição de pronto (vale para cada PR da etapa)

1. Issue refinada com este item como base; branch própria; commits contínuos.
2. Typecheck, lint, testes e build verdes; cobertura global não cai.
3. Texto de UI nos três idiomas; teste de paridade (quando existir) verde.
4. `docs/openapi.yaml` + `requests/*.http` + DTO checklist atualizados para rotas novas.
5. `.env.example`, README e CI com env novas.
6. LGPD: exportação, retenção e exclusão cobertas quando houver dado pessoal novo.
7. `CONTEXT*.md` da área atualizado (a partir do item 19).
8. `tasks/lessons.md` atualizado se a PR corrigir um erro que um agente poderia repetir.
9. Nenhum nome de domínio do tribal restou (`grep -ri "tribal\|dungemall\|discord\|sheet\|tenant"` no diff).
10. Review com a label `Reviewed` conforme `pr-review.mdc`.

---

## 8. Riscos gerais da etapa

| Risco                                                  | Mitigação                                                                        |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Upgrade do Prisma (major) quebra algo sutil em Mongo   | item 20 isolado, com smoke de banco real antes de qualquer model novo            |
| Custo e abuso de IA                                    | sem rota pública (D4); flag `ai_enabled`; cota por usuário via `aiLog`           |
| SW com cache incorreto prende usuários em versão velha | `SW_VERSION`, header `no-store` no `/sw.js`, forced update e runbook de rollback |
| Dado pessoal novo sem trilha LGPD                      | regra 8 da seção 4 e item 6 do DoD                                               |
| Impersonamento como vetor de abuso                     | D11, auditoria persistida, 10 min sem renovação, bloqueios 403                   |
| Conflitos de merge em layout/navegação                 | ordem 5 → 8 → 7 e PRs pequenas                                                   |
| Código do tribal levando RPG junto                     | regra 9 da seção 4 e item 9 do DoD                                               |
| Estimativas                                            | são ordem de grandeza; as issues refinadas devem reestimar                       |

---

## 9. Próximo passo sugerido

D1–D4 estão decididas. D3 fechada (default `gpt-5.4-mini`). Falta: decidir as demais (D5–D15, nenhuma bloqueia a onda 0) e confirmar a ordem das ondas. Em seguida, transformar cada item em issue no board seguindo `BP:docs/issue-workflow.md` — uma issue por item (itens G em sub-issues, conforme a "Sugestão de quebra").
