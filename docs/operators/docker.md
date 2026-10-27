# Docker (imagem de produção)

Arquivos: [`Dockerfile`](../../Dockerfile), [`.dockerignore`](../../.dockerignore), [`docker-compose.app.yaml`](../../docker-compose.app.yaml). O `docker-compose.yaml` continua sendo só o Mongo de desenvolvimento.

> **Status:** a imagem foi escrita e revisada, mas **não foi construída** no ambiente onde nasceu (sem daemon Docker). Valide `docker build` e o `docker compose up` na primeira vez e corrija o que aparecer. O `CMD` e o healthcheck foram exercitados localmente contra o build do Next.

## Decisões

- **Sem `output: 'standalone'`.** A imagem mantém `npm` e `node_modules` de produção porque os scripts de operador e o CronJob (`deploy/cron/`, `npm run cron -- retention-purge`) rodam dentro dela.
- **Debian (`bookworm-slim`), não Alpine.** `sharp` e `argon2` trazem binários nativos para glibc. `openssl` é exigido pelo engine do Prisma.
- **Multi-stage:** `deps` → `build` (`npm run build`: `prisma-merge`, `prisma generate`, `next build`) → `prod-deps` (`npm ci --omit=dev`) → `runtime`. O client Prisma gerado vem do `build`.
- **`node` direto no `CMD`**, não `npm start`: o SIGTERM chega ao Next e dispara o [graceful shutdown](graceful-shutdown.md). Use `--init` (o compose já usa `init: true`).
- **Usuário `node`** (não root). **Healthcheck:** `GET /api/ping`, público e sem banco.
- **Build sem segredos.** O `RUN` do build usa valores falsos só para passar a validação de env; nada disso fica na imagem. Segredos reais entram em **runtime** (`env_file`, secret do orquestrador).
- **`.env` nunca entra na imagem** (`.dockerignore`).

## Subir app + Mongo (VM única)

```bash
npm run init-project -- --name "Meu Sistema" --env --confirm   # gera .env com segredos aleatórios
npm run mongo:keyfile
docker compose -f docker-compose.yaml -f docker-compose.app.yaml up -d --build
docker compose -f docker-compose.yaml -f docker-compose.app.yaml ps
```

No compose, `DATABASE_URL` é sobrescrito para `mongo1:27017` (o `.env` aponta para `localhost:27717`, que só vale no host). A senha do Mongo no `.env` precisa ser segura para URL; a gerada pelo `init-project` já é.

Sincronize o schema (`npm run prisma:push`) **do host**, apontando para a porta publicada do Mongo: a imagem de produção não traz o CLI do Prisma.

## Variáveis em runtime

As mesmas do `.env.example`. Em produção: `ENVIRONMENT=prod`, `EMAIL_PROVIDER=brevo` (+ `BREVO_API_KEY`, `EMAIL_FROM`), `APP_BASE_URL` com a origem pública (HTTPS) e `SPACES_*`. Sem isso o boot recusa subir.

## Scripts de operador e cron na imagem

```bash
docker run --rm --env-file .env app:latest npm run cron -- retention-purge --dry-run
```

O manifesto [`deploy/cron/cronjob-retention-purge.yaml`](../../deploy/cron/cronjob-retention-purge.yaml) usa esta imagem (`workingDir: /app`).

## Limites conhecidos

- Uma instância apenas ([`docs/known-issues/scalability.md`](../known-issues/scalability.md)).
- `.next/cache` fica dentro do container; reinicia vazio.
- Sem CI de build da imagem ainda.
