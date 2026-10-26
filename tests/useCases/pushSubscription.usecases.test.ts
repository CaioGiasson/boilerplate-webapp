import RegisterPushSubscription, { isAcceptablePushEndpoint } from '@/useCases/registerPushSubscription.usecase'
import UnregisterPushSubscription from '@/useCases/unregisterPushSubscription.usecase'
import { MAX_PUSH_SUBSCRIPTIONS_PER_USER } from '@/repositories/PushSubscription.repository'
import { ConflictError, ServiceUnavailableError, ValidationError } from '@/errors'
import type { WebPushPort } from '@/services/WebPush/webPush.port'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc'
const INPUT = { userId: 'u1', endpoint: ENDPOINT, p256dh: 'p256', auth: 'auth' }

function webPush(enabled = true): WebPushPort {
	return { isEnabled: () => enabled, getPublicKey: () => (enabled ? 'pub' : null), sendToUser: jest.fn() }
}

function existing(count: number, endpoint?: string) {
	return Array.from({ length: count }, (_, index) => ({
		id: `s${index}`,
		userId: 'u1',
		endpoint: index === 0 && endpoint ? endpoint : `https://push.example.com/${index}`,
		p256dh: 'k',
		auth: 'a',
		createdAt: new Date(),
	}))
}

describe('isAcceptablePushEndpoint', () => {
	it.each([ENDPOINT, 'https://updates.push.services.mozilla.com/wpush/v2/x', 'https://web.push.apple.com/x'])(
		'aceita %s',
		(endpoint) => {
			expect(isAcceptablePushEndpoint(endpoint)).toBe(true)
		}
	)

	it.each([
		'',
		'not a url',
		'http://push.example.com/x',
		'https://localhost/x',
		'https://app.localhost/x',
		'https://printer.local/x',
		'https://user:pass@push.example.com/x',
		`https://push.example.com/${'a'.repeat(2100)}`,
	])('recusa %j', (endpoint) => {
		expect(isAcceptablePushEndpoint(endpoint)).toBe(false)
	})
})

describe('RegisterPushSubscription', () => {
	it('grava a assinatura do usuário', async () => {
		const upsert = jest.fn(async () => undefined)
		mockPrismaRuntime({ pushSubscription: { findMany: jest.fn(async () => []), upsert } })

		await expect(new RegisterPushSubscription(webPush()).run(INPUT)).resolves.toEqual({ ok: true })

		expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { endpoint: ENDPOINT } }))
	})

	it('sem push configurado responde 503', async () => {
		mockPrismaRuntime({ pushSubscription: {} })

		await expect(new RegisterPushSubscription(webPush(false)).run(INPUT)).rejects.toBeInstanceOf(
			ServiceUnavailableError
		)
	})

	it('recusa passar do limite de aparelhos, mas deixa renovar um endpoint já registrado', async () => {
		const upsert = jest.fn(async () => undefined)
		mockPrismaRuntime({
			pushSubscription: { findMany: jest.fn(async () => existing(MAX_PUSH_SUBSCRIPTIONS_PER_USER)), upsert },
		})
		await expect(new RegisterPushSubscription(webPush()).run(INPUT)).rejects.toBeInstanceOf(ConflictError)
		expect(upsert).not.toHaveBeenCalled()

		mockPrismaRuntime({
			pushSubscription: {
				findMany: jest.fn(async () => existing(MAX_PUSH_SUBSCRIPTIONS_PER_USER, ENDPOINT)),
				upsert,
			},
		})
		await expect(new RegisterPushSubscription(webPush()).run(INPUT)).resolves.toEqual({ ok: true })
	})

	it.each([
		['endpoint http', { endpoint: 'http://push.example.com/x' }],
		['endpoint interno', { endpoint: 'https://localhost/x' }],
		['chave vazia', { p256dh: ' ' }],
		['auth vazio', { auth: '' }],
		['chave longa', { p256dh: 'k'.repeat(513) }],
		['userId vazio', { userId: ' ' }],
	])('recusa %s', async (_label, override) => {
		mockPrismaRuntime({ pushSubscription: {} })

		await expect(new RegisterPushSubscription(webPush()).run({ ...INPUT, ...override })).rejects.toBeInstanceOf(
			ValidationError
		)
	})
})

describe('UnregisterPushSubscription', () => {
	it('remove só a assinatura do usuário e informa se removeu', async () => {
		const deleteMany = jest.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
		mockPrismaRuntime({ pushSubscription: { deleteMany } })
		const useCase = new UnregisterPushSubscription()

		await expect(useCase.run({ userId: 'u1', endpoint: ENDPOINT })).resolves.toEqual({ removed: true })
		await expect(useCase.run({ userId: 'u1', endpoint: ENDPOINT })).resolves.toEqual({ removed: false })
		expect(deleteMany).toHaveBeenCalledWith({ where: { endpoint: ENDPOINT, userId: 'u1' } })
	})

	it('exige endpoint', async () => {
		mockPrismaRuntime({ pushSubscription: {} })

		await expect(new UnregisterPushSubscription().run({ userId: 'u1', endpoint: ' ' })).rejects.toBeInstanceOf(
			ValidationError
		)
	})
})
