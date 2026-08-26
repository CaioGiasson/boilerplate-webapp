import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/managers/Cookies.manager'

export type ThemeMode = 'light' | 'dark'

/**
 * Resolve o tema no servidor somente quando há evidência confiável:
 * cookie explícito ou Client Hint. Caso contrário retorna null
 * (o ThemeScript + client resolvem via prefers-color-scheme).
 */
export async function resolveServerTheme(preferDarkFromHeader?: boolean | null): Promise<ThemeMode | null> {
	const cookieStore = await cookies()
	const themeCookie = cookieStore.get(COOKIE_KEYS.THEME)?.value

	if (themeCookie === 'dark' || themeCookie === 'light') {
		return themeCookie
	}

	if (preferDarkFromHeader === true) {
		return 'dark'
	}

	if (preferDarkFromHeader === false) {
		return 'light'
	}

	return null
}
