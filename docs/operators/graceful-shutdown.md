# Graceful shutdown (REL-03)

App registers SIGTERM/SIGINT handlers in `src/instrumentation.ts` via `registerGracefulShutdown()`.

## Behavior

1. Process receives SIGTERM (Kubernetes pod delete, `docker stop`, PM2 reload) or SIGINT (Ctrl+C local).
2. Logs `Graceful shutdown: received …`
3. Calls `prisma.$disconnect()` on the singleton client
4. Exits with code 0

Edge runtime (`NEXT_RUNTIME=edge`) skips registration.

## Kubernetes

```yaml
spec:
    terminationGracePeriodSeconds: 30
    containers:
        - name: boilerplate-webapp
          lifecycle:
              preStop:
                  exec:
                      command: ['sh', '-c', 'sleep 5']
```

- Ensure readiness fails before SIGTERM so the Service stops sending new traffic.
- `preStop` sleep is optional — gives the LB time to drain; adjust per platform.

## Next.js standalone

The handler runs in the Node server process started by `next start`. No extra config required beyond deploying a build that includes `instrumentation.ts`.

## What is not covered

- In-flight HTTP requests are not explicitly awaited (Next does not expose a global drain hook). Rely on platform drain + short `preStop`.
- Background cron jobs are separate processes (`scripts/cron/`).
