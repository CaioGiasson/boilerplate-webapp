import UseCaseMasterPort from '@/masterPorts/UseCase.masterport'
import { ValidationError } from '@/errors'
import type { AiPort } from '@/services/AI/ai.port'

type Input = {
	userId: string
	text: string
}

type Output = {
	summary: string
}

/**
 * Exemplo de use case com IA (ADR-012): não tem rota HTTP. Serve de modelo para quem precisar chamar o AI Service:
 * `transactional = false`, porque a chamada ao fornecedor nunca fica dentro de `$transaction` (ADR-007).
 */
export default class SummarizeText extends UseCaseMasterPort<Input, Output> {
	private aiService: AiPort

	constructor(aiService: AiPort) {
		super()
		this.aiService = aiService
	}

	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) {
			throw new ValidationError('User id is required')
		}
		if (!input.text?.trim()) {
			throw new ValidationError('Text is required')
		}
	}

	async execute(input: Input): Promise<Output> {
		const summary = await this.aiService.summarize(input.text, { userId: input.userId })
		return { summary }
	}
}
