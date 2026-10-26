import { IntegrationError } from '@/errors'
import OpenAIService from '@/services/AI/vendors/OpenAI.service'
import { resetExternalBreakersForTests } from '@/services/resilience/externalBreakers'

const CONFIG = { provider: 'openai', apiKey: 'key', textModel: 'gpt-5.4-mini', timeoutMs: 1000 } as const

function completion(content: string | null, totalTokens = 11) {
	return { choices: [{ message: { content } }], usage: { total_tokens: totalTokens } }
}

function build(create: jest.Mock) {
	const client = { chat: { completions: { create } } }
	return new OpenAIService(CONFIG, client as never)
}

describe('OpenAIService.generateText', () => {
	beforeEach(() => {
		resetExternalBreakersForTests()
	})

	it('usa o modelo padrão do config e devolve texto, modelo e tokens', async () => {
		const create = jest.fn(async () => completion('  olá  '))

		const result = await build(create).generateText({ prompt: 'oi' })

		expect(create).toHaveBeenCalledWith({ model: 'gpt-5.4-mini', messages: [{ role: 'user', content: 'oi' }] })
		expect(result).toEqual({ text: 'olá', vendor: 'OPENAI', model: 'gpt-5.4-mini', tokenCost: 11 })
	})

	it('respeita o modelo pedido na chamada', async () => {
		const create = jest.fn(async () => completion('ok'))

		const result = await build(create).generateText({ prompt: 'oi', model: 'outro-modelo' })

		expect(result.model).toBe('outro-modelo')
	})

	it('trata resposta vazia como IntegrationError', async () => {
		const create = jest.fn(async () => completion('   '))

		await expect(build(create).generateText({ prompt: 'oi' })).rejects.toBeInstanceOf(IntegrationError)
	})

	it('retenta uma vez em erro 429 e devolve o resultado da segunda tentativa', async () => {
		const create = jest
			.fn()
			.mockRejectedValueOnce(Object.assign(new Error('rate limit'), { status: 429 }))
			.mockResolvedValueOnce(completion('depois'))

		await expect(build(create).generateText({ prompt: 'oi' })).resolves.toMatchObject({ text: 'depois' })
		expect(create).toHaveBeenCalledTimes(2)
	})

	it('não retenta erro 400 e converte em IntegrationError', async () => {
		const create = jest.fn().mockRejectedValue(Object.assign(new Error('bad request'), { status: 400 }))

		await expect(build(create).generateText({ prompt: 'oi' })).rejects.toBeInstanceOf(IntegrationError)
		expect(create).toHaveBeenCalledTimes(1)
	})
})
