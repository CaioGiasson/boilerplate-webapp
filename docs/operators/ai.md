# AI Service

Decisão: [ADR-012](../adr/012-ai-service-vendor-port.md). Flag: [feature-flags.md](feature-flags.md).

## Variáveis de ambiente

| Variável                | Padrão         | Efeito                                                               |
| ----------------------- | -------------- | -------------------------------------------------------------------- |
| `AI_PROVIDER`           | `none`         | `none` ou `openai`. Qualquer outro valor derruba o boot              |
| `OPENAI_API_KEY`        | —              | Obrigatória com `AI_PROVIDER=openai`; não logar                      |
| `OPENAI_TEXT_MODEL`     | `gpt-5.4-mini` | Modelo de texto. Confirme que a conta tem acesso ao modelo escolhido |
| `AI_TIMEOUT_MS`         | `30000`        | Timeout por chamada ao fornecedor                                    |
| `AI_LOG_RETENTION_DAYS` | `90`           | Retenção do `AiLog` aplicada pelo job `retention-purge`              |

## Ligar em um ambiente

1. Defina `AI_PROVIDER=openai` e `OPENAI_API_KEY` e reinicie.
2. Ligue a flag: `npm run toggle-feature-flag -- ai_enabled` (`--confirm` em produção). Espere até 30 s.
3. `npm run healthcheck`: a sonda `ai` confirma a configuração.

Desligar: alternar a flag de novo. Com a flag desligada ou sem fornecedor, o serviço responde `503` e nada é cobrado.

## Usar em um use case

```ts
export default class MyUseCase extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false // chamada externa fora de $transaction (ADR-007)
	}
	// ...
	await this.aiService.summarize(text, { userId })
}
```

Receba `AiPort` no construtor e registre em `src/container/dependencies.ts`. Exemplo completo: `src/useCases/summarizeText.usecase.ts`.

Métodos: `generateText`, `summarize`, `generateTitle`, `classify` (nota 0–100).

## Auditoria e custo

Cada sucesso grava `AiLog` (`query`, `model`, `prompt`, `response`, `tokenCost`, `userId`). Consultas úteis:

```js
db.AiLog.aggregate([
	{ $match: { createdAt: { $gte: ISODate('2026-10-01') } } },
	{ $group: { _id: '$userId', tokens: { $sum: '$tokenCost' }, calls: { $sum: 1 } } },
	{ $sort: { tokens: -1 } },
])
```

`AiLogRepository.sumTokensByUserSince` e `countByUserSince` servem para implementar cota por usuário.

## Trocar de fornecedor

1. Crie `src/services/AI/vendors/<Nome>.service.ts` implementando `AiVendorPort`.
2. Acrescente o nome em `AiProviderName` e `parseAiProvider` (`src/config/env.ts`) e em `createVendor` (`AI.service.ts`).
3. Atualize [subprocessors-ropa.md](subprocessors-ropa.md), [transfers.md](transfers.md) e esta página.

## Privacidade

- Prompt e resposta são conteúdo do usuário: não envie dado pessoal que a tarefa não exija.
- Exportação LGPD inclui `aiLogs`; `retention-purge` apaga logs antigos e os do titular na exclusão definitiva ([retention.md](retention.md)).
