# Convenções de Código

## 1. Nomenclatura

| Elemento                                                   | Convenção               | Exemplo                 |
| ---------------------------------------------------------- | ----------------------- | ----------------------- |
| Variáveis, funções, parâmetros                             | camelCase               | `fetchUserData`         |
| Classes, Types, Enums                                      | PascalCase              | `CreateUserInput`       |
| Constantes                                                 | UPPER_SNAKE_CASE        | `MAX_TIMEOUT_MS`        |
| Arquivos de ação (routes, useCases)                        | camelCase pela ação     | `createPerson.route.ts` |
| Arquivos de infraestrutura (repositories, services, types) | camelCase pela entidade | `person.repository.ts`  |
| Entidades no banco                                         | PascalCase, singular    | `User`, `BatchDebt`     |

- **Código em inglês** — variáveis, funções, tipos, nomes de arquivo executável e todo código compilável.
- **Comunicação humana em português (pt-BR)** — comentários no código, mensagens de commit, descrições de PR, documentação e issues.
- **Nunca abreviar nomes** — clareza tem precedência sobre brevidade.
- **Funções com responsabilidade única** — evitar funções com dupla finalidade (`getOrCreate` → separar em `get` e `create`).
- **Constantes no topo do arquivo** — declarar em UPPER_SNAKE_CASE no início do módulo.

---

## 2. Código Limpo e Legibilidade

- **Guard clauses** — retornar cedo para evitar indentação excessiva.
- **Máximo 2 níveis de if aninhado** — extrair lógica para funções auxiliares se ultrapassar.
- **Extrair expressões para variáveis descritivas** — nunca usar lógica complexa diretamente em condicionais ou argumentos.
- **Sem magic strings ou magic numbers** — centralizar em constantes ou enums.
- **Imutabilidade** — preferir `const` a `let`, nunca `var`. Usar `map`, `filter`, `reduce` em vez de `push`, `splice`. Usar `readonly` em types quando mutação não é desejada.

---

## 3. Tipagem

- **`any` proibido** — tipar explicitamente todos os inputs, outputs, parâmetros e retornos.
- **`type` para shapes de dados** — DTOs e shapes de dados usam `type`.
- **`interface` para ports** — contratos de injeção de dependência usam `interface`.
- **`strict: true` e `noImplicitAny: true`** — manter no `tsconfig.json`.
- **Tipos separados da lógica** — `*.types.ts` para shapes, `*.ports.ts` para contratos de DI.
- **Máximo 3 parâmetros por função** — acima disso, agrupar em objeto tipado.

```ts
// ruim
function execute(a: string, b: string, c: string, d: string) {}

// bom
type ExecuteParams = { a: string; b: string; c: string; d: string }
function execute(params: ExecuteParams) {}
```
