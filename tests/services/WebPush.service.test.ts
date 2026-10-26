import WebPushService, { MAX_PUSH_JSON_BYTES, buildPushBody } from '@/services/WebPush/WebPush.service'

const VAPID = { publicKey: 'pub', privateKey: 'priv', subject: 'mailto:ops@example.com' }

function subscription(id: string) {
	return {
		id,
		userId: 'user-1',
		endpoint: `https://push.example.com/${id}`,
		p256dh: 'p256',
		auth: 'auth',
		createdAt: new Date('2026-10-26T00:00:00.000Z'),
	}
}

function build(options: {
	subscriptions?: ReturnType<typeof subscription>[]
	sender?: jest.Mock
	vapid?: typeof VAPID | null
}) {
	const store = {
		list: jest.fn(async () => options.subscriptions ?? []),
		deleteExpired: jest.fn(async () => undefined),
	}
	const sender = options.sender ?? jest.fn(async () => undefined)
	const vapid = options.vapid === undefined ? VAPID : options.vapid
	const service = new WebPushService(vapid, store, vapid ? sender : undefined)
	return { service, store, sender }
}

describe('buildPushBody', () => {
	it('serializa título, texto, link e id da notificação', () => {
		const body = JSON.parse(buildPushBody({ title: 'T', text: 'x', link: '/a', notificationId: 'n1' }))

		expect(body).toEqual({ title: 'T', text: 'x', link: '/a', notificationId: 'n1' })
	})

	it('omite link e id quando ausentes', () => {
		expect(JSON.parse(buildPushBody({ title: 'T', text: 'x' }))).toEqual({ title: 'T', text: 'x' })
	})

	it('corta o texto para o JSON caber em 4 KB preservando título e link', () => {
		const payload = { title: 'Título', text: 'á'.repeat(5000), link: '/notifications', notificationId: 'n1' }

		const raw = buildPushBody(payload)
		const body = JSON.parse(raw)

		expect(Buffer.byteLength(raw, 'utf8')).toBeLessThanOrEqual(MAX_PUSH_JSON_BYTES)
		expect(body.title).toBe('Título')
		expect(body.link).toBe('/notifications')
		expect(body.text.endsWith('…')).toBe(true)
		expect(body.text.length).toBeLessThan(payload.text.length)
	})
})

describe('WebPushService', () => {
	it('sem VAPID fica desligado e não consulta nem envia', async () => {
		const { service, store, sender } = build({ vapid: null, subscriptions: [subscription('a')] })

		expect(service.isEnabled()).toBe(false)
		expect(service.getPublicKey()).toBeNull()
		await service.sendToUser('user-1', { title: 'T', text: 'x' })

		expect(store.list).not.toHaveBeenCalled()
		expect(sender).not.toHaveBeenCalled()
	})

	it('com VAPID expõe a chave pública e envia a todos os aparelhos', async () => {
		const { service, sender } = build({ subscriptions: [subscription('a'), subscription('b')] })

		expect(service.isEnabled()).toBe(true)
		expect(service.getPublicKey()).toBe('pub')
		await service.sendToUser('user-1', { title: 'T', text: 'x', link: '/n' })

		expect(sender).toHaveBeenCalledTimes(2)
		expect(sender).toHaveBeenCalledWith(
			{ endpoint: 'https://push.example.com/a', keys: { p256dh: 'p256', auth: 'auth' } },
			expect.stringContaining('"title":"T"'),
			{ TTL: 3600 }
		)
	})

	it('não faz nada se o usuário não tem aparelhos', async () => {
		const { service, sender } = build({ subscriptions: [] })

		await service.sendToUser('user-1', { title: 'T', text: 'x' })

		expect(sender).not.toHaveBeenCalled()
	})

	it.each([404, 410])('remove a assinatura expirada quando o serviço responde %i', async (statusCode) => {
		const sender = jest.fn().mockRejectedValue(Object.assign(new Error('gone'), { statusCode }))
		const { service, store } = build({ subscriptions: [subscription('a')], sender })

		await expect(service.sendToUser('user-1', { title: 'T', text: 'x' })).resolves.toBeUndefined()

		expect(store.deleteExpired).toHaveBeenCalledWith('https://push.example.com/a')
	})

	it('falha de um aparelho não derruba nem impede os demais, e não apaga a assinatura', async () => {
		const sender = jest
			.fn()
			.mockRejectedValueOnce(Object.assign(new Error('boom'), { statusCode: 500 }))
			.mockResolvedValueOnce(undefined)
		const { service, store } = build({ subscriptions: [subscription('a'), subscription('b')], sender })

		await expect(service.sendToUser('user-1', { title: 'T', text: 'x' })).resolves.toBeUndefined()

		expect(sender).toHaveBeenCalledTimes(2)
		expect(store.deleteExpired).not.toHaveBeenCalled()
	})
})
