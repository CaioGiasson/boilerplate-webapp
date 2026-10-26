# ADR-012 — AI Service com porta de fornecedor

- **Status:** Aceito
- **Data:** 2026-10-26

## Contexto

O `tribalRPGBot` integra a OpenAI por um `AIService` que monta prompts, chama um fornecedor e grava toda chamada em `aiLog`. O boilerplate precisa da mesma capacidade, mas opcional: o app sobe sem chave, o fornecedor é trocável e o gasto é auditável.

## Decisão

- **Porta e vendor.** Use cases dependem de `AiPort` (`src/services/AI/ai.port.ts`); o SDK só existe em `src/services/AI/vendors/`. Trocar de fornecedor = classe nova que implementa `AiVendorPort` + ajuste em `getAIService()`.
- **Opcional por padrão.** `AI_PROVIDER=none` (default) não exige chave. Com `openai`, `OPENAI_API_KEY` é obrigatória e validada no boot. O modelo de texto é `OPENAI_TEXT_MODEL` (default `gpt-5.4-mini`).
- **Duas travas antes de chamar o fornecedor:** fornecedor configurado **e** feature flag `ai_enabled` ligada (ADR-011); caso contrário `503 ServiceUnavailableError`.
- **Auditoria fora da transação.** Todo sucesso grava `AiLog` por `AiLogRecorder`, que usa `runWithoutTransaction`. Use cases que chamam IA são `transactional = false`: chamada externa nunca fica dentro de `$transaction` (ADR-007) e o registro de uma chamada paga não é revertido junto com o use case. Falha ao gravar o log **não** derruba a resposta já obtida; vai para o log da aplicação.
- **Sem rota HTTP.** O boilerplate não expõe endpoint de IA. `SummarizeText` é um use case de exemplo com testes, sem controller. Rota futura exige `requireAuth`, rate limit, cota por usuário (`AiLogRepository.sumTokensByUserSince`) e a flag.
- **Resiliência.** Circuit breaker `openai` + `retryWithJitter` com até 2 tentativas para 429/5xx/falha de conexão. O SDK roda com `maxRetries: 0` para não somar retentativas. (O tribal não retenta.)
- **Limite de entrada.** `AI_MAX_INPUT_CHARS` (20 000) por chamada; texto do usuário vai delimitado no prompt (`<texto>…</texto>`) com instrução de ignorar comandos dentro dele, o que reduz — não elimina — injeção de prompt.
- **Fora do escopo:** geração de imagem, comandos inferidos e prompts de domínio do tribal.

## Consequências

### Positivas

- Boilerplate sem dependência obrigatória de IA; testes usam um vendor falso, sem rede.
- Custo e conteúdo das chamadas auditáveis, com retenção, exportação e exclusão (LGPD).

### Negativas / trade-offs

- `AiLog` guarda prompt e resposta (conteúdo do usuário): entra na exportação, na retenção de 90 dias (`AI_LOG_RETENTION_DAYS`) e na exclusão definitiva.
- OpenAI passa a ser suboperador com transferência internacional quando habilitada (ver `docs/operators/subprocessors-ropa.md` e `transfers.md`).
- Propagação da flag `ai_enabled` leva até 30 s por instância.
- `zod` foi atualizado de 3.24.2 para 3.25.76 por causa do peer opcional do SDK `openai` 6.x.

## Referências

- `src/services/AI/`, `src/repositories/AiLog.repository.ts`, `src/useCases/summarizeText.usecase.ts`
- `docs/operators/ai.md`
