import { ServiceUnavailableError, ValidationError } from '@/errors'
import AIService, { AI_MAX_INPUT_CHARS, AI_OPERATIONS, sanitizeTitle } from '@/services/AI/AI.service'
import { FakeAIVendor, FakeAiLogRecorder } from '../../helpers/fakeAIVendor'

function build(options: { enabled?: boolean; vendor?: FakeAIVendor | null; recorder?: FakeAiLogRecorder } = {}) {
	const vendor = options.vendor === undefined ? new FakeAIVendor() : options.vendor
	const recorder = options.recorder ?? new FakeAiLogRecorder()
	const service = new AIService({
		vendor,
		recorder,
		gate: { isEnabled: async () => options.enabled ?? true },
	})
	return { service, vendor, recorder }
}

describe('AIService', () => {
	it('responde 503 quando a flag ai_enabled está desligada, sem chamar o fornecedor', async () => {
		const { service, vendor, recorder } = build({ enabled: false })

		await expect(service.generateText('oi')).rejects.toBeInstanceOf(ServiceUnavailableError)
		expect(vendor?.requests).toHaveLength(0)
		expect(recorder.entries).toHaveLength(0)
	})

	it('responde 503 quando não há fornecedor configurado (AI_PROVIDER=none)', async () => {
		const { service } = build({ vendor: null })

		await expect(service.generateText('oi')).rejects.toBeInstanceOf(ServiceUnavailableError)
	})

	it('grava o AiLog com operação, modelo, prompt, resposta, tokens e contexto', async () => {
		const { service, recorder } = build()

		await expect(service.generateText('ola', { userId: 'u1', contextId: 'ctx' })).resolves.toBe('resposta')

		expect(recorder.entries).toEqual([
			{
				userId: 'u1',
				contextId: 'ctx',
				query: AI_OPERATIONS.GENERATE_TEXT,
				model: 'fake-model',
				prompt: 'ola',
				response: 'resposta',
				tokenCost: 7,
			},
		])
	})

	it('não grava AiLog quando o fornecedor falha', async () => {
		const failing = new FakeAIVendor(() => {
			throw new Error('boom')
		})
		const { service, recorder } = build({ vendor: failing })

		await expect(service.generateText('oi')).rejects.toThrow('boom')
		expect(recorder.entries).toHaveLength(0)
	})

	it('devolve a resposta mesmo se a gravação do AiLog falhar', async () => {
		const { service } = build({ recorder: new FakeAiLogRecorder(new Error('db down')) })

		await expect(service.generateText('oi')).resolves.toBe('resposta')
	})

	it.each(['', '   '])('recusa entrada vazia (%p)', async (input) => {
		const { service } = build()

		await expect(service.generateText(input)).rejects.toBeInstanceOf(ValidationError)
	})

	it('recusa entrada acima do teto de caracteres', async () => {
		const { service, vendor } = build()

		await expect(service.summarize('a'.repeat(AI_MAX_INPUT_CHARS + 1))).rejects.toBeInstanceOf(ValidationError)
		expect(vendor?.requests).toHaveLength(0)
	})

	describe('summarize', () => {
		it('delimita o texto no prompt e registra a operação summarize', async () => {
			const { service, vendor, recorder } = build()

			await service.summarize('texto original', { userId: 'u1' })

			expect(vendor?.requests[0].prompt).toContain('<texto>\ntexto original\n</texto>')
			expect(recorder.entries[0].query).toBe(AI_OPERATIONS.SUMMARIZE)
		})

		it('corta o resumo no limite de caracteres', async () => {
			const vendor = new FakeAIVendor(() => ({ text: 'x'.repeat(50), vendor: 'FAKE', model: 'm', tokenCost: 1 }))
			const { service } = build({ vendor })

			const summary = await service.summarize('texto', { maxChars: 10 })

			expect(summary).toHaveLength(10)
			expect(summary.endsWith('…')).toBe(true)
		})
	})

	describe('generateTitle', () => {
		it('limpa aspas e limita a 8 palavras', async () => {
			const vendor = new FakeAIVendor(() => ({
				text: '"um dois três quatro cinco seis sete oito nove dez"',
				vendor: 'FAKE',
				model: 'm',
				tokenCost: 1,
			}))
			const { service } = build({ vendor })

			await expect(service.generateTitle(['a', 'b'])).resolves.toBe('um dois três quatro cinco seis sete oito')
		})

		it('usa só as 20 mensagens mais recentes', async () => {
			const { service, vendor } = build()
			const messages = Array.from({ length: 25 }, (_, index) => `mensagem-${index}`)

			await service.generateTitle(messages)

			const prompt = vendor?.requests[0].prompt ?? ''
			expect(prompt).toContain('mensagem-19')
			expect(prompt).not.toContain('mensagem-20')
		})
	})

	describe('classify', () => {
		it.each([
			['85', 85],
			['Nota: 140', 100],
			['sem número', 0],
		])('converte a resposta %p em nota %p', async (text, expected) => {
			const vendor = new FakeAIVendor(() => ({ text, vendor: 'FAKE', model: 'm', tokenCost: 1 }))
			const { service } = build({ vendor })

			await expect(service.classify({ text: 'mensagem', criteria: 'pede suporte' })).resolves.toBe(expected)
		})
	})
})

describe('sanitizeTitle', () => {
	it('usa a primeira linha não vazia e remove marcações das bordas', () => {
		expect(sanitizeTitle('\n\n**Título legal**\noutra linha')).toBe('Título legal')
	})

	it('devolve vazio para resposta vazia', () => {
		expect(sanitizeTitle('   ')).toBe('')
	})
})
