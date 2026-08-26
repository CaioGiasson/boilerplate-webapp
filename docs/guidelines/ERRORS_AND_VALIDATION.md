# Erros e Validação — App

## 1. Hierarquia de erros

Implementação em [`src/errors/`](../../src/errors/):

```
AppError (abstract)
  ├── ClientError          → HTTP 4xx
  │     ├── ValidationError
  │     ├── NotFoundError
  │     ├── UnauthorizedError
  │     ├── ForbiddenError
  │     ├── ConflictError
  │     └── TooManyRequestsError (+ Retry-After)
  ├── DomainError          → regras de negócio
  │     └── UseCaseError
  └── InfraError           → HTTP 5xx / infra
        ├── RepositoryError
        ├── ServiceError
        └── IntegrationError
```

- Preferir subclasses tipadas a `throw new Error` genérico.
- Use cases/controllers lançam erros da hierarquia; [`handleRoute`](../../src/utils/routeHandler.ts) converte `AppError` → JSON via `ApiPresenter.error`.
- **`catch (error: unknown)`** — nunca `any`.

---

## 2. Resposta HTTP de erro

```json
{ "success": false, "message": "…", "code": "VALIDATION_ERROR" }
```

Erros não mapeados → 500 com mensagem genérica (`ApiPresenter.unknownError()`), sem vazar stack ao cliente.

---

## 3. Validação

| Camada            | Responsabilidade                                                             |
| ----------------- | ---------------------------------------------------------------------------- |
| Rota / controller | Zod (body, query, params); limites em `src/schemas/`, `src/utils/*Limits.ts` |
| Use case          | Regras de domínio (ownership, estado, quotas)                                |

Nenhum dado não validado deve executar lógica de negócio.

---

## 4. Integrações externas

Toda chamada a Brevo/Spaces/import remoto:

- timeout configurável;
- try/catch ou erro tipado (`ServiceError` / `IntegrationError`);
- retry com jitter onde aplicável (429/5xx);
- circuit breaker em dependências críticas.
