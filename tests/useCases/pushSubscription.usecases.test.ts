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
	it.each([
		ENDPOINT,
		'https://updates.push.services.mozilla.com/wpush/v2/x',
		'https://web.push.apple.com/x',
		'https://wns2-par02p.notify.windows.com/w/?token=abc',
	])('aceita o serviço de push conhecido %s', (endpoint) => {
		expect(isAcceptablePushEndpoint(endpoint)).toBe(true)
	})

	it.each([
		['vazio', ''],
		['não é URL', 'not a url'],
		['http', 'http://fcm.googleapis.com/fcm/send/x'],
		['localhost', 'https://localhost/x'],
		['subdomínio localhost', 'https://app.localhost/x'],
		['.local', 'https://printer.local/x'],
		['credenciais', 'https://user:pass@fcm.googleapis.com/x'],
		['porta explícita', 'https://fcm.googleapis.com:8443/x'],
		['URL longa', `https://fcm.googleapis.com/${'a'.repeat(2100)}`],
	])('recusa %s', (_label, endpoint) => {
		expect(isAcceptablePushEndpoint(endpoint)).toBe(false)
	})

	it.each([
		['IP de metadata de nuvem', 'https://169.254.169.254/latest/meta-data'],
		['loopback IPv4', 'https://127.0.0.1/x'],
		['rede privada', 'https://10.0.0.5/x'],
		['loopback IPv6', 'https://[::1]/x'],
		['IPv4 decimal', 'https://2130706433/x'],
		['IP público que não é serviço de push', 'https://8.8.8.8/x'],
	])('SSRF: recusa %s', (_label, endpoint) => {
		expect(isAcceptablePushEndpoint(endpoint)).toBe(false)
	})

	it.each([
		['host público fora da lista', 'https://push.example.com/x'],
		['sufixo sem a fronteira do ponto', 'https://notfcm.googleapis.com/x'],
		['serviço conhecido como subdomínio de outro domínio', 'https://fcm.googleapis.com.evil.com/x'],
		['serviço conhecido no caminho', 'https://evil.com/fcm.googleapis.com'],
	])('SSRF: recusa %s', (_label, endpoint) => {
		expect(isAcceptablePushEndpoint(endpoint)).toBe(false)
	})

	it('WEB_PUSH_ALLOWED_HOSTS acrescenta um serviço, mas não libera IP nem nome interno', () => {
		const suffixes = ['fcm.googleapis.com', 'push.example.com']

		expect(isAcceptablePushEndpoint('https://eu.push.example.com/x', suffixes)).toBe(true)
		expect(isAcceptablePushEndpoint('https://127.0.0.1/x', suffixes)).toBe(false)
		expect(isAcceptablePushEndpoint('https://app.localhost/x', ['localhost', ...suffixes])).toBe(false)
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
		['endpoint http', { endpoint: 'http://fcm.googleapis.com/x' }],
		['endpoint interno', { endpoint: 'https://localhost/x' }],
		['endpoint com IP literal (SSRF)', { endpoint: 'https://169.254.169.254/x' }],
		['endpoint de host qualquer (SSRF)', { endpoint: 'https://push.example.com/x' }],
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
