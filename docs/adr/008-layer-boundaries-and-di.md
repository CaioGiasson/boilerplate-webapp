# ADR-008 — Fronteiras de camadas e singletons de performance

- **Status:** Aceito (substitui a orientação de DI ampla de repositórios)
- **Data:** 2026-08-25
- **Supersede:** versão anterior focada em DI incremental de repositories (ARCH-05/DI-02)

## Contexto

ARCH-05 apontava vazamento de fronteiras (TX/root, storage fora da UoW). DATA-05 e ADR-007 tratam transações e fases de storage. A classe `DbCommander` injetada em todo use case **não** reduzia latência de endpoint — só encapsulava o singleton Prisma e `$transaction`.

Injetar repositories no construtor também **não** melhora performance de endpoint: o custo está no I/O (Mongo/Spaces), e o client Prisma precisa ser o da TX (`injectables.prisma`) ou o root nas fases A/C.

## Decisão

1. **Prisma** — módulo `src/managers/Db.manager.ts` exporta `getPrismaClient`, `runInTransaction`, `runWithoutTransaction` (singleton de processo). Sem classe `DbCommander`.
2. **Master port** — chama essas funções diretamente; use cases **não** recebem DB no construtor.
3. **Repositories** — `new Repo(injectables.prisma)` (ou root via `getRootPrismaClient` / fases ADR-007) **dentro** do `execute`. Não injetar repos “para performance”.
4. **Services pesados** — singletons de processo: `getEmailService()`, `getStorageService()`, `getStorageUrlService()`. Preferir a esses getters em vez de `new` por request.
5. **Composition root** — `dependencies.ts` só cacheia instâncias de use cases (e serviços leves de exemplo). Não é um DI container de repositories.
6. Use cases **não** chamam `getPrismaClient()` direto — ESLint + helpers ADR-007.

## Consequências

### Positivas

- Menos estruturas (`DbCommander` removido); API de DB óbvia.
- Clientes SDK/Prisma reutilizados onde há ganho real.
- Fronteira TX/root permanece explícita via master port + `workUnitPhases`.

### Negativas / residual

- DI-02 “injetar todo repository” deixa de ser meta de performance; se voltar, é só por testabilidade (Importante/opcional), não crítico.
- Ports `EmailPort`/`StoragePort` (DI-04) permanecem backlog de acoplamento, não de latência.

## Referências

- `docs/architecture.md`
- ADR-007 (fases de storage)
- PERFORMANCE-REPORT ARCH-05, DI-02, DI-03
- Issue #131
