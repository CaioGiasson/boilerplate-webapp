# Fluxo Example

## Objetivo

Demonstrar o fluxo em camadas do App: controller → useCase → service/repository.

## Regra de negócio

1. Recebe um `identifier` via query string.
2. Se existir um Example recente em cache (janela definida por `CACHE_LIFETIME_SECONDS`), retorna o cache.
3. Caso contrário, o `ExampleService` gera um novo valor, o repository persiste e a API retorna o resultado.
