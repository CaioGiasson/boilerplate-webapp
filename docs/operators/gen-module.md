# Gerador de módulo (`npm run gen:module`)

Cria, em um comando, o CRUD de uma entidade **do usuário** (cada registro pertence a quem o criou) em todas as camadas, já com paginação por cursor, validação Zod `strict`, testes e contrato HTTP.

```bash
npm run gen:module -- Task --fields "title:string,done:boolean?,priority:int,dueAt:date?"   # dry-run: só lista
npm run gen:module -- Task --fields "title:string,done:boolean?,priority:int,dueAt:date?" --confirm
```

## Argumentos

| Argumento   | Descrição                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| `<Nome>`    | PascalCase em inglês (`Task`, `ProjectItem`). Vira model, classes, `/api/v1/<plural-em-kebab>`.             |
| `--fields`  | `nome:tipo[?],…`. Tipos: `string`, `int`, `float`, `boolean`, `date`. `?` = opcional. Padrão `name:string`. |
| `--plural`  | Plural em PascalCase quando a regra simples (`+s`, `ies`, `es`) não serve (`Person` → `People`).            |
| `--confirm` | Grava. Sem ele é dry-run. Recusa rodar em produção.                                                         |

Campos reservados (`id`, `userId`, `createdAt`, `updatedAt`) são criados pelo gerador. O primeiro campo `string` é o alvo da busca `?q=`.

## O que é gerado

| Camada     | Arquivos                                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| Prisma     | `prisma/models/<nome>.prisma` (índice `[userId, createdAt]`)                                                     |
| Schema     | `src/schemas/<nome>.schema.ts` (`.strict()`: recusa `userId`, `id`… no corpo)                                    |
| Repository | `<Nome>.repository.ts` (toda consulta filtra por `userId`; `listAllByUser`, `deleteAllByUser`) e `<Nome>.dto.ts` |
| Use cases  | `create`, `get`, `list<Plural>`, `update`, `delete` (leitura sem transação)                                      |
| Controller | `src/controllers/<Nome>/` com 5 rotas (escrita exige `assertSameOrigin`) e `src/app/api/v1/<rota>/` (+ `[id]`)   |
| Testes     | `tests/useCases/<nome>.usecases.test.ts`, `tests/schemas/<nome>.schema.test.ts`                                  |
| Contrato   | `requests/<rota>/<rota>.http`, e linhas em `requests/README.md` e `docs/openapi.yaml` (tag, caminhos, schemas)   |
| Ligação    | `src/container/dependencies.ts` (import, tipo, instância e retorno dos 5 use cases)                              |

Convenções que o código gerado segue: outro dono responde **404** igual a inexistente; `PATCH` parcial e vazio é recusado; a lista devolve `{ items, pageInfo }` ([paginação](../../CONTEXT-ARCHITECTURE.md)).

O gerador **não sobrescreve nada**: se algum arquivo ou o model já existir, ou se um ponto de inserção mudou de formato, aborta sem gravar. Roda o Prettier nos `.ts`, `.md` e `.yaml` que gera ou altera.

## O que sobra para você

A saída do comando lista os passos que exigem decisão:

1. **Exportação LGPD** — incluir a entidade em `exportUserData.usecase.ts` (`listAllByUser`).
2. **Exclusão definitiva** — apagar os registros da conta no `retention-purge` e em `docs/operators/retention.md` (`deleteAllByUser`).
3. **`CONTEXT-ENTITIES.md`, `CONTEXT-CODE.md`** e a data do snapshot (regra do `AGENTS.md`).
4. `npm run prisma:push` (altera o banco: revise antes), depois `npm run typecheck` e `npm test`.
5. Rate limit nas rotas de escrita e cota/retenção, se o dado for volumoso ou sensível.

## Não gera

- **UI e textos i18n.** Telas usam o design system (`DataTable`, `Modal`, `Pagination`…) e textos nos três catálogos; gerar isso criaria texto de enchimento. `AdminUsersSection` é a referência de lista paginada.
- Relações entre entidades, campos únicos, soft delete (a exclusão é definitiva) e ordenação por campo diferente de `createdAt`.

## Manutenção

Os modelos de texto estão em `scripts/lib/genModule.cjs`; `tests/scripts/genModule.test.ts` valida a sintaxe do que gera e que os pontos de inserção ainda existem em `dependencies.ts`, `openapi.yaml` e `requests/README.md` (se você mudar o formato desses arquivos, o teste avisa). Em 2026-10-26 o gerador foi verificado ponta a ponta: gerou `Task` com 5 tipos de campo, e o código gerado passou em `tsc`, ESLint e nos testes que ele mesmo cria.
