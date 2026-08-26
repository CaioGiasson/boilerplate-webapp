import type { NextRequest } from 'next/server'
import { locales, type AppLocale } from '@/constants/texts'

/**
 * Prefer body/query locale; else first Accept-Language tag matching app locales; else en.
 */
export function resolveRequestLocale(request: NextRequest, bodyLocale?: string | null): AppLocale {
	const fromBody = bodyLocale?.trim().toLowerCase()
	if (fromBody && (locales as readonly string[]).includes(fromBody)) {
		return fromBody as AppLocale
	}

	const header = request.headers.get('accept-language') ?? ''
	const primary = header.split(',')[0]?.trim().slice(0, 2).toLowerCase()
	if (primary && (locales as readonly string[]).includes(primary)) {
		return primary as AppLocale
	}

	return 'en'
}
