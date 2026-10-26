import type {
	AiCallContext,
	AiLogEntry,
	AiTextRequest,
	AiTextResult,
	ClassifyInput,
	SummarizeOptions,
} from '@/services/AI/ai.types'

/** Fornecedor de modelo (OpenAI, etc.). Só chama a API e devolve o resultado; não monta prompt nem grava log. */
export interface AiVendorPort {
	generateText(request: AiTextRequest): Promise<AiTextResult>
}

/** Registro de auditoria de chamadas (`AiLog`). */
export interface AiLogRecorderPort {
	record(entry: AiLogEntry): Promise<void>
}

/** Decide se o recurso de IA está ligado (feature flag). */
export interface AiGatePort {
	isEnabled(): Promise<boolean>
}

/** Fachada usada pelos use cases. Nunca importar o SDK do fornecedor fora de `vendors/`. */
export interface AiPort {
	generateText(prompt: string, context?: AiCallContext): Promise<string>
	summarize(text: string, options?: SummarizeOptions): Promise<string>
	generateTitle(messages: string[], context?: AiCallContext): Promise<string>
	/** Nota de 0 a 100 de o texto atender ao critério. */
	classify(input: ClassifyInput, context?: AiCallContext): Promise<number>
}
