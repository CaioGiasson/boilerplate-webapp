# MongoDB com autenticação (SEC-C03)

Guia para o MongoDB do Docker Compose: replica set `rs0`, `--auth`, keyfile e porta publicada **somente** em `127.0.0.1:27717` (host → container `27017`).

Usamos **27717** no host para não conflitar com instalações locais do MongoDB (comum no Windows em `27017`). Dentro do container o Mongo continua na porta padrão `27017`.

Produção na VM não deve expor a porta do Mongo na internet; use rede interna ou socket local. TLS entre app e DB fica fora do escopo deste compose (recomendado se o DB não for localhost).

---

## Pré-requisitos

- Docker e Docker Compose
- `.env` copiado de `.env.example`
- `openssl` (ou equivalente) para gerar senhas

---

## 1. Gerar senha e preencher `.env`

```bash
openssl rand -base64 24
```

No `.env`:

```env
MONGO_ROOT_USERNAME="vitraux"
MONGO_ROOT_PASSWORD="<senha-gerada>"
DATABASE_URL="mongodb://vitraux:<senha-gerada>@localhost:27717/vitraux?replicaSet=rs0&directConnection=true&authSource=admin"
```

**URL-encoding:** se a senha tiver `@`, `:`, `/`, `?`, `#`, `[`, `]`, `%` ou espaços, codifique na `DATABASE_URL` (ex.: `@` → `%40`). O valor literal em `MONGO_ROOT_PASSWORD` continua sem encoding.

O Compose lê `MONGO_ROOT_USERNAME` e `MONGO_ROOT_PASSWORD` para o healthcheck e para criar o root na **primeira** inicialização de um volume vazio.

---

## 2. Gerar o keyfile (replica set + auth)

```bash
npm run mongo:keyfile
```

Isso cria `secrets/mongo-keyfile` (gitignored). O arquivo é montado em `/etc/mongo-keyfile` no container.

No Linux, permissões `400` são aplicadas automaticamente. No Windows com Docker Desktop, o bind mount costuma funcionar mesmo sem `chmod`; se o Mongo recusar o keyfile, ajuste permissões no WSL ou gere o arquivo dentro do WSL.

---

## 3. Subir o MongoDB

```bash
docker compose up -d
```

Aguarde o healthcheck (`docker compose ps`). O script interno inicia o replica set `rs0` se ainda não existir.

Teste manual (porta **dentro** do container; no host a app usa `27717`):

```bash
docker exec -it vitraux_mongo mongosh --port 27017 \
  -u vitraux -p '<senha>' --authenticationDatabase admin \
  --eval "db.adminCommand({ ping: 1 })"
```

---

## 4. Sincronizar Prisma e validar app

```bash
npm install
npm run prisma:push
npm run healthcheck
npm run dev
```

---

## Volume existente (sem autenticação)

Se você já usava o Compose **sem** `--auth` e o volume `mongo1_data` tem dados, `MONGO_INITDB_*` **não** cria o usuário de novo. Siga esta ordem **antes** de subir o compose com auth:

### A. Mongo ainda rodando sem auth (compose antigo)

1. Pare o container se já tiver puxado o compose novo e ele falhar:

    ```bash
    docker compose down
    ```

2. Temporariamente, inicie **sem** auth (substitua o `command` no `docker-compose.yaml` por):

    ```yaml
    command: ['--replSet', 'rs0', '--bind_ip_all', '--port', '27017']
    ```

    Remova também `--auth`, `--keyFile` e o volume do keyfile se ainda não existir.

3. Suba o Mongo:

    ```bash
    docker compose up -d
    ```

4. Crie o usuário admin (lê `.env`):

    ```bash
    npm run mongo:migrate-to-auth
    ```

5. Restaure o `docker-compose.yaml` deste repositório (com auth + keyfile).

6. Gere o keyfile se ainda não existir:

    ```bash
    npm run mongo:keyfile
    ```

7. Recrie o container:

    ```bash
    docker compose up -d --force-recreate
    ```

8. Atualize `DATABASE_URL` no `.env` com usuário e senha (passo 1) e rode `npm run healthcheck`.

### B. Não apague o volume sem backup

`docker compose down -v` **apaga** `mongo1_data`. Use só se quiser recomeçar do zero.

---

## Checklist de segurança

| Item                                       | Status no Compose                       |
| ------------------------------------------ | --------------------------------------- |
| Porta publicada só em `127.0.0.1:27717`    | Sim                                     |
| `--auth` + usuário admin                   | Sim                                     |
| Keyfile para replica set                   | Sim                                     |
| TLS app → Mongo                            | Não (localhost / rede interna na VM)    |
| `ENVIRONMENT=prod` exige credencial na URL | Sim (`validateEnv` + `healthcheck.mjs`) |

---

## VM / produção

1. **Não** publique a porta do Mongo no firewall público.
2. Em dev local: `ports: ['127.0.0.1:27717:27017']`. Em produção na VM, prefira rede interna Docker **sem** `ports` publicados.
3. Use senha forte (32+ bytes aleatórios).
4. `DATABASE_URL` com `authSource=admin` e porta do host (`27717` no Compose local).
5. Rotacione senha com plano de downtime: criar usuário novo, atualizar app, remover antigo.

---

## Troubleshooting

### `bad file` / keyfile permission

- Confirme que `secrets/mongo-keyfile` existe e não tem linhas extras além do base64.
- No Linux: `chmod 400 secrets/mongo-keyfile`.
- No **Windows + Docker Desktop**, o bind mount não garante `chmod 400`; o `scripts/mongo-docker-entrypoint.sh` copia o keyfile para `/data/configdb/mongo-keyfile` dentro do container na subida.

### `Authentication failed` após upgrade

- Volume antigo sem usuário → seção [Volume existente](#volume-existente-sem-autenticação).
- Senha na `DATABASE_URL` diferente de `MONGO_ROOT_PASSWORD` ou falta URL-encoding.

### `MongoServerError: not authorized`

- Inclua `authSource=admin` na connection string.

### Healthcheck falha em loop

```bash
docker compose logs mongo1 --tail 50
```

- Replica set não iniciado: o healthcheck tenta `rs.initiate`; aguarde retries.
- Auth antes do usuário existir: volte ao fluxo de migração.

### Prisma / app não conecta

- Confirme `replicaSet=rs0`, `directConnection=true` e porta **`27717`** na `DATABASE_URL` (host).
- Teste com `mongosh` via `docker exec` (passo 3) antes de `npm run prisma:push`.

---

## Referências

- Issue [#48](https://github.com/CaioGiasson/vitraux/issues/48) (SEC-C03)
- `docker-compose.yaml`, `.env.example`, `scripts/generate-mongo-keyfile.mjs`, `scripts/mongo-migrate-to-auth.mjs`
