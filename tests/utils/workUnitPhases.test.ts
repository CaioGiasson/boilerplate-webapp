import type { Injectables } from '@/masterPorts/UseCase.masterport'
import { runStorageUploadThenTransaction } from '@/utils/workUnitPhases'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'

describe('workUnitPhases', () => {
	beforeEach(() => {
		mockPrismaRuntime({})
	})

	it('runStorageUploadThenTransaction compensates storage when transaction fails', async () => {
		const storageUpload = jest.fn(async () => ({ url: 'https://cdn.example.com/a.jpg', fileId: 'f1' }))
		const compensateStorage = jest.fn(async () => undefined)
		const transactionPhase = jest.fn(async () => {
			throw new Error('tx failed')
		})

		await expect(
			runStorageUploadThenTransaction({
				storageUpload,
				transactionPhase,
				compensateStorage,
			})
		).rejects.toThrow('tx failed')

		expect(storageUpload).toHaveBeenCalledTimes(1)
		expect(transactionPhase).toHaveBeenCalledTimes(1)
		expect(compensateStorage).toHaveBeenCalledWith(expect.anything(), {
			url: 'https://cdn.example.com/a.jpg',
			fileId: 'f1',
		})
	})

	it('runStorageUploadThenTransaction runs afterTransaction on success', async () => {
		const afterTransaction = jest.fn(async () => undefined)

		const result = await runStorageUploadThenTransaction({
			storageUpload: async () => ({ token: 'a' }),
			transactionPhase: async (_injectables: Injectables, storage) => ({ ok: storage.token }),
			compensateStorage: async () => undefined,
			afterTransaction,
		})

		expect(result).toEqual({ ok: 'a' })
		expect(afterTransaction).toHaveBeenCalledWith(expect.anything(), { token: 'a' }, { ok: 'a' })
	})
})
