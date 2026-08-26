# Planejamento: Críticos do PERFORMANCE-REPORT

> Gerado em 2026-08-21. Refinamento dos 8 itens críticos para issues no board Vitraux (project 3).

**Label:** `enhancement` (existente). Sugestão futura: label dedicada `performance`.

**Repositório:** `CaioGiasson/vitraux` (único).

**Referências:** `PERFORMANCE-ASSESSMENT.md`, `PERFORMANCE-REPORT.md`.

---

## Ordem recomendada de implementação

1. CI-02 → CI-04 (rede de segurança; CI-04 depende de CI-02 existir)
2. DATA-05 + COUP-03 (unidade de trabalho; ARCH-05 parcial)
3. DATA-04 (hot path mosaico)
4. DATA-07 (presign)
5. SCALE-02 (antes de multi-instância)
6. ARCH-05 (fecha fronteiras restantes após DATA-05/COUP-03; DI-02 fica Important separado)

---

## DATA-04 — Opt-out mosaico sem scan O(n)

### Objetivo

Eliminar `listIdsHiddenFromGlobalMosaic` que faz `findMany` de todos os users ativos e filtra `appearInGlobalMosaic === false` em memória no hot path `scope=all`.

### Contexto técnico

- Chamado em `listUserImages.usecase.ts` quando `!ownerId` (feed global).
- Setting: `SETTINGS_KEYS.APPEAR_IN_GLOBAL_MOSAIC` via `SettingsManager`.
- UI: `GeneralSettingsForm.tsx`.

### Abordagem aceita

Denormalizar para consulta indexável, **sem** carregar todos os users:

**Opção A (preferida):** ao alterar o setting, gravar/atualizar campo denormalizado consultável — ex. lista/coleção de `userId` opt-out, ou flag em documento auxiliar indexado; na search usar `excludeOwnerIds` já existente populado por query `where setting=false` **sem** trazer `settings` de todo mundo (ex.: índice parcial / campo `hideFromGlobalMosaic: Boolean` no User).

**Opção B:** denormalizar em cada `Image` (`appearInGlobalMosaic` espelhado do owner) e filtrar na query de Image — mais writes no setSetting.

Aceite mínimo: Opção A com campo booleano no User + índice + backfill.

### Critérios de aceite

- [ ] `listIdsHiddenFromGlobalMosaic` não faz full scan de users+settings em memória
- [ ] Feed `scope=all` continua respeitando opt-out
- [ ] Toggle no settings atualiza o índice/campo denormalizado
- [ ] Script/backfill para users existentes
- [ ] Teste unitário do repositório/use case com N users (mock) provando que a query não depende de carregar todos os settings

### Fora de escopo

Cache Redis do mosaico (CACHE-01).

---

## DATA-05 — Transação só quando necessário

### Objetivo

Parar de envolver **toda** execução de use case em `$transaction` (`UseCase.masterport.ts` → `DbCommander.startTransaction`).

### Abordagem

- Leituras (list/get/export read paths): `execute` com `PrismaClient` / client sem TX.
- Mutações multi-write: manter `$transaction`.
- Mecanismo sugerido: método `runRead` vs `run` / flag `requiresTransaction` no use case / override `protected transactional = false`.

### Critérios de aceite

- [ ] Listagens (`ListUserImages`, get image, me, list sessions, etc.) não abrem `$transaction`
- [ ] Mutações que escrevem múltiplos aggregates continuam atômicas
- [ ] Testes dos use cases de listagem/mutação passam
- [ ] Doc curta no master port explicando a regra

### Dependências

Alinha com COUP-03 (mesmo épico mental; issues separadas mas implementar DATA-05 antes ou junto de COUP-03).

---

## DATA-07 — Fan-out de presign na listagem

### Objetivo

Reduzir N `getSignedUrl` síncronos por página (`StorageUrlService.withSignedImageEntities` → `Promise.all`).

### Abordagem aceita (mínima)

Cache em memória (processo) ou Map com TTL = min(presign TTL − skew, constante), chave = `canonicalUrl` ou storage key. Hit reutiliza URL assinada ainda válida.

### Alternativas (não obrigatórias neste aceite)

- Endpoint lazy `GET /images/:id/content-url`
- Batch S3 (se SDK permitir — geralmente não para GetObject presign)

### Critérios de aceite

- [ ] Listagem de até 40 itens não chama presign de novo para a mesma key dentro do TTL
- [ ] Authz permanece antes de expor URL (já é o caso no use case)
- [ ] TTL respeita `STORAGE_PRESIGN_TTL_*` com margem de segurança
- [ ] Teste do cache (hit/miss/expiração)
- [ ] Documento residual: cache in-process não compartilha entre réplicas (ok até CACHE-01/Redis)

### Fora de escopo

CDN edge (SCALE-03).

---

