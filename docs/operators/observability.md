# Observabilidade: requestId, logs e erros

## requestId

Toda rota que passa por `handleRoute` (`src/utils/routeHandler.ts`) tem um `requestId`:

1. Se a requisição traz `x-request-id` **válido** (8–64 caracteres de `A-Za-z0-9._-`), ele é reaproveitado — o proxy/gateway pode gerar o id e ele atravessa a aplicação.
2. Senão, o app gera um UUID. Valor com espaço, quebra de linha ou mais de 64 caracteres é descartado (evita injeção de linha no log).
3. O id vai para: o header `x-request-id` da **resposta**, o campo `requestId` do corpo de **erro** (`{ success: false, message, code, requestId }`) e **todas** as linhas de log emitidas durante a requisição (via `AsyncLocalStorage`, em `src/lib/requestContext.ts`; não precisa passar o id de função em função).

Suporte: o usuário informa o `requestId` do erro; `grep` no log acha a linha. Rotas fora do `handleRoute` (`/api/ping`, `/api/v1/version`, health) não têm id.

## Formato do log

`LOG_FORMAT=json|text` (`.env.example`). Sem valor: **JSON em produção** (`ENVIRONMENT=prod` ou `NODE_ENV=production`) e **texto** no resto.

<!-- prettier-ignore -->
```json
{
	"level": "error",
	"time": "2026-10-26T21:00:00.000Z",
	"requestId": "7f0c…",
	"message": "Not found",
	"data": { "name": "NotFoundError", "message": "Not found" }
}
```

- Uma linha por evento. `info` em stdout; `warn` e `error` em stderr.
- A redação de segredos é a mesma nos dois formatos (`LogManager`: strings com `password`, `secret`, `token`, `authorization` ou URL Mongo viram `[redacted]`; `stack` só fora de produção).
- Nível: `LOG_LEVEL` (`silent` desliga info/warn; `error` sempre sai).

## Destino externo de erros (Sentry, OpenTelemetry, webhook)

O boilerplate **não traz SDK de terceiros**. Em vez disso, expõe um gancho: `registerErrorReporter` (`src/lib/errorReporter.ts`). `ErrorManager.log` chama o reporter para erros **inesperados e 5xx**; `AppError` 4xx (validação, não encontrado, rate limit…) não é enviado.

Exemplo com Sentry — em `src/instrumentation-node.ts`, dentro de `registerNodeInstrumentation()`:

```ts
import * as Sentry from '@sentry/node'
import { registerErrorReporter } from '@/lib/errorReporter'

if (process.env.SENTRY_DSN) {
	Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.ENVIRONMENT })
	registerErrorReporter((error, { requestId, source }) => {
		Sentry.withScope((scope) => {
			scope.setTag('requestId', requestId ?? 'none')
			scope.setTag('source', source)
			Sentry.captureException(error)
		})
	})
}
```

Instale o pacote (`npm i @sentry/node`) e declare o suboperador em `docs/operators/subprocessors-ropa.md`: stack trace e `requestId` saem do ambiente (transferência internacional, LGPD). **Não** envie corpo de requisição nem dados pessoais.

O reporter nunca lança: falha do destino não derruba a resposta.

## Erros fora do `handleRoute`

`onRequestError` (`src/instrumentation.ts`) captura erros não tratados de renderização e de servidor que o Next propaga, registra `método`, `path` (sem query) e `routeType`, e chama o mesmo `ErrorManager`. Erros de rota API tratados pelo `handleRoute` **não** passam por aqui (sem log duplicado).
