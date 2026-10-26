import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import vm from 'node:vm'

const SW_SOURCE = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8')
const ORIGIN = 'https://app.example.com'

type Listener = (event: Record<string, unknown>) => void

class FakeCache {
	readonly store = new Map<string, unknown>()

	async match(request: string | { url: string }) {
		return this.store.get(typeof request === 'string' ? request : new URL(request.url).pathname)
	}

	async put(request: string | { url: string }, response: unknown) {
		this.store.set(typeof request === 'string' ? request : new URL(request.url).pathname, response)
	}

	async delete(request: string) {
		return this.store.delete(request)
	}

	async keys() {
		return [...this.store.keys()]
	}
}

type FetchImpl = (request: unknown) => Promise<unknown>

function loadServiceWorker(fetchImpl: FetchImpl) {
	const listeners: Record<string, Listener> = {}
	const cachesByName = new Map<string, FakeCache>()
	const skipWaiting = jest.fn()
	const claim = jest.fn()
	const showNotification = jest.fn(async () => undefined)
	const matchAll = jest.fn(async () => [] as Array<Record<string, unknown>>)
	const openWindow = jest.fn(async () => undefined)

	const sandbox = {
		self: {
			location: { origin: ORIGIN },
			addEventListener: (name: string, listener: Listener) => {
				listeners[name] = listener
			},
			skipWaiting,
			registration: { showNotification },
			clients: { claim, matchAll, openWindow },
		},
		caches: {
			open: async (name: string) => {
				if (!cachesByName.has(name)) cachesByName.set(name, new FakeCache())
				return cachesByName.get(name)
			},
			keys: async () => [...cachesByName.keys()],
			delete: async (name: string) => cachesByName.delete(name),
		},
		fetch: fetchImpl,
		Response: { error: () => ({ type: 'error' }) },
		URL,
		Promise,
	}
	vm.runInNewContext(SW_SOURCE, sandbox)

	/** Dispara um fetch e devolve a resposta escolhida pelo SW, ou `undefined` se ele não interceptou. */
	async function dispatchFetch(request: { url: string; method?: string; mode?: string }) {
		let responded: Promise<unknown> | undefined
		listeners.fetch({
			request: { method: 'GET', mode: 'cors', ...request },
			respondWith: (promise: Promise<unknown>) => {
				responded = promise
			},
		})
		return responded ? await responded : undefined
	}

	/** Dispara install/activate e espera o que o SW passou para `waitUntil`. */
	async function runLifecycle(name: 'install' | 'activate') {
		let pending: Promise<unknown> = Promise.resolve()
		listeners[name]({ waitUntil: (promise: Promise<unknown>) => (pending = promise) })
		await pending
	}

	return {
		listeners,
		cachesByName,
		dispatchFetch,
		runLifecycle,
		skipWaiting,
		claim,
		showNotification,
		matchAll,
		openWindow,
	}
}

function okResponse(body: string, status = 200) {
	return {
		ok: status < 400,
		status,
		body,
		clone() {
			return this
		},
	}
}

