# Arquitetura e Persistência — App

> Alinhado a [`docs/architecture.md`](../architecture.md) e [`AGENTS.md`](../../AGENTS.md).

## 1. Camadas e fluxo

```
HTTP:  app/api → controller → useCase → (services | repositories)
Cron:  scripts/cron → job → (use case | script operacional)
```

- **Nunca pular camadas** — o fluxo acima é obrigatório.
- **Controllers finos** — parse/validate HTTP (Zod), middlewares (auth, rate limit, CSRF), chamam `useCase.run()`, montam `NextResponse`.
- **Nunca propagar `NextRequest`/`NextResponse` para use cases** — camadas internas não conhecem o framework HTTP.
- **Um use case por operação de negócio** — ex.: `listUserImages.usecase.ts`.
- **Composition root** — [`src/container/dependencies.ts`](../../src/container/dependencies.ts) cacheia use cases; Prisma/Email/Spaces via getters singleton (ADR-008). Rotas usam `getDependencies()`.

### Validação em duas etapas

- **Controller / rota** — formato e estrutura (Zod, query/body).
- **Use case** — regras de domínio. A partir daqui, dados são considerados íntegros.

### DTOs nas bordas

- Mappers como `toPublicUser()` convertem modelos internos em respostas de API.
- Controllers usam `ApiPresenter.success` / `ApiPresenter.error`.
- Checklist: [`docs/dto-checklist.md`](../dto-checklist.md).

---

## 2. Master port e transações

Use cases estendem [`UseCaseMasterPort`](../../src/masterPorts/UseCase.masterport.ts):

1. `validate(input)`
2. `execute(input, { prisma })`
3. `run(input)` — orquestra validate + logging + client Prisma

**Transações:**

- Mutações multi-write: `protected get transactional() { return true }` (default) → `$transaction`.
- Leituras puras (list/get): override `transactional = false` → client root sem TX.

Repositories recebem `Prisma.TransactionClient` do injectable na mesma unidade de trabalho. **Não** chamar `getPrismaClient()` no meio de uma TX — use `injectables.prisma` ou helpers ADR-007.

---

## 3. Persistência e repositórios

- **Prisma confinado a repositórios** — `src/repositories/*.repository.ts`.
- **Schemas** — `prisma/models/*.prisma` + merge (`npm run prisma-merge`).
- **Sincronização local** — `npm run prisma:push` (Mongo; ver CONTRIBUTING).
- **Paginação obrigatória em listagens** — cursor (`createdAt` + `id`), resposta com `nextCursor` (~40 itens/página no mosaico).
- **Soft delete** — campo `deletedAt` quando aplicável. Queries “ativas” devem excluir deletados considerando que no Mongo o campo pode **não existir** (ver [`tasks/lessons.md`](../../tasks/lessons.md)).

### Nomenclatura de métodos

Preferir nomes de negócio quando claros (`findByIdentifier`, `listVisibilitiesForMine`). Sufixos de arquivo: `*.repository.ts`, `*.usecase.ts`, `*.route.ts`.

---

## 4. Services vs repositories

| Tipo       | Exemplos                                            | Responsabilidade          |
| ---------- | --------------------------------------------------- | ------------------------- |
| Repository | `User.repository`, `Image.repository`               | Prisma / Mongo            |
| Service    | `Storage.service`, `Brevo.service`, `Email.service` | APIs externas (S3, Brevo) |

Services **não** acessam Prisma. `File.manager` coordena Storage + metadados — chamado pelo use case.

---

## 5. UI e i18n

- Páginas: `src/app/[locale]/`
- Textos: `src/constants/texts/{pt,en,es}.ts` + `next-intl`
- Clientes HTTP: `src/lib/*-client.ts` (sem Prisma/Spaces no browser)

---

## 6. Decisões registradas

ADRs em [`docs/adr/`](../adr/README.md) (JWT, Spaces ACL, i18n, Brevo, etc.).
