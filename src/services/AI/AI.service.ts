import { getAiConfig, type AiConfig } from '@/config/env'
import { ServiceUnavailableError, ValidationError } from '@/errors'
import { FEATURE_FLAGS, isFeatureActive } from '@/managers/FeatureFlag.manager'
import LogManager from '@/managers/Log.manager'
import AiLogRecorder from '@/services/AI/AiLog.recorder'
import type { AiGatePort, AiLogRecorderPort, AiPort, AiVendorPort } from '@/services/AI/ai.port'
import type { AiCallContext, AiLogEntry, ClassifyInput, SummarizeOptions } from '@/services/AI/ai.types'
import {
	buildClassifyPrompt,
	buildSummarizePrompt,
	buildTitlePrompt,
	SUMMARIZE_DEFAULT_MAX_CHARS,
	TITLE_MAX_MESSAGES,
	TITLE_MAX_WORDS,
} from '@/services/AI/prompts'
import OpenAIService from '@/services/AI/vendors/OpenAI.service'
import { parseProbabilityScore } from '@/utils/parseProbabilityScore'

/** Teto de entrada por chamada: limita custo e superfície de abuso. */
export const AI_MAX_INPUT_CHARS = 20_000

export const AI_OPERATIONS = {
	GENERATE_TEXT: 'generateText',
	SUMMARIZE: 'summarize',
	GENERATE_TITLE: 'generateTitle',
	CLASSIFY: 'classify',
} as const

type AiOperation = (typeof AI_OPERATIONS)[keyof typeof AI_OPERATIONS]

const QUOTE_AND_MARKDOWN_EDGES = /^["'`*_#\s]+|["'`*_#\s]+$/g

export function sanitizeTitle(raw: string): string {
	const firstLine = raw.split('\n').find((line) => line.trim().length > 0) ?? ''
	const cleaned = firstLine.replace(QUOTE_AND_MARKDOWN_EDGES, '')
	return cleaned.split(/\s+/).filter(Boolean).slice(0, TITLE_MAX_WORDS).join(' ')
}

type AiServiceDependencies = {
	/** `null` quando `AI_PROVIDER=none`. */
	vendor: AiVendorPort | null
	recorder: AiLogRecorderPort
	gate: AiGatePort
}

/**
 * Fachada de IA. Fluxo de toda chamada: flag `ai_enabled` -> vendor -> `AiLog`.
 * Use cases que chamam este serviço devem ser `transactional = false` (chamada externa fora de TX).
 */
export default class AIService implements AiPort {
	private readonly vendor: AiVendorPort | null
	private readonly recorder: AiLogRecorderPort
	private readonly gate: AiGatePort

	constructor(dependencies: AiServiceDependencies) {
		this.vendor = dependencies.vendor
		this.recorder = dependencies.recorder
		this.gate = dependencies.gate
	}

	async generateText(prompt: string, context: AiCallContext = {}): Promise<string> {
		this.assertInputSize(prompt)
		return this.run(AI_OPERATIONS.GENERATE_TEXT, prompt, context)
	}

	async summarize(text: string, options: SummarizeOptions = {}): Promise<string> {
		this.assertInputSize(text)
		const maxChars = options.maxChars ?? SUMMARIZE_DEFAULT_MAX_CHARS
		const summary = await this.run(AI_OPERATIONS.SUMMARIZE, buildSummarizePrompt(text, maxChars), {
			userId: options.userId,
			contextId: options.contextId,
		})

		return summary.length > maxChars ? `${summary.slice(0, maxChars - 1)}…` : summary
	}

	async generateTitle(messages: string[], context: AiCallContext = {}): Promise<string> {
		const recent = messages.slice(0, TITLE_MAX_MESSAGES)
		this.assertInputSize(recent.join('\n'))
		const raw = await this.run(AI_OPERATIONS.GENERATE_TITLE, buildTitlePrompt(recent), context)

		return sanitizeTitle(raw)
	}

	async classify(input: ClassifyInput, context: AiCallContext = {}): Promise<number> {
		this.assertInputSize(input.text)
		const raw = await this.run(AI_OPERATIONS.CLASSIFY, buildClassifyPrompt(input.text, input.criteria), context)

		return parseProbabilityScore(raw)
	}

	private assertInputSize(text: string): void {
		if (!text.trim()) {
			throw new ValidationError('AI input is required')
		}
		if (text.length > AI_MAX_INPUT_CHARS) {
			throw new ValidationError(`AI input exceeds ${AI_MAX_INPUT_CHARS} characters`)
		}
	}

	private async run(operation: AiOperation, prompt: string, context: AiCallContext): Promise<string> {
		if (!(await this.gate.isEnabled())) {
			throw new ServiceUnavailableError('AI is disabled')
		}
		if (!this.vendor) {
			throw new ServiceUnavailableError('AI provider is not configured')
		}

		const result = await this.vendor.generateText({ prompt })
		await this.recordSafely({
			userId: context.userId,
			contextId: context.contextId,
			query: operation,
			model: result.model,
			prompt,
			response: result.text,
			tokenCost: result.tokenCost,
		})

		return result.text
	}

	/** Falha de auditoria não derruba uma resposta já obtida (e paga); fica no log de aplicação. */
	private async recordSafely(entry: AiLogEntry): Promise<void> {
		try {
			await this.recorder.record(entry)
		} catch (error: unknown) {
			LogManager.error('Failed to record AI log', {
				query: entry.query,
				errorName: error instanceof Error ? error.name : undefined,
			})
		}
	}
}

let sharedAiService: AIService | undefined

function createVendor(config: AiConfig): AiVendorPort | null {
	return config.provider === 'openai' ? new OpenAIService(config) : null
}

/** Instância única por processo; com `AI_PROVIDER=none` o serviço responde 503. */
export function getAIService(): AIService {
	if (!sharedAiService) {
		sharedAiService = new AIService({
			vendor: createVendor(getAiConfig()),
			recorder: new AiLogRecorder(),
			gate: { isEnabled: () => isFeatureActive(FEATURE_FLAGS.AI_ENABLED) },
		})
	}
	return sharedAiService
}

/** Test hook — injeta ou limpa a instância compartilhada. */
export function setAIServiceForTests(service: AIService | undefined): void {
	sharedAiService = service
}
