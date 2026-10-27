# syntax=docker/dockerfile:1
#
# Imagem de produção. Mantém `npm` e `node_modules` de produção (sem `output: standalone`) porque os
# scripts de operador e o CronJob (`npm run cron -- retention-purge`) rodam dentro da mesma imagem.
# Guia: docs/operators/docker.md

ARG NODE_VERSION=22.19.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
# openssl: exigido pelo engine do Prisma. Debian (glibc) em vez de Alpine por causa dos binários nativos (sharp, argon2).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Todas as dependências (inclui as de build).
FROM base AS deps
COPY package.json package-lock.json ./
# `prepare` roda o husky, que não existe sem .git.
RUN npm pkg delete scripts.prepare && npm ci

# Build: gera o client Prisma e o bundle do Next.
FROM deps AS build
COPY . .
# Valores só para o build passar a validação de env; não vão para a imagem final (RUN, não ENV).
RUN DATABASE_URL="mongodb://build:build@127.0.0.1:27017/build" \
    JWT_SECRET="build-time-jwt-secret-minimum-32-characters" \
    CACHE_LIFETIME_SECONDS=3600 \
    SPACES_ENDPOINT=nyc3.digitaloceanspaces.com \
    SPACES_BUCKET=build \
    SPACES_ACCESS_KEY_ID=build \
    SPACES_SECRET_ACCESS_KEY=build \
    ENVIRONMENT=dev \
    EMAIL_PROVIDER=none \
    AI_PROVIDER=none \
    npm run build

# Só dependências de produção.
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm pkg delete scripts.prepare && npm ci --omit=dev && npm cache clean --force

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    SERVER_PORT=3000

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
# Client Prisma gerado no build (o `npm ci --omit=dev` não gera o do schema do projeto).
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/package.json /app/tsconfig.json /app/next.config.ts ./
# `next.config.ts` importa `src/config/securityHeaders` em runtime.
COPY --from=build --chown=node:node /app/src/config ./src/config
# Lidos em runtime: textos legais e o contrato OpenAPI (Swagger).
COPY --from=build --chown=node:node /app/content ./content
COPY --from=build --chown=node:node /app/docs/openapi.yaml ./docs/openapi.yaml
# Scripts de operador e cron.
COPY --from=build --chown=node:node /app/scripts ./scripts

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/ping').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# `node` direto (não `npm start`): SIGTERM chega ao Next e dispara o graceful shutdown.
CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0"]
