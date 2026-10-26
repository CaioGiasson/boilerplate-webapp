import type { AiLogRecorderPort, AiVendorPort } from '@/services/AI/ai.port'
import type { AiLogEntry, AiTextRequest, AiTextResult } from '@/services/AI/ai.types'

/** Vendor falso: devolve `text` fixo (ou o resultado de `respond`) e guarda os pedidos recebidos. */
export class FakeAIVendor implements AiVendorPort {
	readonly requests: AiTextRequest[] = []

	constructor(
		private readonly respond: (request: AiTextRequest) => Promise<AiTextResult> | AiTextResult = () => ({
			text: 'resposta',
			vendor: 'FAKE',
			model: 'fake-model',
			tokenCost: 7,
		})
	) {}

	async generateText(request: AiTextRequest): Promise<AiTextResult> {
		this.requests.push(request)
		return this.respond(request)
	}
}

export class FakeAiLogRecorder implements AiLogRecorderPort {
	readonly entries: AiLogEntry[] = []

	constructor(private readonly failWith?: Error) {}

	async record(entry: AiLogEntry): Promise<void> {
		if (this.failWith) throw this.failWith
		this.entries.push(entry)
	}
}
