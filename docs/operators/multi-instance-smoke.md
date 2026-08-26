# Multi-instance smoke (SCALE-04)

Validates that two Node processes behind the same origin behave correctly for **JWT session**, **rate limits**, and a **basic upload** path.

> Rate limits are **in-memory per process** until #127 (Redis). With 2 replicas, effective auth/image quotas are roughly **2×** the documented per-instance limits.

## Prerequisites

- MongoDB and env configured (see root `README.md`)
- Production build: `npm run build`
- `curl` and `jq` (optional, for JSON)

## Option A — npm script (two ports)

Terminal 1:

```bash
PORT=3000 npm run start
```

Terminal 2:

```bash
PORT=3001 npm run start
```

Terminal 3 — run smoke:

```bash
npm run smoke:multi-instance
```

Or with custom bases:

```bash
BASE_URL_A=http://127.0.0.1:3000 BASE_URL_B=http://127.0.0.1:3001 npm run smoke:multi-instance
```

## Expected results

| Check      | Pass criteria                                                                            |
| ---------- | ---------------------------------------------------------------------------------------- |
| Health     | Both `/api/health` return 200                                                            |
| Login A    | POST login on A sets `Set-Cookie` session                                                |
| Session B  | GET `/api/v1/users/me` on **B** with same cookie → 200 (JWT, no sticky session)          |
| Rate limit | 6 rapid login attempts on same IP → at least one 429 with `Retry-After` on that instance |
| List       | GET `/api/v1/images?scope=all` on both → 200                                             |
| Upload     | Authenticated POST create image on A → 201 (optional if test credentials provided)       |

## Option B — manual checklist

1. Register or use a test user on instance A; confirm cookie `app_session` (name per env).
2. Copy cookie to request against instance B `/api/v1/users/me` — must succeed.
3. Hammer login 6× in 1 minute — expect 429 on the instance receiving traffic.
4. Upload a small image on A; list `scope=mine` on B — new image visible after write concern (may need short wait).

## Connection pool

When running 2+ instances, set `connection_limit` per [database-pool.md](./database-pool.md) so total connections stay under Mongo tier cap.

## Graceful shutdown (REL-03)

On SIGTERM, each Node process disconnects Prisma before exit (`instrumentation.ts`). In Kubernetes, set `terminationGracePeriodSeconds` ≥ 30 and rely on load balancer drain; optional `preStop` sleep 5s if LB propagation is slow.
