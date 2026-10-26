import { DEFAULT_LOCALE, locales, messagesByLocale, type AppLocale } from '@/constants/texts'

export const APP_ERROR_HTML_PATH = '/error.html'

export const NEXT_DEFAULT_ERROR_SNIPPET = 'Application error: a client-side exception'

export function isAppLocale(value: string): value is AppLocale {
	return (locales as readonly string[]).includes(value)
}

export type ResolveAppErrorLocaleParams = {
	cookieLocale?: string | null
	pathname?: string | null
}

export function resolveAppErrorLocale(params: ResolveAppErrorLocaleParams): AppLocale {
	const cookie = params.cookieLocale?.trim()
	if (cookie && isAppLocale(cookie)) {
		return cookie
	}

	const firstSegment = params.pathname?.split('/').filter(Boolean)[0]
	if (firstSegment && isAppLocale(firstSegment)) {
		return firstSegment
	}

	return DEFAULT_LOCALE
}

/** Texto da tela de erro fora do `NextIntlClientProvider` (global-error), vindo dos catálogos `error.*`. */
export function appErrorMessageForLocale(locale: AppLocale): string {
	const { title, description } = messagesByLocale[locale].error
	return `${title}\n\n${description}`
}
