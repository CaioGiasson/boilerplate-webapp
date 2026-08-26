import GetUserStorageStats from '@/useCases/getUserStorageStats.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'

jest.mock('@/repositories/Image.repository', () => {
	return jest.fn().mockImplementation(() => ({
		countActiveByOwner: jest.fn(),
	}))
})

jest.mock('@/repositories/File.repository', () => {
	return jest.fn().mockImplementation(() => ({
		sumPublishedBytesByOwner: jest.fn(),
	}))
})

import ImageRepository from '@/repositories/Image.repository'
import FileRepository from '@/repositories/File.repository'

describe('GetUserStorageStats', () => {
	mockPrismaRuntime({})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('returns image count and used bytes for the owner', async () => {
		const countActiveByOwner = jest.fn().mockResolvedValue(12)
		const sumPublishedBytesByOwner = jest.fn().mockResolvedValue(5_242_880)

		jest.mocked(ImageRepository).mockImplementationOnce(
			() =>
				({
					countActiveByOwner,
				}) as never
		)
		jest.mocked(FileRepository).mockImplementationOnce(
			() =>
				({
					sumPublishedBytesByOwner,
				}) as never
		)

		const useCase = new GetUserStorageStats()
		const result = await useCase.run({ userId: 'user-1' })

		expect(countActiveByOwner).toHaveBeenCalledWith('user-1')
		expect(sumPublishedBytesByOwner).toHaveBeenCalledWith('user-1')
		expect(result).toEqual({ imageCount: 12, usedBytes: 5_242_880 })
	})
})
