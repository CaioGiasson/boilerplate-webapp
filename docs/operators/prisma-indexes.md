# Prisma index migrations

Notes for operators when applying schema index changes (e.g. DATA-02 File indexes, DATA-04 `hideFromGlobalMosaic`).

## Apply schema

```bash
npm run prisma:push
```

Review the Prisma diff before confirming in production. Index builds on large Mongo collections may take minutes and add load — prefer maintenance window or staging first.

## DATA-02 — `File` indexes

Added to `prisma/models/file.prisma`:

- `@@index([ownerId, status])` — orphan jobs, quota by owner, published listings
- `@@index([status])` — retention / orphan sweeps by status

No data backfill required; Mongo creates indexes on existing documents.

## DATA-04 — `User.hideFromGlobalMosaic`

After `prisma:push`, run the backfill so existing opt-outs match `settings.appearInGlobalMosaic`:

```bash
npm run backfill:hide-from-global-mosaic
```

Deploy order: **push schema → backfill → deploy app** (app reads the denormalized field).

## Image text search (product decision)

`ImageRepository.search` uses case-insensitive `contains` on `title` / `description` (regex under the hood on Mongo). This is acceptable for early scale and short queries. If search becomes hot or catalogs grow large:

1. **Short term:** keep `contains`, require minimum query length, cap result pages (already cursor-paginated).
2. **Medium term:** MongoDB Atlas Search or dedicated search service — out of scope unless product accepts external dependency.

Document any change in `PERFORMANCE-ASSESSMENT.md` DATA-02 notes.

## Verify indexes (optional)

In `mongosh`, `db.File.getIndexes()` and `db.User.getIndexes()` should list the new keys after push.
