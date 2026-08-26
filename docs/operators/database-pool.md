# MongoDB connection pool (Prisma)

Guidance for sizing Prisma ↔ MongoDB connections when running **one or more** Node processes (Next.js standalone, PM2, Kubernetes replicas).

## Formula

```
connection_limit_per_instance = floor(Mongo_max_connections × headroom / N_instances)
```

| Symbol                  | Meaning                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `Mongo_max_connections` | Atlas tier limit or self-hosted `maxIncomingConnections` (leave ~20% for ops/monitoring)    |
| `headroom`              | Use **0.7–0.8** so bursts and admin tools do not exhaust the cluster                        |
| `N_instances`           | Number of concurrent Node processes serving HTTP (replicas × workers per pod if applicable) |

**Example (illustrative):** tier allows 500 connections, headroom 0.75, 4 app replicas →  
`floor(500 × 0.75 / 4) ≈ 93` → set `connection_limit=90` per instance.

Do **not** copy a fixed prod number from this doc — use the formula with your tier and replica count.

## Configure in `DATABASE_URL`

Prisma reads pool settings from the Mongo URL query string:

```env
DATABASE_URL="mongodb://USER:PASS@host:27017/mongo?replicaSet=rs0&authSource=admin&connection_limit=10&connect_timeout_ms=5000"
```

| Parameter            | Role                                                 |
| -------------------- | ---------------------------------------------------- |
| `connection_limit`   | Max connections **this process** opens to Mongo      |
| `connect_timeout_ms` | Fail fast when the cluster is unreachable (optional) |

### Suggested starting points (local / single instance)

| Environment | Instances | Starting `connection_limit` |
| ----------- | --------: | --------------------------: |
| Local dev   |         1 |                        5–10 |
| Staging     |       1–2 |                  10–20 each |
| Production  |         N |           Use formula above |

After horizontal scale-out, **divide** the budget by `N`. Re-run the smoke checklist in [multi-instance-smoke.md](./multi-instance-smoke.md).

## Symptoms of misconfiguration

- `MongoServerError: connection pool exhausted` / timeouts under normal load
- Mongo connection count ≈ `N_instances × connection_limit` approaching tier cap
- Slow queries that correlate with deploys adding replicas (forgot to lower per-instance limit)

## Related

- [multi-instance-smoke.md](./multi-instance-smoke.md) — SCALE-04 smoke with 2 processes
- [prisma-indexes.md](./prisma-indexes.md) — index migrations (DATA-02)
- Issue #127 (SCALE-02) — distributed rate limit (separate from pool sizing)
