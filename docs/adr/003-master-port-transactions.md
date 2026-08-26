# ADR-003 — Master port com transação Prisma

- **Status:** Aceito (leituras fora de TX — DATA-05 mitigado; storage fora de TX — ver ADR-007)
- **Data:** 2026-08-23

## Contexto

Use cases frequentemente fazem múltiplos writes (User + File + Image). Precisamos de unidade de trabalho consistente e padrão uniforme herdado do boilerplate-backend.

## Decisão

- Todo use case estende `UseCaseMasterPort<Input, Output>`.
- `run()` executa `validate()` e depois `execute()` dentro de `runInTransaction()` (ou `runWithoutTransaction` se `transactional = false`).
- Repositories recebem `Prisma.TransactionClient` via `injectables.prisma`.
- Proibido usar root client dentro de `execute` para writes de domínio na mesma UoW — **exceção:** fases storage documentadas em ADR-007 (`workUnitPhases.ts`).

## Consequências

### Positivas

- Padrão único; mutações multi-write atômicas.
- Logging centralizado por use case.

### Negativas

- **Todas** as operações (incluindo GETs) hoje abrem TX — overhead em leituras (DATA-05). _Mitigado:_ leituras com `transactional = false`.
- Curva de aprendizado para novos contribuidores.

## Referências

- `src/masterPorts/UseCase.masterport.ts`
- `src/managers/Db.manager.ts`
- PERFORMANCE-REPORT (DATA-05)
- `tasks/lessons.md` (TX / root client)
