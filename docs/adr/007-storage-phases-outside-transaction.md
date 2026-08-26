# ADR-007 — Fases storage / Mongo (COUP-03)

- **Status:** Aceito
- **Data:** 2026-08-24

## Contexto

DigitalOcean Spaces **não participa** do rollback de `$transaction` do Prisma/Mongo. `FileManager` persiste metadados em `File` e objetos no bucket. Misturar `DbCommander.getClient()` (root) e `injectables.prisma` (TX) no mesmo use case sem regra explícita gerava achados COUP-03 e confusão sobre “unidade de trabalho”.

Uploads (avatar, imagem) **de propósito** gravam File no root: se o update de domínio na TX falhar, o registro `File` + estado orphan deve **persistir** para limpeza — dentro da TX o rollback apagaria o metadado e deixaria objeto órfão no Spaces.

## Decisão

Modelar mutações que tocam Spaces em **fases nomeadas**:

| Fase                | Cliente                      | Quando                                   |
| ------------------- | ---------------------------- | ---------------------------------------- |
| **A — storage**     | Root (`getRootPrismaClient`) | Upload, DeleteObject, orphan de File     |
| **B — domínio**     | TX (`injectables.prisma`)    | User, Image, SessionEvent, etc.          |
| **C — compensação** | Root                         | Se B falhar após upload (orphan URL/key) |

Helpers em `src/utils/workUnitPhases.ts`:

- `runStorageUploadThenTransaction` — create image / upload avatar
- `runStorageSideEffectThenTransaction` — delete account (Spaces antes, anonimização na TX)
- `runTransactionThenStorageCleanup` — delete image (soft-delete na TX, Spaces depois)

**Regra:** use cases **não** chamam `getPrismaClient()` diretamente — só via helpers acima ou leitura pré-TX documentada (ex. validar senha em delete account).

`UseCaseMasterPort.transactional = false` nos use cases que orquestram fases manualmente (evita TX vazia envolvendo phase A).

## Consequências

### Positivas

- Semântica explícita; orphans rastreáveis; alinhado a ADR-002 (bucket privado).
- COUP-03 endereçado sem falso “cliente único” que piora consistência Spaces.

### Negativas

- Dois caminhos de cliente Prisma no mesmo fluxo (aceito e documentado).
- Delete de conta: fase A irreversível mesmo se B falhar (operador trata via cron/purge).

## Referências

- ADR-002, ADR-003
- `src/utils/workUnitPhases.ts`
- PERFORMANCE-REPORT COUP-03
- Issues #130
