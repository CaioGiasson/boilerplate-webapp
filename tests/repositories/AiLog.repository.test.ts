import { RepositoryError } from '@/errors'
import AiLogRepository, { AI_LOG_EXPORT_MAX_ROWS } from '@/repositories/AiLog.repository'

describe('AiLogRepository.create', () => {
	it('normaliza campos opcionais e arredonda tokens para inteiro não negativo', async () => {
		const create = jest.fn(async () => undefined)
		const repository = new AiLogRepository({ aiLog: { create } } as never)

		await repository.create({
			userId: ' user-1 ',
			contextId: '  ',
			query: ' summarize ',
			model: ' gpt-5.4-mini ',
			prompt: 'p',
			response: 'r',
			tokenCost: 12.9,
		})

		expect(create).toHaveBeenCalledWith({
			data: {
				userId: 'user-1',
				contextId: null,
				query: 'summarize',
				model: 'gpt-5.4-mini',
				prompt: 'p',
				response: 'r',
				tokenCost: 12,
			},
		})
	})

	it('grava chamada de sistema sem userId e zera tokens negativos', async () => {
		const create = jest.fn(async () => undefined)
		const repository = new AiLogRepository({ aiLog: { create } } as never)

		await repository.create({ query: 'q', model: 'm', prompt: 'p', response: 'r', tokenCost: -5 })

		expect(create).toHaveBeenCalledWith({
			data: expect.objectContaining({ userId: null, tokenCost: 0 }),
		})
	})

	it('converte falha do banco em RepositoryError', async () => {
		const create = jest.fn(async () => {
			throw new Error('down')
		})
		const repository = new AiLogRepository({ aiLog: { create } } as never)

		await expect(
			repository.create({ query: 'q', model: 'm', prompt: 'p', response: 'r', tokenCost: 1 })
		).rejects.toBeInstanceOf(RepositoryError)
	})
})

describe('AiLogRepository consultas', () => {
	const since = new Date('2026-10-01T00:00:00.000Z')

	it('conta chamadas do usuário por operação desde a data', async () => {
		const count = jest.fn(async () => 3)
		const repository = new AiLogRepository({ aiLog: { count } } as never)

		await expect(repository.countByUserSince({ userId: 'u1', query: 'summarize', since })).resolves.toBe(3)
		expect(count).toHaveBeenCalledWith({
			where: { userId: 'u1', query: 'summarize', createdAt: { gte: since } },
		})
	})

	it('soma tokens e devolve 0 quando não há registros', async () => {
		const aggregate = jest.fn(async () => ({ _sum: { tokenCost: null } }))
		const repository = new AiLogRepository({ aiLog: { aggregate } } as never)

		await expect(repository.sumTokensByUserSince({ userId: 'u1', since })).resolves.toBe(0)
	})

	it('lista do mais recente ao mais antigo respeitando o teto de exportação', async () => {
		const findMany = jest.fn(async () => [])
		const repository = new AiLogRepository({ aiLog: { findMany } } as never)

		await repository.listByUser('u1')

		expect(findMany).toHaveBeenCalledWith({
			where: { userId: 'u1' },
			orderBy: { createdAt: 'desc' },
			take: AI_LOG_EXPORT_MAX_ROWS,
		})
	})
})
