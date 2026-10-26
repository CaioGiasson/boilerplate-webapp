import type { MetadataRoute } from 'next'
import { getAppBaseUrl } from '@/config/env'
import { PUBLIC_PAGE_PATHS } from '@/constants/publicPages'
import { DEFAULT_LOCALE, locales } from '@/constants/texts'

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = getAppBaseUrl()
	return PUBLIC_PAGE_PATHS.map((path) => ({
		url: `${baseUrl}/${DEFAULT_LOCALE}${path}`,
		alternates: {
			languages: Object.fromEntries(locales.map((locale) => [locale, `${baseUrl}/${locale}${path}`])),
		},
	}))
}
