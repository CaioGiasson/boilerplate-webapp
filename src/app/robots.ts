import type { MetadataRoute } from 'next'
import { getAppBaseUrl } from '@/config/env'

export default function robots(): MetadataRoute.Robots {
	const baseUrl = getAppBaseUrl()
	return {
		rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
		sitemap: `${baseUrl}/sitemap.xml`,
	}
}
