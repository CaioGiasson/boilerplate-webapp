import CheckNicknameAvailability from '@/useCases/checkNicknameAvailability.usecase'
import { NotFoundError, ValidationError } from '@/errors'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'

jest.mock('@/repositories/User.repository', () => {
	return jest.fn().mockImplementation(() => ({
		findByNickname: mockFindByNickname,
	}))
})

const mockFindByNickname = jest.fn()

describe('CheckNicknameAvailability', () => {
	beforeEach(() => {
		mockFindByNickname.mockReset()
		mockPrismaRuntime({})
	})

	it('trata Admin e admin como o mesmo nick (exists)', async () => {
		mockFindByNickname.mockImplementation(async (nickname: string) =>
			nickname === 'admin' ? { id: 'user-1', nickname: 'admin' } : null
		)
		const useCase = new CheckNicknameAvailability()
		await expect(useCase.run({ nickname: 'Admin' })).resolves.toEqual({ exists: true })
	})

	it('404 quando nick canônico livre', async () => {
		mockFindByNickname.mockResolvedValue(null)
		const useCase = new CheckNicknameAvailability()
		await expect(useCase.run({ nickname: 'alice' })).rejects.toBeInstanceOf(NotFoundError)
	})

	it('400 para nickname inválido', async () => {
		const useCase = new CheckNicknameAvailability()
		await expect(useCase.run({ nickname: 'аdmin' })).rejects.toBeInstanceOf(ValidationError)
		expect(mockFindByNickname).not.toHaveBeenCalled()
	})
})
