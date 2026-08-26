# Architecture Decision Records (ADR)

Decisões arquiteturais curtas do Vitraux. Formato: Contexto → Decisão → Consequências.

## Índice

| ADR                                                  | Título                                    |
| ---------------------------------------------------- | ----------------------------------------- |
| [ADR-001](001-jwt-session-cookies.md)                | Sessão JWT em cookie HTTP-only            |
| [ADR-002](002-spaces-private-acl.md)                 | Bucket Spaces privado + presigned URLs    |
| [ADR-003](003-master-port-transactions.md)           | Master port com transação Prisma          |
| [ADR-004](004-i18n-next-intl-catalogs.md)            | i18n com next-intl e catálogos TypeScript |
| [ADR-005](005-email-brevo-transactional.md)          | E-mail transacional via Brevo             |
| [ADR-006](006-mongodb-prisma-single-db.md)           | MongoDB único via Prisma                  |
| [ADR-007](007-storage-phases-outside-transaction.md) | Fases storage / Mongo (COUP-03)           |
| [ADR-008](008-layer-boundaries-and-di.md)            | Fronteiras de camadas e DI incremental    |
| [ADR-010](010-google-oauth.md)                       | Login Google OAuth (Authorization Code)   |

## Template

Copie [`template.md`](template.md) para novo ADR numerado.

## Status

- **Aceito** — em produção ou adotado no código atual
- **Substituído** — ver ADR que referencia
- **Proposto** — em discussão
- [009 — Mosaic img vs next/image](009-mosaic-native-img-vs-next-image.md)
