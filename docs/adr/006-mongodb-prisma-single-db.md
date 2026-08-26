# ADR-006 — MongoDB único via Prisma

- **Status:** Aceito
- **Data:** 2026-08-23

## Contexto

Dados relacionais-flexíveis (users, images, settings embed) com deploy simples em VM single-node.

## Decisão

- MongoDB como único banco; Prisma ORM com schema modular em `prisma/models/*.prisma`.
- Replica set local via Docker Compose (porta host **27717**).
- Soft delete via `deletedAt` onde aplicável; índices declarados nos models.
- `prisma db push` para sync em dev; operador cuida de prod.

## Consequências

### Positivas

- Schema versionado; types gerados para TS strict.
- Encaixa documentos aninhados (settings KeyValue).

### Negativas

- TX Prisma em Mongo tem semântica diferente de SQL — leituras em TX são questionáveis (DATA-05).
- Migrations formais limitadas vs SQL.

## Referências

- `prisma/models/`
- `README.md` (Mongo auth)
- `docs/mongo-auth-setup.md`
