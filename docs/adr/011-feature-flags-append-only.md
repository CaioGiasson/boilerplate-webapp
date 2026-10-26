# ADR-011 — Feature flags append-only no MongoDB

- **Status:** Aceito
- **Data:** 2026-10-26

## Contexto

Recursos opcionais (como o AI Service) precisam ser ligados e desligados sem novo deploy, com trilha de quem mudou o quê e quando. O `tribalRPGBot` resolveu isso com uma coleção de flags; este ADR traz o desenho para o boilerplate.

## Decisão

- Coleção `FeatureFlag` (`key`, `value` Json, `createdAt`) **somente com inserções**. O valor vigente é o registro **mais recente** da chave; o histórico vira auditoria.
- Chave ausente conta como **desligada**. `jsonValueToBoolean` aceita boolean, número, `"true"`/`"1"` e objeto com `active`/`enabled`/`value`.
- `FeatureFlag.manager` expõe `isFeatureActive(key)` com **cache em memória de 30 s** por instância (o tribal consulta o banco a cada chamada).
- Alteração por operador: `npm run toggle-feature-flag -- <key> [--confirm]`; em produção exige `--confirm`.

## Consequências

### Positivas

- Mudança de comportamento sem deploy; histórico completo por chave.
- Sem dependência externa de serviço de flags.

### Negativas / trade-offs

- Em multi-instância a propagação leva até 30 s (TTL do cache).
- A coleção cresce a cada alternância; o volume esperado é baixo.
- Flags de produto devem ser evitadas no boilerplate: a única prevista é `ai_enabled`.

## Referências

- `src/managers/FeatureFlag.manager.ts`, `src/repositories/FeatureFlag.repository.ts`
- `docs/operators/feature-flags.md`
