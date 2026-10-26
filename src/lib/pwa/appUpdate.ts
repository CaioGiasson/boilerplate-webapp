export const APP_VERSION_PATH = '/api/v1/version'
export const VERSION_POLL_MS = 5 * 60 * 1000
export const FORCE_UPDATE_RELOAD_DELAY_MS = 1800

export function parseServerVersion(body: unknown): string | null {
	if (!body || typeof body !== 'object') return null
	const data = (body as { data?: unknown }).data
	if (!data || typeof data !== 'object') return null
	const version = (data as { version?: unknown }).version
	if (typeof version !== 'string') return null
	const trimmed = version.trim()
	return trimmed.length > 0 ? trimmed : null
}

/** Qualquer diferença recarrega: a versão só muda quando alguém altera `version` no package.json. */
export function shouldForceAppUpdate(clientVersion: string, serverVersion: string): boolean {
	return clientVersion !== serverVersion
}

/**
 * Não recarrega enquanto a pessoa digita: um reload perderia o que ainda não foi enviado.
 * A checagem seguinte (poll ou volta à aba) tenta de novo.
 */
export function shouldDeferReload(active: Element | null): boolean {
	if (!active) return false
	const tag = active.tagName
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
	return (active as HTMLElement).isContentEditable === true
}

export async function applyForcedUpdate(): Promise<void> {
	if ('serviceWorker' in navigator) {
		const registrations = await navigator.serviceWorker.getRegistrations()
		await Promise.all(
			registrations.map(async (registration) => {
				await registration.update().catch(() => undefined)
				registration.waiting?.postMessage('SKIP_WAITING')
			})
		)
	}
	window.location.reload()
}
