/**
 * @jest-environment jsdom
 */
import { disablePush, enablePush, getPushSupport, urlBase64ToUint8Array } from '@/lib/push-client'

const fetchApi = jest.fn()

jest.mock('@/lib/api-error', () => ({
	fetchApi: (...args: unknown[]) => fetchApi(...args),
	parseApiResponse: async (response: { json: () => Promise<{ data: unknown }> }) => (await response.json()).data,
}))

function apiResponse(data: unknown) {
	return { ok: true, status: 200, json: async () => ({ success: true, data }) }
}

type FakeSubscription = { endpoint: string; toJSON: () => unknown; unsubscribe: jest.Mock }

function installBrowserPush(options: {
	permission?: NotificationPermission
	existing?: FakeSubscription | null
	subscribed?: FakeSubscription
}) {
	const getSubscription = jest.fn(async () => options.existing ?? null)
	const subscribe = jest.fn(async () => options.subscribed)
	Object.defineProperty(window.navigator, 'serviceWorker', {
		value: { ready: Promise.resolve({ pushManager: { getSubscription, subscribe } }) },
		configurable: true,
	})
	;(window as unknown as { PushManager: unknown }).PushManager = class {}
	;(window as unknown as { Notification: unknown }).Notification = {
		permission: options.permission ?? 'default',
		requestPermission: jest.fn(async () => options.permission ?? 'granted'),
	}
	return { getSubscription, subscribe }
}

function subscription(endpoint = 'https://push.example.com/a'): FakeSubscription {
	return {
		endpoint,
		toJSON: () => ({ endpoint, keys: { p256dh: 'p', auth: 'a' } }),
		unsubscribe: jest.fn(async () => true),
	}
}

describe('urlBase64ToUint8Array', () => {
	it('decodifica base64url com e sem padding', () => {
		expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3])
		expect(Array.from(urlBase64ToUint8Array('AQI'))).toEqual([1, 2])
		expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255])
	})
})

describe('getPushSupport', () => {
	it('exige service worker, PushManager e Notification', () => {
		installBrowserPush({})
		expect(getPushSupport()).toBe('supported')

		delete (window as unknown as { PushManager?: unknown }).PushManager
		expect(getPushSupport()).toBe('unsupported')
	})
})

describe('enablePush', () => {
	beforeEach(() => {
		fetchApi.mockReset()
	})

	it('não assina sem suporte do navegador', async () => {
		installBrowserPush({})
		delete (window as unknown as { PushManager?: unknown }).PushManager

		await expect(enablePush()).resolves.toBe('unsupported')
		expect(fetchApi).not.toHaveBeenCalled()
	})

	it('avisa quando o servidor não tem VAPID configurado, sem pedir permissão', async () => {
		installBrowserPush({})
		fetchApi.mockResolvedValueOnce(apiResponse({ enabled: false, publicKey: null }))

		await expect(enablePush()).resolves.toBe('not-configured')
		expect(
			(window as unknown as { Notification: { requestPermission: jest.Mock } }).Notification.requestPermission
		).not.toHaveBeenCalled()
	})

	it('permissão negada não assina', async () => {
		const push = installBrowserPush({ permission: 'denied' })
		fetchApi.mockResolvedValueOnce(apiResponse({ enabled: true, publicKey: 'AQID' }))

		await expect(enablePush()).resolves.toBe('denied')
		expect(push.subscribe).not.toHaveBeenCalled()
	})

	it('assina com a chave VAPID e registra a assinatura no servidor', async () => {
		const subscribed = subscription()
		const push = installBrowserPush({ permission: 'granted', subscribed })
		fetchApi
			.mockResolvedValueOnce(apiResponse({ enabled: true, publicKey: 'AQID' }))
			.mockResolvedValueOnce(apiResponse({ ok: true }))

		await expect(enablePush()).resolves.toBe('enabled')

		expect(push.subscribe).toHaveBeenCalledWith({
			userVisibleOnly: true,
			applicationServerKey: expect.any(Uint8Array),
		})
		expect(fetchApi).toHaveBeenLastCalledWith(
			'/api/v1/push/subscriptions',
			expect.objectContaining({ method: 'POST', body: JSON.stringify(subscribed.toJSON()) })
		)
	})

	it('reaproveita a assinatura existente do navegador', async () => {
		const existing = subscription()
		const push = installBrowserPush({ permission: 'granted', existing })
		fetchApi
			.mockResolvedValueOnce(apiResponse({ enabled: true, publicKey: 'AQID' }))
			.mockResolvedValueOnce(apiResponse({ ok: true }))

		await enablePush()

		expect(push.subscribe).not.toHaveBeenCalled()
	})
})

describe('disablePush', () => {
	beforeEach(() => {
		fetchApi.mockReset()
	})

	it('cancela no navegador e no servidor', async () => {
		const existing = subscription('https://push.example.com/z')
		installBrowserPush({ existing })
		fetchApi.mockResolvedValueOnce(apiResponse({ removed: true }))

		await disablePush()

		expect(existing.unsubscribe).toHaveBeenCalled()
		expect(fetchApi).toHaveBeenCalledWith(
			'/api/v1/push/subscriptions',
			expect.objectContaining({
				method: 'DELETE',
				body: JSON.stringify({ endpoint: 'https://push.example.com/z' }),
			})
		)
	})

	it('sem assinatura local não chama o servidor', async () => {
		installBrowserPush({ existing: null })

		await disablePush()

		expect(fetchApi).not.toHaveBeenCalled()
	})
})
