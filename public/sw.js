/*
 * Service worker do app (PWA).
 *
 * Regras de segurança e privacidade:
 *  - NUNCA guarda HTML de páginas nem respostas de /api: o conteúdo autenticado não sobrevive ao logout.
 *  - Só guarda assets públicos e imutáveis (/_next/static, ícones, imagens e fontes da mesma origem).
 *  - Offline, navegações caem em /offline.html; erro 5xx cai em /error.html (ambos estáticos e públicos).
 *
 * Mudou algo aqui? Suba SW_VERSION. O cliente recarrega quando a versão do app muda (ForceAppUpdate).
 */
const SW_VERSION = 'v1'
const CACHE_PREFIX = 'app-'
const STATIC_CACHE = `${CACHE_PREFIX}static-v1`
const NEXT_STATIC_CACHE = `${CACHE_PREFIX}next-static-v1`
const FALLBACK_CACHE = `${CACHE_PREFIX}fallback-v1`
const CURRENT_CACHES = [STATIC_CACHE, NEXT_STATIC_CACHE, FALLBACK_CACHE]

const OFFLINE_PATH = '/offline.html'
const ERROR_PATH = '/error.html'
const FALLBACK_URLS = [OFFLINE_PATH, ERROR_PATH, '/theme.js', '/error-guard.js']
const STATIC_PRECACHE_URLS = ['/pwa-192.png', '/pwa-512.png', '/apple-touch-icon.png']

const NEXT_STATIC_CACHE_MAX_ENTRIES = 300
const STATIC_CACHE_MAX_ENTRIES = 100
const STATIC_ASSET_PATTERN = /\.(?:png|jpe?g|webp|gif|svg|ico|woff2?)$/i

self.addEventListener('install', (event) => {
	event.waitUntil(
		Promise.all([cacheUrls(FALLBACK_CACHE, FALLBACK_URLS), cacheUrls(STATIC_CACHE, STATIC_PRECACHE_URLS)])
	)
})

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const names = await caches.keys()
			await Promise.all(
				names
					.filter((name) => name.startsWith(CACHE_PREFIX) && !CURRENT_CACHES.includes(name))
					.map((name) => caches.delete(name))
			)
			await self.clients.claim()
		})()
	)
})

self.addEventListener('message', (event) => {
	if (event.data === 'SKIP_WAITING') {
		void self.skipWaiting()
	}
})

self.addEventListener('fetch', (event) => {
	const request = event.request
	if (request.method !== 'GET') return

	const url = new URL(request.url)
	if (url.origin !== self.location.origin) return
	if (url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return

	if (request.mode === 'navigate') {
		event.respondWith(handleNavigation(request))
		return
	}

	if (isNextStaticPath(url.pathname)) {
		// Em desenvolvimento os chunks mudam sem mudar de nome: não interceptar.
		if (isLocalDevHost(url.hostname)) return
		event.respondWith(cacheFirst(request, NEXT_STATIC_CACHE, NEXT_STATIC_CACHE_MAX_ENTRIES))
		return
	}

	if (STATIC_ASSET_PATTERN.test(url.pathname) && !isLocalDevHost(url.hostname)) {
		event.respondWith(staleWhileRevalidate(request, STATIC_CACHE, STATIC_CACHE_MAX_ENTRIES))
	}
})

function isNextStaticPath(pathname) {
	return pathname.startsWith('/_next/static/')
}

function isLocalDevHost(hostname) {
	return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

async function cacheUrls(cacheName, urls) {
	const cache = await caches.open(cacheName)
	await Promise.all(
		urls.map(async (url) => {
			try {
				const response = await fetch(url, { cache: 'reload' })
				if (response.ok) await cache.put(url, response)
			} catch {
				// Asset opcional: a instalação não depende dele.
			}
		})
	)
}

async function trimCache(cache, maxEntries) {
	const keys = await cache.keys()
	const excess = keys.length - maxEntries
	for (let index = 0; index < excess; index += 1) {
		await cache.delete(keys[index])
	}
}

async function cacheFirst(request, cacheName, maxEntries) {
	const cache = await caches.open(cacheName)
	const cached = await cache.match(request)
	if (cached) return cached

	const response = await fetch(request)
	if (response.ok) {
		await cache.put(request, response.clone())
		await trimCache(cache, maxEntries)
	}
	return response
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
	const cache = await caches.open(cacheName)
	const cached = await cache.match(request)
	const network = fetch(request)
		.then(async (response) => {
			if (response.ok) {
				await cache.put(request, response.clone())
				await trimCache(cache, maxEntries)
			}
			return response
		})
		.catch(() => undefined)

	return cached ?? (await network) ?? Response.error()
}

async function fallbackResponse(path) {
	const cache = await caches.open(FALLBACK_CACHE)
	return cache.match(path)
}

async function handleNavigation(request) {
	try {
		const response = await fetch(request)
		if (response.status >= 500) {
			return (await fallbackResponse(ERROR_PATH)) ?? response
		}
		return response
	} catch {
		return (await fallbackResponse(OFFLINE_PATH)) ?? Response.error()
	}
}
