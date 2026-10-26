import { RepositoryError } from '@/errors'
import NotificationRepository from '@/repositories/Notification.repository'
import PushSubscriptionRepository from '@/repositories/PushSubscription.repository'

const AT = new Date('2026-10-26T12:00:00.000Z')

describe('NotificationRepository', () => {
	it('cria sem link como null', async () => {
		const create = jest.fn(async ({ data }: { data: object }) => ({ id: 'n1', ...data }))
		const repository = new NotificationRepository({ notification: { create } } as never)

		await repository.create({ userId: 'u1', type: 'TEST', title: 'T', text: 'x' })

		expect(create).toHaveBeenCalledWith({ data: { userId: 'u1', type: 'TEST', title: 'T', text: 'x', link: null } })
	})

	it('lista mais recentes primeiro e pagina por createdAt', async () => {
		const findMany = jest.fn(async () => [])
		const repository = new NotificationRepository({ notification: { findMany } } as never)

		await repository.listByUser({ userId: 'u1', before: AT, limit: 21 })

		expect(findMany).toHaveBeenCalledWith({
			where: { userId: 'u1', createdAt: { lt: AT } },
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
			take: 21,
		})
	})

	it('conta não lidas tratando readAt nulo ou ausente', async () => {
		const count = jest.fn(async () => 3)
		const repository = new NotificationRepository({ notification: { count } } as never)

		await expect(repository.countUnread('u1')).resolves.toBe(3)
		expect(count).toHaveBeenCalledWith({
			where: { userId: 'u1', OR: [{ readAt: null }, { readAt: { isSet: false } }] },
		})
	})

	describe('markRead', () => {
		it('só atualiza notificações do próprio usuário', async () => {
			const updateMany = jest.fn(async () => ({ count: 1 }))
			const repository = new NotificationRepository({ notification: { updateMany } } as never)

			await expect(repository.markRead({ id: 'n1', userId: 'u1', at: AT })).resolves.toBe(true)
			expect(updateMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({ id: 'n1', userId: 'u1' }),
					data: { readAt: AT },
				})
			)
		})

		it('já lida do mesmo dono continua sendo sucesso', async () => {
			const repository = new NotificationRepository({
				notification: {
					updateMany: jest.fn(async () => ({ count: 0 })),
					findFirst: jest.fn(async () => ({ id: 'n1' })),
				},
			} as never)

			await expect(repository.markRead({ id: 'n1', userId: 'u1', at: AT })).resolves.toBe(true)
		})

		it('inexistente ou de outro dono devolve false', async () => {
			const repository = new NotificationRepository({
				notification: { updateMany: jest.fn(async () => ({ count: 0 })), findFirst: jest.fn(async () => null) },
			} as never)

			await expect(repository.markRead({ id: 'n1', userId: 'u1', at: AT })).resolves.toBe(false)
		})
	})

	it('markAllRead devolve a quantidade atualizada', async () => {
		const updateMany = jest.fn(async () => ({ count: 4 }))
		const repository = new NotificationRepository({ notification: { updateMany } } as never)

		await expect(repository.markAllRead({ userId: 'u1', at: AT })).resolves.toBe(4)
	})

	it('converte falha do banco em RepositoryError', async () => {
		const repository = new NotificationRepository({
			notification: {
				count: jest.fn(async () => {
					throw new Error('down')
				}),
			},
		} as never)

		await expect(repository.countUnread('u1')).rejects.toBeInstanceOf(RepositoryError)
	})
})

describe('PushSubscriptionRepository', () => {
	it('upsert por endpoint transfere o aparelho para a conta que se inscreveu por último', async () => {
		const upsert = jest.fn(async () => undefined)
		const repository = new PushSubscriptionRepository({ pushSubscription: { upsert } } as never)
		const input = { userId: 'u2', endpoint: 'https://push.example.com/a', p256dh: 'k', auth: 'a' }

		await repository.upsertByEndpoint(input)

		expect(upsert).toHaveBeenCalledWith({
			where: { endpoint: input.endpoint },
			create: input,
			update: { userId: 'u2', p256dh: 'k', auth: 'a' },
		})
	})

	it('cancelar só remove a assinatura do próprio usuário', async () => {
		const deleteMany = jest.fn(async () => ({ count: 1 }))
		const repository = new PushSubscriptionRepository({ pushSubscription: { deleteMany } } as never)

		await expect(repository.deleteByEndpoint({ userId: 'u1', endpoint: 'e' })).resolves.toBe(1)
		expect(deleteMany).toHaveBeenCalledWith({ where: { endpoint: 'e', userId: 'u1' } })
	})

	it('limpeza de expirada apaga por endpoint, sem filtrar dono', async () => {
		const deleteMany = jest.fn(async () => ({ count: 1 }))
		const repository = new PushSubscriptionRepository({ pushSubscription: { deleteMany } } as never)

		await repository.deleteExpiredByEndpoint('e')

		expect(deleteMany).toHaveBeenCalledWith({ where: { endpoint: 'e' } })
	})
})
