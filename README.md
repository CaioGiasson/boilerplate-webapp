# Boilerplate Webapp

Aplicação Next.js 15 reutilizável, extraída e sanitizada a partir do projeto [Vitraux](../vitraux). Inclui autenticação, perfil, configurações, upload para DigitalOcean Spaces, e-mail transacional (Brevo), design system e arquitetura em camadas — **sem regras de negócio de galeria/mosaico**.

## O que está incluído (agnóstico)

- **Arquitetura:** `app/api → controller → useCase → repository | service`
- **Auth:** registro, login, JWT em cookie, Google OAuth, verificação de e-mail, reset de senha
- **Conta:** perfil (foto, nickname, e-mail, senha), sessões ativas, exportação LGPD, exclusão com quarentena de 30 dias
- **Settings:** tema escuro e idioma (pt/en/es via next-intl)
- **Storage:** DigitalOcean Spaces (S3), `FileManager`, presigned URLs, quota por usuário
- **Email:** módulo port/adapter com Brevo
- **Design system:** componentes em `src/design-system/` + primitivos Radix em `src/components/ui/`
- **IA/contribuição:** `AGENTS.md`, `.cursor/rules/`, ADRs e docs de arquitetura

## O que foi removido / sanitizado

- Mosaico, imagens, painéis, Pinterest, visibilidade SECRET/PUBLIC, reports
- Settings de zoom e mosaico global
- Branding e cookies genéricos (`app-*`)
- Campo `hideFromGlobalMosaic` no modelo User

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Prisma + MongoDB
- Zod (validação de entrada)
- Jest (testes)

## Camadas

```
HTTP: app/api → controller → useCase → (services | repositories)
```

Diagrama e regras de dependência: [`docs/architecture.md`](docs/architecture.md).

- Controllers finos: parse/validate HTTP, chamam useCase, montam resposta
- UseCases: regras de domínio e orquestração
- Services: integrações externas
- Repositories: acesso ao Prisma (único lugar permitido)
- Ports: contratos e tipos de domínio

## Desenvolvimento local

**Node.js:** [`22.19.0`](.nvmrc) — use `nvm use` ou equivalente antes de `npm install`.

### 1. Variáveis de ambiente

```bash
cp .env.example .env
```

Gere secrets fortes (nunca use os placeholders do example em runtime):

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 24   # MONGO_ROOT_PASSWORD
```

No `.env`:

- `JWT_SECRET` — mínimo 32 caracteres; o placeholder do example é rejeitado no boot
- `MONGO_ROOT_USERNAME` / `MONGO_ROOT_PASSWORD` — credenciais do admin do Mongo local (você define)
- `DATABASE_URL` — mesma senha do Mongo, porta **`27717`** (host), com `authSource=admin`
- `ENVIRONMENT=dev`

Se a senha tiver `@`, `:`, `/`, etc., codifique **só** na `DATABASE_URL` (`@` → `%40`).

### 2. MongoDB (Docker Compose)

Porta **27717** no host evita conflito com instalações locais do MongoDB na 27017 (comum no Windows).

```bash
npm run mongo:keyfile
docker compose up -d
docker compose ps   # aguardar healthy
npm run prisma:push
npm run healthcheck
```

Guia completo (volume existente sem auth, troubleshooting, VM): [`docs/mongo-auth-setup.md`](docs/mongo-auth-setup.md).

Se você já tinha um volume Docker **sem senha**, siga a seção “Volume existente” do guia **antes** de `docker compose up`.

### 3. App

```bash
npm install
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000).

## Produção

A app Next roda com build estático/server (`next start`). O MongoDB **não** deve ser exposto na internet; use instância gerenciada ou Mongo na mesma rede privada da VM.

### Pré-requisitos

- Node.js LTS compatível com Next 15
- MongoDB com replica set e autenticação (credenciais dedicadas à app)
- DigitalOcean Spaces (ou S3-compatível) configurado
- TLS terminado no reverse proxy (nginx, Caddy, etc.)

### Variáveis obrigatórias

| Variável            | Produção                                               |
| ------------------- | ------------------------------------------------------ |
| `ENVIRONMENT`       | `prod`                                                 |
| `NODE_ENV`          | `production` (definido pelo `next start`)              |
| `DATABASE_URL`      | URL com **user:password@** e `authSource=admin`        |
| `JWT_SECRET`        | ≥32 bytes aleatórios; **não** o placeholder do example |
| `MONGO_ROOT_*`      | Só se o host usar o Compose deste repo; senão omita    |
| `SPACES_*`          | Credenciais e bucket do object storage                 |
| `HEALTHCHECK_TOKEN` | Opcional: permite probe HTTP de fora do loopback       |

Com `ENVIRONMENT=prod`, o boot recusa `DATABASE_URL` sem credencial ou com senha de example.

### Deploy (VM / single node)

```bash
git pull
npm ci
npm run build
npm run healthcheck
npm run start
```

Recomendações:

- Process manager (systemd, PM2) reiniciando `npm run start` na falha
- Proxy HTTPS na frente; cookie `__Host-app-session` exige TLS em production
- Probes de `/api/health*` via `127.0.0.1` ou header `x-healthcheck-token`
- **Não** rode `npm run list-users` nem scripts de operador no host de produção
- Sincronize schema após mudanças: `npm run prisma:push` (ou pipeline equivalente)

