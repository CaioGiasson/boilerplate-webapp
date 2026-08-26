import RecoverOrGenerateExample from '@/useCases/recoverOrGenerateExample.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import ExampleService from '@/services/Example/Example.service'
import { ValidationError } from '@/errors'

describe('RecoverOrGenerateExample', () => {
	const exampleService = {
		generate: jest.fn(),
	} as unknown as ExampleService

	mockPrismaRuntime({})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('deve rejeitar identifier vazio', async () => {
		const useCase = new RecoverOrGenerateExample(exampleService)

		await expect(useCase.run({ identifier: '' })).rejects.toBeInstanceOf(ValidationError)
	})
})
