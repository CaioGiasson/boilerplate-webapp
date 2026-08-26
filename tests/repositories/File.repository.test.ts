import { ConflictError } from '@/errors'
import FileRepository from '@/repositories/File.repository'

describe('FileRepository.findByKey', () => {
	it('retorna o documento quando a key existe', async () => {
		const file = { id: 'file-1', key: 'abc/images/deadbeef.jpg' }
		const findUnique = jest.fn(async () => file)
		const repository = new FileRepository({
			file: { findUnique },
		} as never)

		await expect(repository.findByKey(file.key)).resolves.toEqual(file)
		expect(findUnique).toHaveBeenCalledWith({ where: { key: file.key } })
	})

	it('retorna null quando a key não existe', async () => {
		const findUnique = jest.fn(async () => null)
		const repository = new FileRepository({
			file: { findUnique },
		} as never)

		await expect(repository.findByKey('missing-key')).resolves.toBeNull()
	})
})

describe('FileRepository.createPending', () => {
	it('converte P2002 em ConflictError', async () => {
		const create = jest.fn(async () => {
			throw { code: 'P2002' }
		})
		const repository = new FileRepository({
			file: { create },
		} as never)

		await expect(
			repository.createPending({
				key: 'dup-key',
				url: 'https://cdn.example.com/dup-key',
				category: 'images',
				mimeType: 'image/jpeg',
				sizeBytes: 10,
				ownerId: 'owner-1',
			})
		).rejects.toBeInstanceOf(ConflictError)
	})
})