O `docker-compose.yaml` deste repositório é para **desenvolvimento local**. Em produção, prefira Mongo gerenciado ou container na rede interna **sem** publicar porta no firewall.

## Credenciais do MongoDB local

As credenciais **não vêm de um serviço externo** — você as define no `.env` ao configurar o ambiente.

| Campo                 | Onde   | Uso                                                               |
| --------------------- | ------ | ----------------------------------------------------------------- |
| `MONGO_ROOT_USERNAME` | `.env` | Usuário admin (padrão: `mongo`)                                   |
| `MONGO_ROOT_PASSWORD` | `.env` | Senha que **você gera** (`openssl rand -base64 24`)               |
| `DATABASE_URL`        | `.env` | Connection string da app/Prisma (mesmo user/senha, porta `27717`) |

**Conectar com mongosh** (dentro do container; porta interna 27017):

```bash
docker exec -it mongo mongosh --port 27017 \
  -u mongo -p '<MONGO_ROOT_PASSWORD>' --authenticationDatabase admin
```

**MongoDB Compass / cliente GUI** (no host):

```
mongodb://mongo:<senha>@127.0.0.1:27717/mongo?replicaSet=rs0&directConnection=true&authSource=admin
```

**Onde ler a senha depois:** apenas no seu `.env` local (gitignored). Não há painel nem vault no projeto — guarde o valor com segurança.

## Endpoints

Contrato completo: [`docs/openapi.yaml`](docs/openapi.yaml). Inventário + smoke: [`requests/`](requests/). Swagger UI (opt-in): `GET /api/docs` com `SWAGGER_ENABLED=true` + Basic (`SWAGGER_USER` / `SWAGGER_PASSWORD`).

| Método    | Rota                           | Descrição                                        |
| --------- | ------------------------------ | ------------------------------------------------ |
| GET       | `/`                            | Tela Hello World / mosaico                       |
| GET       | `/api/health`                  | Healthcheck (loopback ou `HEALTHCHECK_TOKEN`)    |
| GET       | `/api/health/database`         | Healthcheck do MongoDB (mesmo acesso)            |
| GET       | `/api/docs`                    | Swagger UI (gated; desligado por padrão)         |
| GET       | `/api/docs/openapi`            | Spec OpenAPI YAML (mesmo gate)                   |
| GET       | `/api/v1/examples?identifier=` | Recupera/gera Example (somente fora de produção) |
| POST      | `/api/v1/auth/register`        | Cadastro                                         |
| POST      | `/api/v1/auth/login`           | Login                                            |
| POST      | `/api/v1/auth/logout`          | Logout                                           |
| GET       | `/api/v1/auth/me`              | Sessão atual                                     |
| GET       | `/api/v1/nickname/[nickname]`  | 200 se nick existe / 404                         |
| GET/PATCH | `/api/v1/users/[id]`           | Perfil                                           |
| PATCH     | `/api/v1/users/[id]/password`  | Troca de senha                                   |
| PATCH     | `/api/v1/users/[id]/photo`     | Upload de foto                                   |
| PATCH     | `/api/v1/users/[id]/settings`  | Setting key/value                                |

Probes HTTP de `/api/health*` devem ir a `127.0.0.1`/`::1`, ou enviar `HEALTHCHECK_TOKEN` (`x-healthcheck-token` / `Authorization: Bearer`). Query `?token=` não autoriza. `X-Forwarded-For` e `Host: localhost` em production não autorizam. `GET /api/v1/examples` responde 404 quando `NODE_ENV=production`.

Arquivos REST Client em `requests/`. Lista completa de rotas v1 (images, sessions, export, etc.) no OpenAPI e em `requests/README.md`.

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build` — build de produção
- `npm run start` — servidor de produção (após `build`)
- `npm test` — testes
- `npm run check` — prettier + eslint
- `npm run healthcheck` — valida dependências (env, MongoDB, Spaces, JWT)
- `npm run mongo:keyfile` — gera `secrets/mongo-keyfile` (local, gitignored)
- `npm run spaces:make-private -- --dry-run` — lista objetos que teriam ACL alterada para `private`
- `npm run spaces:make-private -- --confirm` — torna privados objetos legados no Spaces (após bucket privado no painel)
- `npm run spaces:migrate-keys -- --dry-run` — lista keys `dev|prod|test/…` que seriam migradas para `{ownerId}/…`
- `npm run spaces:migrate-keys -- --confirm` — CopyObject + atualiza Mongo + DeleteObject (ver `docs/operators/spaces-key-migration.md`)
- `npm run list-users` — ferramenta de operador local (não rodar em produção); lista os 10 usuários mais recentes com e-mail mascarado
- `npm run prisma:push` — sincroniza schema com MongoDB

Guia para agentes: [`AGENTS.md`](AGENTS.md) · Contribuição: [`CONTRIBUTING.md`](CONTRIBUTING.md)

## Fluxo de issues

Regras em [`docs/issue-workflow.md`](docs/issue-workflow.md) (também via `.cursor/rules/issue-workflow.mdc`).
