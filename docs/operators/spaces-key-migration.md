# Migração de keys legadas no Spaces (SEC-C02 residual)

## Formato

| Legado                                    | Novo                                  |
| ----------------------------------------- | ------------------------------------- |
| `{env}/images\|avatars/{hex curto}.{ext}` | `{ownerId}/{category}/{32 hex}.{ext}` |

Exemplos: `dev/images/ab12cd34.jpg` → `507f…/images/a1b2…ff.jpg`.

## Uso

```bash
# Lista o que seria migrado (sem mutar Spaces nem Mongo)
npm run spaces:migrate-keys -- --dry-run

# Executa CopyObject + update Mongo + DeleteObject da key antiga
npm run spaces:migrate-keys -- --confirm
```

Requer `.env` com `SPACES_*` e `DATABASE_URL` apontando ao Mongo da conta.

## Comportamento

1. Seleciona `File` cuja `key` casa com `dev|prod|test` + `images|avatars`.
2. Resolve `ownerId` do File ou, se ausente, via `Image.fileId`.
3. Sem owner → **skip** (não inventa prefixo).
4. Com `--confirm`: copia objeto (ACL `private`), atualiza `File` / `Image.url` / `User.photoUrl`, apaga a key antiga.
5. Segunda execução é idempotente para keys já no formato novo.

## Cuidados

- Rodar dry-run primeiro e revisar skips.
- Falha no meio: a key nova pode existir no Spaces sem Delete da antiga — reexecutar ou limpar manualmente o órfão.
- Objetos só no bucket (sem linha `File`) não entram neste script.
