import type { MetadataRoute } from 'next'
import { getAppBaseUrl } from '@/config/env'

/** Lê `APP_BASE_URL` a cada requisição: sem isto a origem do build ficaria gravada no arquivo estático. */
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
	const baseUrl = getAppBaseUrl()
	return {
		rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
		sitemap: `${baseUrl}/sitemap.xml`,
	}
}
