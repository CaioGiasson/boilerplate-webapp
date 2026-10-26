import { NEXT_DEFAULT_ERROR_SNIPPET } from '@/lib/errors/appErrorCopy'

const FATAL_MESSAGE_PATTERNS: readonly RegExp[] = [
	/ChunkLoadError/i,
	/Loading chunk [\w-]+ failed/i,
	/Failed to fetch dynamically imported module/i,
	/error loading dynamically imported module/i,
	/Unable to preload CSS/i,
]

export type FatalClientLoadErrorInput = {
	name?: string | null
	message?: string | null
	/** Offline: falha de chunk é falta de rede, não erro fatal (espelha `public/error-guard.js`). */
	offline?: boolean
}

/** Mesma regra de `public/error-guard.js`; mantenha os dois em sincronia (há teste de paridade). */
export function isFatalClientLoadError(input: FatalClientLoadErrorInput): boolean {
	const name = input.name ?? ''
	const message = input.message ?? ''

	if (!input.offline) {
		if (name === 'ChunkLoadError') {
			return true
		}

		if (FATAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(name) || pattern.test(message))) {
			return true
		}
	}

	return message.includes(NEXT_DEFAULT_ERROR_SNIPPET)
}

export function shouldOpenStaticErrorPage(pathname: string): boolean {
	return pathname !== '/error.html' && !pathname.endsWith('/error.html')
}
