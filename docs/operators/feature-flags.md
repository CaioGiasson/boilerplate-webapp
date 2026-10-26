# Feature flags

Decisão: [ADR-011](../adr/011-feature-flags-append-only.md).

## Alternar uma flag

```bash
npm run toggle-feature-flag -- ai_enabled
# produção
npm run toggle-feature-flag -- ai_enabled --confirm
```

O script lê o registro mais recente da chave e **insere** um novo com o valor invertido. Flag inexistente conta como desligada, então a primeira execução liga. Nada é apagado.

## Flags conhecidas

| Chave        | Efeito                                     |
| ------------ | ------------------------------------------ |
| `ai_enabled` | Liga o AI Service (`docs/operators/ai.md`) |

Constantes em `FEATURE_FLAGS` (`src/managers/FeatureFlag.manager.ts`). Nome novo = constante nova + linha nesta tabela.

## Propagação

Cada instância guarda o valor por 30 s (`FEATURE_FLAG_CACHE_TTL_MS`). Depois de alternar, espere até 30 s antes de validar em ambiente com várias instâncias.

## Inspecionar o histórico

```js
db.FeatureFlag.find({ key: 'ai_enabled' }).sort({ createdAt: -1 })
```
