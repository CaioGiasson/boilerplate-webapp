# Contribuindo — Vitraux

Obrigado por contribuir. Este guia complementa [`README.md`](README.md) e [`AGENTS.md`](AGENTS.md) — não os substitui.

## Antes de começar

1. Leia [`AGENTS.md`](AGENTS.md) (camadas, **Never**, comandos).
2. Confira [`docs/architecture.md`](docs/architecture.md) se tocar API ou domínio.
3. Guidelines do time: [`docs/guidelines/`](docs/guidelines/) (arquitetura, API, qualidade, revisão de PR).
4. Tarefas seguem o board [Vitraux](https://github.com/users/CaioGiasson/projects/3/views/1) e [`docs/issue-workflow.md`](docs/issue-workflow.md).

## Setup local

**Node.js:** use a versão do projeto — [`22.19.0`](.nvmrc) (`nvm use` ou instalação equivalente).

```bash
cp .env.example .env
npm install
npm run mongo:keyfile && docker compose up -d
npm run prisma:push   # somente quando o schema Prisma mudou (ver abaixo)
npm run dev
```

### Prisma e MongoDB — `push` vs alternativas

Este repo usa **MongoDB** com Prisma. Não há `prisma migrate` SQL tradicional; a sincronização de schema é via **`db push`**.

| Comando                    | Efeito                                            | Quando usar                                                                                                     |
| -------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm run prisma:generate`  | Gera o client Prisma                              | Sempre que puxar mudanças de schema; roda no `dev`/`build`                                                      |
| `npm run prisma:push`      | **Altera** o banco para refletir `prisma/models/` | Primeiro setup local; após pull que mudou schema; **nunca** apontando para banco compartilhado/prod sem revisão |
| `npm run dev` / `npm test` | Não modifica o schema do banco                    | Dia a dia, se o schema não mudou                                                                                |

**Forma mais segura no dia a dia:** use um Mongo **local** (Docker Compose) dedicado ao dev. Se o schema não mudou, **não** rode `prisma:push` — só `npm run dev`. Em CI/prod, schema deve ser aplicado de forma controlada (operador), não por push casual.

Detalhes (Mongo auth, Spaces, produção): [`README.md`](README.md).

## Branch e commits

- Branch a partir de `main`: `feat/…`, `fix/…`, `docs/…` (vinculada à issue do board).
- **`homolog`** — branch de QA integrado.
- **CI** — lint/typecheck/test/build rodam **apenas em pull requests** (`.github/workflows/ci.yml`).
- **Merge (CI-04):** política humana — só mergear PR com **`CI / verify`** verde; push direto a `main`/`homolog` não roda CI.
- **Mensagens de commit em português (pt-BR)** — descreva o _porquê_, não só o _o quê_.
- **Commit + push obrigatórios** — toda implementação deve terminar (ou avançar em marcos lógicos) com commit e push na branch remota da issue, **sem esperar pedido explícito** de commit. Objetivo: continuidade em outra máquina.
- **Código-fonte em inglês** (identificadores, tipos, nomes de arquivo executável).
- **Comentários no código em pt-BR** — expliquem regras de negócio ou detalhes não óbvios.
- Um PR por issue quando possível; referencie a issue no corpo (`Closes #N` se aplicável).
- Ao iniciar uma issue: assignee + perguntas/respostas registradas como comentários na issue ([`docs/issue-workflow.md`](docs/issue-workflow.md)).
- **Gate:** pedidos de feature (“faça uma tela”, “crie um endpoint”, etc.) → refinar, criar issue no board, abrir branch — **só então** implementar ([`docs/issue-workflow.md`](docs/issue-workflow.md#gate-antes-de-implementar)).

## Antes de abrir PR

```bash
npm test
npm run check
npm run build   # recomendado se alterou tipos ou rotas
```

Para mudanças de UI, percorra o **checklist i18n** em [`AGENTS.md`](AGENTS.md#i18n--checklist).

Para endpoint criado ou alterado, percorra o **checklist de contratos HTTP** em [`AGENTS.md`](AGENTS.md#contratos-http--checklist-obrigatório): `requests/*.http` + inventário + `docs/openapi.yaml` (obrigatório).

Documente a feature no repositório quando couber (`docs/`, ADR, `requests/`, operadores) — não só no board do GitHub.

## Pull request

Use o template em [`.github/pull_request_template.md`](.github/pull_request_template.md):

- **Summary** — o que mudou e por quê
- **Test plan** — passos verificáveis
- Link à issue do board

### Review e label `Reviewed`

Após abrir a PR, o agente (ou revisor) deve seguir o fluxo do projeto **e** as guidelines:

1. Revisar diff com [`docs/guidelines/GUIA_REVISAO_PR_GERAL.md`](docs/guidelines/GUIA_REVISAO_PR_GERAL.md) (checklist + níveis 🔴 bloqueante / 🟡 importante / 🟢 sugestão).
2. Cruzar com [`docs/guidelines/ARCHITECTURE.md`](docs/guidelines/ARCHITECTURE.md), [`API_AND_SECURITY.md`](docs/guidelines/API_AND_SECURITY.md), [`QUALITY.md`](docs/guidelines/QUALITY.md) e [`ERRORS_AND_VALIDATION.md`](docs/guidelines/ERRORS_AND_VALIDATION.md) quando aplicável.
3. Corrigir achados **bloqueantes** e **importantes** na mesma branch.
4. Comentar o resultado na PR (o que foi revisado e o que foi corrigido).
5. Aplicar label **`Reviewed`**.

Detalhes operacionais: [`docs/issue-workflow.md`](docs/issue-workflow.md#review-de-prs) e [`.cursor/rules/pr-review.mdc`](.cursor/rules/pr-review.mdc).

## Onde colocar código

| Mudança            | Onde                                            |
| ------------------ | ----------------------------------------------- |
| Nova rota API      | `src/app/api/` + controller + use case + testes |
| Regra de negócio   | `src/useCases/`                                 |
| Query Prisma       | `src/repositories/`                             |
| Integração externa | `src/services/`                                 |
| Texto de UI        | `src/constants/texts/{pt,en,es}.ts`             |
| Script operacional | `scripts/` + entrada em `scripts/README.md`     |

## Lições aprendidas

Bug não óbvio corrigido? Registre em [`tasks/lessons.md`](tasks/lessons.md).

## Governança

Assessments e reports na raiz do repo — ver seção **Governança / assessments** do [`README.md`](README.md).
