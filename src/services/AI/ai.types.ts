/** Quem e o quê motivou a chamada; vai para o `AiLog`. */
export type AiCallContext = {
	userId?: string
	contextId?: string
}

export type AiTextRequest = {
	prompt: string
	model?: string
}

export type AiTextResult = {
	text: string
	vendor: string
	model: string
	tokenCost: number
}

export type AiLogEntry = {
	userId?: string
	contextId?: string
	query: string
	model: string
	prompt: string
	response: string
	tokenCost: number
}

export type SummarizeOptions = AiCallContext & {
	maxChars?: number
}

export type ClassifyInput = {
	text: string
	/** Critério avaliado, em linguagem natural (ex.: "a mensagem pede suporte técnico"). */
	criteria: string
}