describe('public/sw.js', () => {
	it('não menciona o produto de origem e usa o prefixo de cache app-', () => {
		expect(SW_SOURCE).not.toMatch(/tribal|dungemall|discord/i)
		expect(SW_SOURCE).toContain("const CACHE_PREFIX = 'app-'")
	})

	describe('o que nunca intercepta', () => {
		const sw = () => loadServiceWorker(async () => okResponse('x'))

		it.each([
			[`${ORIGIN}/api/v1/auth/me`, 'GET'],
			[`${ORIGIN}/api/v1/users/me/export`, 'GET'],
			[`${ORIGIN}/sw.js`, 'GET'],
			[`${ORIGIN}/pt/profile`, 'POST'],
			['https://cdn.other.com/a.png', 'GET'],
		])('%s (%s)', async (url, method) => {
			expect(await sw().dispatchFetch({ url, method })).toBeUndefined()
		})

		it('não intercepta chunks em localhost', async () => {
			const loaded = loadServiceWorker(async () => okResponse('x'))
			expect(
				await loaded.dispatchFetch({ url: 'http://localhost:3000/_next/static/chunks/a.js' })
			).toBeUndefined()
		})
	})

	describe('navegação', () => {
		it('devolve a resposta da rede sem guardá-la em cache (HTML autenticado nunca é salvo)', async () => {
			const page = okResponse('<html>perfil</html>')
			const loaded = loadServiceWorker(async () => page)

			const result = await loaded.dispatchFetch({ url: `${ORIGIN}/pt/profile`, mode: 'navigate' })

			expect(result).toBe(page)
			for (const cache of loaded.cachesByName.values()) {
				expect([...cache.store.keys()]).not.toContain('/pt/profile')
			}
		})

		it('sem rede cai em /offline.html', async () => {
			const loaded = loadServiceWorker(async (request) => {
				const url = typeof request === 'string' ? request : (request as { url: string }).url
				if (url === '/offline.html') return okResponse('offline')
				if (url.includes('/pt/profile')) throw new Error('offline')
				return okResponse('asset')
			})
			await loaded.runLifecycle('install')
			const offline = await loaded.cachesByName.get('app-fallback-v1')?.match('/offline.html')
			expect(offline).toBeDefined()

			const result = await loaded.dispatchFetch({ url: `${ORIGIN}/pt/profile`, mode: 'navigate' })

			expect(result).toBe(offline)
		})

		it('erro 5xx cai em /error.html quando ele está em cache, senão devolve a resposta original', async () => {
			const failing = okResponse('boom', 503)
			const loaded = loadServiceWorker(async () => failing)

			expect(await loaded.dispatchFetch({ url: `${ORIGIN}/pt`, mode: 'navigate' })).toBe(failing)

			const cache = new FakeCache()
			const errorPage = okResponse('erro')
			await cache.put('/error.html', errorPage)
			loaded.cachesByName.set('app-fallback-v1', cache)
			expect(await loaded.dispatchFetch({ url: `${ORIGIN}/pt`, mode: 'navigate' })).toBe(errorPage)
		})
	})

	describe('assets', () => {
		it('/_next/static é cache-first em produção', async () => {
			const fetchImpl = jest.fn(async () => okResponse('chunk'))
			const loaded = loadServiceWorker(fetchImpl)

			await loaded.dispatchFetch({ url: `${ORIGIN}/_next/static/chunks/a.js` })
			await loaded.dispatchFetch({ url: `${ORIGIN}/_next/static/chunks/a.js` })

			expect(fetchImpl).toHaveBeenCalledTimes(1)
		})

		it('imagem da mesma origem é stale-while-revalidate', async () => {
			const fetchImpl = jest.fn(async () => okResponse('img'))
			const loaded = loadServiceWorker(fetchImpl)

			await loaded.dispatchFetch({ url: `${ORIGIN}/img/logo.png` })
			const second = await loaded.dispatchFetch({ url: `${ORIGIN}/img/logo.png` })

			expect((second as { body: string }).body).toBe('img')
			expect(fetchImpl).toHaveBeenCalledTimes(2)
		})
	})

	describe('ciclo de vida', () => {
		it('apaga caches antigos com o prefixo app- e preserva os atuais e os alheios', async () => {
			const loaded = loadServiceWorker(async () => okResponse('x'))
			await caches_open(loaded, 'app-static-v1')
			await caches_open(loaded, 'app-static-v0')
			await caches_open(loaded, 'other-cache')

			await loaded.runLifecycle('activate')

			expect([...loaded.cachesByName.keys()].sort()).toEqual(['app-static-v1', 'other-cache'])
			expect(loaded.claim).toHaveBeenCalled()
		})

		it('só ativa a nova versão quando recebe SKIP_WAITING', () => {
			const loaded = loadServiceWorker(async () => okResponse('x'))

			loaded.listeners.message({ data: 'qualquer coisa' })
			expect(loaded.skipWaiting).not.toHaveBeenCalled()

			loaded.listeners.message({ data: 'SKIP_WAITING' })
			expect(loaded.skipWaiting).toHaveBeenCalledTimes(1)
		})
	})
})

