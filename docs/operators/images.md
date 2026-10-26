# Pipeline de imagem (sharp)

Contexto: [ADR-002](../adr/002-spaces-private-acl.md) (bucket privado + URL assinada) e [ADR-007](../adr/007-storage-phases-outside-transaction.md).

## O que acontece no upload

1. O cliente recorta a foto (`ImageCropModal`, quadrado) e envia WebP/PNG.
2. `FileManager` chama o `SharpImageProcessor`:
    - recusa o que não for JPEG, PNG, WebP ou GIF (SVG e outros são recusados mesmo com mime de imagem);
    - limita a 40 milhões de pixels decodificados (proteção contra decompression bomb);
    - aplica a orientação EXIF, normaliza para WebP e gera o thumbnail de 200 px;
    - avatar: quadrado de 512 px recortado ao centro. Galeria: cabe em 1600 px, sem ampliar.
3. Sobem dois objetos: `{ownerId}/{categoria}/{hash}.webp` e `{hash}.thumb.webp`. Se o thumbnail falhar, o principal é apagado e o `File` vira `failed`.
4. `File.sizeBytes` = principal + thumbnail (**conta na cota de 1 GiB**).

GIF animado vira WebP estático (primeiro quadro).

## Dados

| Campo                          | Onde   | Observação                                                  |
| ------------------------------ | ------ | ----------------------------------------------------------- |
| `thumbnailKey`, `thumbnailUrl` | `File` | Ausentes em arquivos anteriores ao pipeline                 |
| `photoThumbnailUrl`            | `User` | Ausente em avatares antigos; a UI usa `photoUrl` nesse caso |

## Arquivos legados: backfill

```bash
npm run files:backfill-thumbnails -- --dry-run
npm run files:backfill-thumbnails -- --confirm
```

Baixa o original, gera o thumbnail, envia ao Spaces e só então atualiza o Mongo. Idempotente; falhas ficam para a próxima execução. O tamanho do thumbnail passa a contar na cota do titular.

## Exclusão e retenção

- Remover a foto do perfil zera `photoUrl` e `photoThumbnailUrl` e marca o `File` como orphan; o `retention-purge` apaga **as duas chaves** depois de 7 dias.
- A exclusão definitiva da conta apaga as duas chaves de cada arquivo e anula `photoThumbnailUrl`.

## Deploy

`sharp` usa binário nativo. O `package-lock.json` já lista os binários Linux (`@img/sharp-linux-x64`); se o `npm ci` do CI ou do host falhar por binário ausente, veja o item de CI no refinamento (`docs/issues/porte-tribal-etapa-1.md`, item 16).
