import CreateNotification from '@/useCases/createNotification.usecase'
import ListNotifications from '@/useCases/listNotifications.usecase'
import MarkAllNotificationsRead from '@/useCases/markAllNotificationsRead.usecase'
import MarkNotificationRead from '@/useCases/markNotificationRead.usecase'
import SendTestPushNotification from '@/useCases/sendTestPushNotification.usecase'
import { NotFoundError, ServiceUnavailableError, ValidationError } from '@/errors'
import type { WebPushPort } from '@/services/WebPush/webPush.port'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'

const CREATED_AT = new Date('2026-10-26T12:00:00.000Z')

function row(overrides: Record<string, unknown> = {}) {
	return {
		id: 'n1',
		userId: 'u1',
		type: 'TEST',
		title: 'Título',
		text: 'Texto',
		link: null,
		readAt: null,
		createdAt: CREATED_AT,
		...overrides,
	}
}

function fakeWebPush(options: { enabled?: boolean; failWith?: Error } = {}): WebPushPort & { sendToUser: jest.Mock } {
	return {
		isEnabled: () => options.enabled ?? true,
		getPublicKey: () => (options.enabled === false ? null : 'pub'),
		sendToUser: jest.fn(async () => {
			if (options.failWith) throw options.failWith
		}),
	}
}

describe('CreateNotification', () => {
	const input = { userId: 'u1', type: 'TEST', title: ' Título ', text: ' Texto ', link: '/notifications' }

	it('grava o sino e dispara o push com o id da notificação', async () => {
		const create = jest.fn(async ({ data }: { data: Record<string, unknown> }) => row(data))
		mockPrismaRuntime({ notification: { create } })
		const webPush = fakeWebPush()

		const result = await new CreateNotification(webPush).run(input)

		expect(create).toHaveBeenCalledWith({
			data: { userId: 'u1', type: 'TEST', title: 'Título', text: 'Texto', link: '/notifications' },
		})
		expect(result.notification.title).toBe('Título')
		expect(webPush.sendToUser).toHaveBeenCalledWith('u1', {
			title: 'Título',
			text: 'Texto',
			link: '/notifications',
			notificationId: 'n1',
		})
	})

	it('skipWebPush grava só o sino', async () => {
		mockPrismaRuntime({ notification: { create: jest.fn(async () => row()) } })
		const webPush = fakeWebPush()

		await new CreateNotification(webPush).run({ ...input, skipWebPush: true })

		expect(webPush.sendToUser).not.toHaveBeenCalled()
	})

	it('sem push configurado grava só o sino', async () => {
		mockPrismaRuntime({ notification: { create: jest.fn(async () => row()) } })
		const webPush = fakeWebPush({ enabled: false })

		await new CreateNotification(webPush).run(input)

		expect(webPush.sendToUser).not.toHaveBeenCalled()
	})

	it('falha do push nunca desfaz a notificação já gravada', async () => {
		mockPrismaRuntime({ notification: { create: jest.fn(async () => row()) } })

		await expect(
			new CreateNotification(fakeWebPush({ failWith: new Error('push down') })).run(input)
		).resolves.toMatchObject({
			notification: { id: 'n1' },
		})
	})

	it.each([
		['userId vazio', { userId: ' ' }],
		['type vazio', { type: '' }],
		['type longo', { type: 'x'.repeat(65) }],
		['title vazio', { title: ' ' }],
		['title longo', { title: 'x'.repeat(201) }],
		['text vazio', { text: '' }],
		['text longo', { text: 'x'.repeat(4001) }],
		['link externo', { link: 'https://evil.com' }],
		['link protocol-relative', { link: '//evil.com' }],
	])('recusa %s antes de gravar', async (_label, override) => {
		const create = jest.fn()
		mockPrismaRuntime({ notification: { create } })

		await expect(new CreateNotification(fakeWebPush()).run({ ...input, ...override })).rejects.toBeInstanceOf(
			ValidationError
		)
		expect(create).not.toHaveBeenCalled()
	})
})