## SCALE-02 — Rate limit distribuído

### Objetivo

Substituir (ou complementar) `InMemoryRateLimiter` por store compartilhado quando houver multi-instância.

### Abordagem

- Manter interface `RateLimiter.consume(key)`
- Impl Redis quando `REDIS_URL` (ou similar) definido
- Fallback: in-memory em development / single-node
- Mesma semântica: 5/60s, lockout progressivo, `Retry-After`
- Documentar em `.env.example` e `docs/` se necessário
- Docker Redis **opcional** (não obrigatório no compose se o aceite for “funciona com REDIS_URL”)

### Critérios de aceite

- [ ] Com duas instâncias apontando ao mesmo Redis, o limite é global (teste manual ou automatizado documentado)
- [ ] Sem Redis, comportamento atual preservado
- [ ] Rotas auth existentes inalteradas na API externa
- [ ] Testes unitários do limiter Redis mockados + in-memory regressão

---

## CI-02 — Pipeline GitHub Actions

### Objetivo

Criar `.github/workflows/ci.yml` em PR (e push main).

### Jobs mínimos

`npm ci` → lint → typecheck (ver CI-03 no Important; incluir script se faltar) → `npm test` → `npm run build`

### Critérios de aceite

- [ ] Workflow existe e roda em `pull_request`
- [ ] Falha de test/lint quebra o check
- [ ] Documentado no README (uma linha) se necessário

### Relação

CI-04 = branch protection exigindo esse check (issue irmã).

---

## CI-04 — Gate de merge

### Objetivo

Build+test obrigatórios no merge para `main` via branch protection.

### Critérios de aceite

- [ ] Branch protection em `main` exige o check do workflow CI-02
- [ ] Documentado para o operador (README ou `docs/operators/ci.md`) — settings do GitHub são manuais
- [ ] Depende de CI-02 merged

### Nota

Parte do aceite é **configuração no GitHub** (UI), não só código. A issue cobre o checklist operacional + link do workflow.

---

## COUP-03 — Um cliente DB por unidade de trabalho

### Objetivo

Eliminar mistura `injectables.prisma` (TX) + `DbCommander.getClient()` (root) no mesmo use case (ex. `FileManager.create(DbCommander.getClient())` em create/upload image; `deleteUserAccount`).

### Critérios de aceite

- [ ] `FileManager` / uploads recebem o `TransactionClient` (ou PrismaClient) da unidade de trabalho atual
- [ ] Nenhum use case em TX usa `getClient()` para writes relacionados
- [ ] Exclusão de conta e create image permanecem corretos (teste)
- [ ] Lista dos call sites corrigidos no PR

### Relação

Complementa DATA-05; não inclui DI completo de repositories (DI-02).

---

## ARCH-05 — Fronteiras de camada sem vazamento (escopo crítico)

### Objetivo

Fechar os vazamentos **críticos** de fronteira já evidenciados: TX global indevida, root client fora da UoW, `new Service()` ad hoc no hot path de listagem na medida em que bloqueie DATA-05/COUP-03/DATA-07.

### Escopo desta issue (crítico)

- [ ] Após DATA-05+COUP-03: master port documentado; sem root client em mutações TX
- [ ] `StorageUrlService` na listagem: ou injetável ou factory estável (mínimo: não criar efeitos colaterais de DB)
- [ ] Atualizar `PERFORMANCE-ASSESSMENT` ARCH-05 → ✅ **somente** se os vazamentos críticos acima fecharem
- [ ] Explicitar residual: DI-02/COUP-02/DI-04 continuam **Importantes** (issues futuras)

### Fora de escopo

Injeção completa de todos os repositories (DI-02).

---

## Issues a criar (1:1 com IDs críticos)

| Código   | Título sugerido                                                                       |
| -------- | ------------------------------------------------------------------------------------- |
| DATA-04  | `[PERFORMANCE] DATA-04 — Opt-out do mosaico global sem scan O(n) de users`            |
| DATA-05  | `[PERFORMANCE] DATA-05 — Transações Prisma só em mutações que precisam`               |
| DATA-07  | `[PERFORMANCE] DATA-07 — Reduzir fan-out de presign na listagem de imagens`           |
| SCALE-02 | `[PERFORMANCE] SCALE-02 — Rate limit de auth compartilhado entre instâncias`          |
| CI-02    | `[PERFORMANCE] CI-02 — Pipeline GitHub Actions (lint/typecheck/test/build)`           |
| CI-04    | `[PERFORMANCE] CI-04 — Branch protection: CI obrigatório no merge em main`            |
| COUP-03  | `[PERFORMANCE] COUP-03 — Um cliente DB por unidade de trabalho (sem root fora da TX)` |
| ARCH-05  | `[PERFORMANCE] ARCH-05 — Fechar vazamentos críticos de fronteira de camada`           |
