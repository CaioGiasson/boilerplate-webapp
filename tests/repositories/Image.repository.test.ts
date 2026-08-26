import ImageRepository from '@/repositories/Image.repository'

describe('ImageRepository.listDistinctTagsByOwner', () => {
	it('retorna tags distintas em ordem alfabética crescente', async () => {
		const findMany = jest.fn(async () => [
			{ tags: ['zebra', '  Banana'] },
			{ tags: ['apple', 'banana', 'zebra', ''] },
		])
		const repository = new ImageRepository({
			image: { findMany },
		} as never)

		const tags = await repository.listDistinctTagsByOwner('owner-1')

		expect(findMany).toHaveBeenCalled()
		expect(tags).toEqual(['apple', 'Banana', 'banana', 'zebra'])
	})

	it('retorna lista vazia quando o usuário não tem tags', async () => {
		const repository = new ImageRepository({
			image: { findMany: jest.fn(async () => []) },
		} as never)

		await expect(repository.listDistinctTagsByOwner('owner-1')).resolves.toEqual([])
	})
})

describe('ImageRepository.listDistinctTags', () => {
	it('lista tags de todas as imagens quando ownerId é omitido', async () => {
		const findMany = jest.fn(async () => [{ tags: ['glass'] }, { tags: ['light', 'glass'] }])
		const repository = new ImageRepository({
			image: { findMany },
		} as never)

		const tags = await repository.listDistinctTags()

		expect(findMany).toHaveBeenCalled()
		expect(tags).toEqual(['glass', 'light'])
	})
})
