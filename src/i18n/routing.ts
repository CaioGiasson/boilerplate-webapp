import { defineRouting } from 'next-intl/routing'
import { COOKIE_KEYS } from '@/managers/Cookies.manager'
import { DEFAULT_LOCALE, locales } from '@/constants/texts'

export const routing = defineRouting({
	locales: [...locales],
	defaultLocale: DEFAULT_LOCALE,
	localePrefix: 'always',
	localeCookie: {
		name: COOKIE_KEYS.LOCALE,
	},
})
