# ADR-002 — Bucket Spaces privado + presigned URLs

- **Status:** Aceito
- **Data:** 2026-08-23

## Contexto

Fotos e avatares não devem ser publicamente enumeráveis. URLs legadas eram previsíveis (`dev/images/…`). LGPD e SECURITY exigem controle de acesso.

## Decisão

- Bucket DigitalOcean Spaces configurado **privado** no painel.
- Upload via `Storage.service` com ACL `private` e key `{ownerId}/{category}/{hash}.{ext}`.
- Download para usuário autorizado via **presigned URL** (TTL curto).
- Script `spaces:make-private` migra objetos legados; `spaces:migrate-keys` normaliza prefixos.

## Consequências

### Positivas

- Objetos não listáveis publicamente.
- Owner-scoped keys facilitam purge e auditoria.

### Negativas

- Latência extra (N presigns por página de listagem — ver PERFORMANCE-REPORT).
- Migração one-shot necessária para legado.

## Referências

- `src/services/Storage/Storage.service.ts`
- `docs/operators/spaces-key-migration.md`
- SECURITY-REPORT (SEC-C02)

## Atualização (2026-10-26) — thumbnail e normalização de imagem

Todo avatar enviado passa pelo `SharpImageProcessor` (`src/services/Storage/imageProcessor.ts`): é normalizado para WebP (quadrado de 512 px) e ganha um **thumbnail WebP de 200 px** em `{hash}.thumb.webp`, ao lado do objeto principal. Ambos ficam no bucket privado e são entregues por URL assinada (`User.photoUrl` e `User.photoThumbnailUrl`). O `File` guarda `thumbnailKey`/`thumbnailUrl`; `sizeBytes` soma os dois e conta na cota. Exclusão e `retention-purge` apagam as duas chaves. Ver `docs/operators/images.md`.