describe('public/sw.js — push', () => {
	function pushEvent(payload: unknown) {
		let pending: Promise<unknown> = Promise.resolve()
		const event = {
			data:
				payload === undefined
					? null
					: { json: () => (typeof payload === 'string' ? JSON.parse(payload) : payload) },
			waitUntil: (promise: Promise<unknown>) => {
				pending = promise
			},
		}
		return { event, done: () => pending }
	}

	async function receive(loaded: ReturnType<typeof loadServiceWorker>, payload: unknown) {
		const { event, done } = pushEvent(payload)
		loaded.listeners.push(event)
		await done()
	}

	it('mostra a notificação com título, texto, tag e link seguro', async () => {
		const loaded = loadServiceWorker(async () => okResponse('x'))

		await receive(loaded, { title: 'Olá', text: 'Corpo', link: '/pt/notifications', notificationId: 'n1' })

		expect(loaded.showNotification).toHaveBeenCalledWith('Olá', {
			body: 'Corpo',
			icon: '/pwa-192.png',
			badge: '/pwa-192.png',
			tag: 'n1',
			data: { link: '/pt/notifications', notificationId: 'n1' },
		})
	})

	it('troca link externo ou malicioso por / (open redirect)', async () => {
		const loaded = loadServiceWorker(async () => okResponse('x'))

		for (const link of ['https://evil.com', '//evil.com', 'javascript:alert(1)', '/\\evil.com', 42]) {
			loaded.showNotification.mockClear()
			await receive(loaded, { title: 'T', text: 'x', link })
			expect(loaded.showNotification.mock.calls[0][1]).toMatchObject({ data: { link: '/' } })
		}
	})

	it('payload ausente, inválido ou sem título ainda mostra uma notificação com título padrão', async () => {
		const loaded = loadServiceWorker(async () => okResponse('x'))

		await receive(loaded, undefined)
		await receive(loaded, '{not json')
		await receive(loaded, { text: 'sem título' })

		expect(loaded.showNotification.mock.calls.map((call) => call[0])).toEqual([
			'Notification',
			'Notification',
			'Notification',
		])
	})

	describe('notificationclick', () => {
		async function click(loaded: ReturnType<typeof loadServiceWorker>, link: string) {
			let pending: Promise<unknown> = Promise.resolve()
			const close = jest.fn()
			loaded.listeners.notificationclick({
				notification: { close, data: { link } },
				waitUntil: (promise: Promise<unknown>) => {
					pending = promise
				},
			})
			await pending
			return close
		}

		it('fecha a notificação e abre uma janela quando não há nenhuma', async () => {
			const loaded = loadServiceWorker(async () => okResponse('x'))

			const close = await click(loaded, '/pt/notifications')

			expect(close).toHaveBeenCalled()
			expect(loaded.openWindow).toHaveBeenCalledWith(`${ORIGIN}/pt/notifications`)
		})

		it('reaproveita a janela da mesma origem: foca e navega', async () => {
			const loaded = loadServiceWorker(async () => okResponse('x'))
			const client = {
				url: `${ORIGIN}/pt`,
				focus: jest.fn(async () => undefined),
				navigate: jest.fn(async () => undefined),
			}
			loaded.matchAll.mockResolvedValue([client])

			await click(loaded, '/pt/notifications')

			expect(client.focus).toHaveBeenCalled()
			expect(client.navigate).toHaveBeenCalledWith(`${ORIGIN}/pt/notifications`)
			expect(loaded.openWindow).not.toHaveBeenCalled()
		})

		it('link inseguro abre a raiz do próprio site, nunca outro host', async () => {
			const loaded = loadServiceWorker(async () => okResponse('x'))

			await click(loaded, 'https://evil.com/phish')

			expect(loaded.openWindow).toHaveBeenCalledWith(`${ORIGIN}/`)
		})
	})
})

async function caches_open(loaded: ReturnType<typeof loadServiceWorker>, name: string) {
	loaded.cachesByName.set(name, new FakeCache())
}
