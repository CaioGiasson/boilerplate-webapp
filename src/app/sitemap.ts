import type { MetadataRoute } from 'next'
import { getAppBaseUrl } from '@/config/env'
import { PUBLIC_PAGE_PATHS } from '@/constants/publicPages'
import { DEFAULT_LOCALE, locales } from '@/constants/texts'

/** Lê `APP_BASE_URL` a cada requisição: sem isto a origem do build ficaria gravada no arquivo estático. */
export const dynamic = 'force-dynamic'

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = getAppBaseUrl()
	return PUBLIC_PAGE_PATHS.map((path) => ({
		url: `${baseUrl}/${DEFAULT_LOCALE}${path}`,
		alternates: {
			languages: Object.fromEntries(locales.map((locale) => [locale, `${baseUrl}/${locale}${path}`])),
		},
	}))
}
