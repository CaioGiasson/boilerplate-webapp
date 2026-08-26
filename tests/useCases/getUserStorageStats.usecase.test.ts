import GetUserStorageStats from '@/useCases/getUserStorageStats.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'

jest.mock('@/repositories/File.repository', () => {
	return jest.fn().mockImplementation(() => ({
		countPublishedByOwner: jest.fn(),
		sumPublishedBytesByOwner: jest.fn(),
	}))
})

import FileRepository from '@/repositories/File.repository'

describe('GetUserStorageStats', () => {
	mockPrismaRuntime({})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('returns file count and used bytes for the owner', async () => {
		const countPublishedByOwner = jest.fn().mockResolvedValue(12)
		const sumPublishedBytesByOwner = jest.fn().mockResolvedValue(5_242_880)

		jest.mocked(FileRepository).mockImplementationOnce(
			() =>
				({
					countPublishedByOwner,
					sumPublishedBytesByOwner,
				}) as never
		)

		const useCase = new GetUserStorageStats()
		const result = await useCase.run({ userId: 'user-1' })

		expect(countPublishedByOwner).toHaveBeenCalledWith('user-1')
		expect(sumPublishedBytesByOwner).toHaveBeenCalledWith('user-1')
		expect(result).toEqual({ fileCount: 12, usedBytes: 5_242_880 })
	})
})
