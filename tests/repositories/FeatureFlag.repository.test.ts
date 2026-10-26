import { RepositoryError, ValidationError } from '@/errors'
import FeatureFlagRepository from '@/repositories/FeatureFlag.repository'

describe('FeatureFlagRepository.findLatestValue', () => {
	it('busca o registro mais recente da chave normalizada', async () => {
		const findFirst = jest.fn(async () => ({ value: true }))
		const repository = new FeatureFlagRepository({ featureFlag: { findFirst } } as never)

		await expect(repository.findLatestValue('  ai_enabled ')).resolves.toBe(true)
		expect(findFirst).toHaveBeenCalledWith({
			where: { key: 'ai_enabled' },
			orderBy: { createdAt: 'desc' },
			select: { value: true },
		})
	})

	it('retorna null quando a chave nunca foi gravada', async () => {
		const repository = new FeatureFlagRepository({ featureFlag: { findFirst: jest.fn(async () => null) } } as never)

		await expect(repository.findLatestValue('missing')).resolves.toBeNull()
	})

	it('retorna null para chave vazia sem consultar o banco', async () => {
		const findFirst = jest.fn()
		const repository = new FeatureFlagRepository({ featureFlag: { findFirst } } as never)

		await expect(repository.findLatestValue('   ')).resolves.toBeNull()
		expect(findFirst).not.toHaveBeenCalled()
	})

	it('converte falha do banco em RepositoryError', async () => {
		const findFirst = jest.fn(async () => {
			throw new Error('down')
		})
		const repository = new FeatureFlagRepository({ featureFlag: { findFirst } } as never)

		await expect(repository.findLatestValue('ai_enabled')).rejects.toBeInstanceOf(RepositoryError)
	})
})

describe('FeatureFlagRepository.append', () => {
	it('insere um registro novo sem apagar o histórico', async () => {
		const create = jest.fn(async () => undefined)
		const repository = new FeatureFlagRepository({ featureFlag: { create } } as never)

		await repository.append(' ai_enabled ', false)

		expect(create).toHaveBeenCalledWith({ data: { key: 'ai_enabled', value: false } })
	})

	it('recusa chave vazia', async () => {
		const create = jest.fn()
		const repository = new FeatureFlagRepository({ featureFlag: { create } } as never)

		await expect(repository.append('  ', true)).rejects.toBeInstanceOf(ValidationError)
		expect(create).not.toHaveBeenCalled()
	})
})