describe('ListNotifications', () => {
	it('devolve DTO sem userId, indica não lidas e a próxima página', async () => {
		const rows = [
			row({ id: 'n3', createdAt: new Date('2026-10-26T12:03:00.000Z') }),
			row({ id: 'n2', createdAt: new Date('2026-10-26T12:02:00.000Z'), readAt: CREATED_AT }),
			row({ id: 'n1', createdAt: new Date('2026-10-26T12:01:00.000Z') }),
		]
		const findMany = jest.fn(async () => rows)
		mockPrismaRuntime({ notification: { findMany, count: jest.fn(async () => 2) } })

		const result = await new ListNotifications().run({ userId: 'u1', limit: 2 })

		expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }))
		expect(result.items.map((item) => [item.id, item.read])).toEqual([
			['n3', false],
			['n2', true],
		])
		expect(result.items[0]).not.toHaveProperty('userId')
		expect(result.unreadCount).toBe(2)
		expect(result.nextBefore).toBe('2026-10-26T12:02:00.000Z')
	})

	it('na última página nextBefore é null', async () => {
		mockPrismaRuntime({ notification: { findMany: jest.fn(async () => [row()]), count: jest.fn(async () => 1) } })

		const result = await new ListNotifications().run({ userId: 'u1' })

		expect(result.nextBefore).toBeNull()
	})

	it.each([
		['limit 0', { limit: 0 }],
		['limit acima do teto', { limit: 51 }],
		['limit fracionário', { limit: 1.5 }],
		['before inválido', { before: 'ontem' }],
	])('recusa %s', async (_label, override) => {
		mockPrismaRuntime({ notification: {} })

		await expect(new ListNotifications().run({ userId: 'u1', ...override })).rejects.toBeInstanceOf(ValidationError)
	})
})

describe('MarkNotificationRead', () => {
	const ID = '507f1f77bcf86cd799439011'

	it('marca como lida', async () => {
		const updateMany = jest.fn(async () => ({ count: 1 }))
		mockPrismaRuntime({ notification: { updateMany } })

		await expect(new MarkNotificationRead().run({ userId: 'u1', notificationId: ID })).resolves.toEqual({
			ok: true,
		})
		expect(updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ id: ID, userId: 'u1' }) })
		)
	})

	it('notificação de outro dono ou inexistente responde 404 igual', async () => {
		mockPrismaRuntime({
			notification: { updateMany: jest.fn(async () => ({ count: 0 })), findFirst: jest.fn(async () => null) },
		})

		await expect(new MarkNotificationRead().run({ userId: 'u1', notificationId: ID })).rejects.toBeInstanceOf(
			NotFoundError
		)
	})

	it('id que não é ObjectId responde 404 sem consultar o banco', async () => {
		const updateMany = jest.fn()
		mockPrismaRuntime({ notification: { updateMany } })

		await expect(new MarkNotificationRead().run({ userId: 'u1', notificationId: 'abc' })).rejects.toBeInstanceOf(
			NotFoundError
		)
		expect(updateMany).not.toHaveBeenCalled()
	})
})

describe('MarkAllNotificationsRead', () => {
	it('devolve quantas foram marcadas, só do usuário', async () => {
		const updateMany = jest.fn(async () => ({ count: 5 }))
		mockPrismaRuntime({ notification: { updateMany } })

		await expect(new MarkAllNotificationsRead().run({ userId: 'u1' })).resolves.toEqual({ updatedCount: 5 })
		expect(updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ userId: 'u1' }) })
		)
	})
})

describe('SendTestPushNotification', () => {
	it('cria a notificação de teste no idioma pedido, com link para /notifications', async () => {
		const create = jest.fn(async ({ data }: { data: Record<string, unknown> }) => row(data))
		mockPrismaRuntime({ notification: { create } })
		const webPush = fakeWebPush()
		const useCase = new SendTestPushNotification(new CreateNotification(webPush), webPush)

		await expect(useCase.run({ userId: 'u1', locale: 'en' })).resolves.toEqual({ ok: true })

		expect(create).toHaveBeenCalledWith({
			data: expect.objectContaining({ type: 'TEST', title: 'Test notification', link: '/notifications' }),
		})
		expect(webPush.sendToUser).toHaveBeenCalledTimes(1)
	})

	it('sem push configurado responde 503 sem criar nada', async () => {
		const create = jest.fn()
		mockPrismaRuntime({ notification: { create } })
		const webPush = fakeWebPush({ enabled: false })

		await expect(
			new SendTestPushNotification(new CreateNotification(webPush), webPush).run({ userId: 'u1', locale: 'pt' })
		).rejects.toBeInstanceOf(ServiceUnavailableError)
		expect(create).not.toHaveBeenCalled()
	})
})
