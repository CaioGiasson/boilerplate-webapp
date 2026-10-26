import { ValidationError } from '@/errors'
import SummarizeText from '@/useCases/summarizeText.usecase'
import type { AiPort } from '@/services/AI/ai.port'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'

function buildAiPort(summarize: jest.Mock): AiPort {
	return { summarize, generateText: jest.fn(), generateTitle: jest.fn(), classify: jest.fn() }
}

describe('SummarizeText', () => {
	beforeEach(() => {
		mockPrismaRuntime({})
	})

	it('resume o texto em nome do usuário', async () => {
		const summarize = jest.fn(async () => 'resumo')

		const result = await new SummarizeText(buildAiPort(summarize)).run({ userId: 'u1', text: 'texto longo' })

		expect(result).toEqual({ summary: 'resumo' })
		expect(summarize).toHaveBeenCalledWith('texto longo', { userId: 'u1' })
	})

	it('valida usuário e texto antes de chamar a IA', async () => {
		const summarize = jest.fn()
		const useCase = new SummarizeText(buildAiPort(summarize))

		await expect(useCase.run({ userId: ' ', text: 'x' })).rejects.toBeInstanceOf(ValidationError)
		await expect(useCase.run({ userId: 'u1', text: '  ' })).rejects.toBeInstanceOf(ValidationError)
		expect(summarize).not.toHaveBeenCalled()
	})
})
