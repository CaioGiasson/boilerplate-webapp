export const COOKIE_KEYS = {
	THEME: 'app-theme',
	LOCALE: 'app-locale',
} as const

export type CookieKey = (typeof COOKIE_KEYS)[keyof typeof COOKIE_KEYS]

type SetCookieOptions = {
	path?: string
	maxAgeSeconds?: number
	sameSite?: 'lax' | 'strict' | 'none'
	secure?: boolean
}

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

/**
 * Gerencia cookies no browser com API get/set tipada.
 */
export default class CookiesManager {
	static get(key: string): string | null {
		if (typeof document === 'undefined') {
			return null
		}

		const encodedKey = encodeURIComponent(key)
		const cookies = document.cookie.split(';')

		for (const cookie of cookies) {
			const [rawKey, ...rawValueParts] = cookie.trim().split('=')
			if (rawKey === encodedKey) {
				return decodeURIComponent(rawValueParts.join('='))
			}
		}

		return null
	}

	static set(key: string, value: string, options: SetCookieOptions = {}): void {
		if (typeof document === 'undefined') {
			return
		}

		const path = options.path ?? '/'
		const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS
		const sameSite = options.sameSite ?? 'lax'
		const secure = options.secure ?? (typeof window !== 'undefined' && window.location.protocol === 'https:')

		let cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; path=${path}; max-age=${maxAgeSeconds}; samesite=${sameSite}`

		if (secure) {
			cookie += '; secure'
		}

		document.cookie = cookie
	}
}
