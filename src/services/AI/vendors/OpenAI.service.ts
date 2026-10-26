import OpenAI from 'openai'
import type { AiConfig } from '@/config/env'
import { IntegrationError } from '@/errors'
import { openAiCircuitBreaker } from '@/services/resilience/externalBreakers'
import type { AiVendorPort } from '@/services/AI/ai.port'
import type { AiTextRequest, AiTextResult } from '@/services/AI/ai.types'
import { isRetryableHttpStatus, retryWithJitter } from '@/utils/retryWithJitter'

const VENDOR_NAME = 'OPENAI'
const MAX_ATTEMPTS = 2

function readStatus(error: unknown): number | undefined {
	if (!error || typeof error !== 'object') return undefined
	const status = (error as { status?: unknown }).status
	return typeof status === 'number' ? status : undefined
}

/** Retenta 429/5xx e falhas de conexão (sem status HTTP); erros 4xx do pedido não melhoram ao repetir. */
function isRetryableError(error: unknown): boolean {
	const status = readStatus(error)
	return status === undefined ? error instanceof OpenAI.APIConnectionError : isRetryableHttpStatus(status)
}

export default class OpenAIService implements AiVendorPort {
	private readonly client: OpenAI
	private readonly defaultModel: string

	constructor(config: AiConfig, client?: OpenAI) {
		this.defaultModel = config.textModel
		// `maxRetries: 0`: as tentativas são controladas aqui, junto do circuit breaker.
		this.client = client ?? new OpenAI({ apiKey: config.apiKey, timeout: config.timeoutMs, maxRetries: 0 })
	}

	async generateText(request: AiTextRequest): Promise<AiTextResult> {
		const model = request.model?.trim() || this.defaultModel

		try {
			const response = await openAiCircuitBreaker.execute(() =>
				retryWithJitter(
					() =>
						this.client.chat.completions.create({
							model,
							messages: [{ role: 'user', content: request.prompt }],
						}),
					{ maxAttempts: MAX_ATTEMPTS, shouldRetry: isRetryableError }
				)
			)

			const text = response.choices[0]?.message?.content?.trim()
			if (!text) {
				throw new IntegrationError('AI provider returned an empty response')
			}

			return { text, vendor: VENDOR_NAME, model, tokenCost: response.usage?.total_tokens ?? 0 }
		} catch (error: unknown) {
			if (error instanceof IntegrationError) throw error
			throw new IntegrationError('AI provider request failed', error)
		}
	}
}
