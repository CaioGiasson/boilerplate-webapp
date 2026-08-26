import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import bundleAnalyzer from '@next/bundle-analyzer'
import { buildSecurityHeaders } from './src/config/securityHeaders'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })

const nextConfig: NextConfig = {
	experimental: {
		globalNotFound: true,
	},
	async headers() {
		const security = buildSecurityHeaders({
			nodeEnv: process.env.NODE_ENV,
			spacesEndpoint: process.env.SPACES_ENDPOINT,
			spacesBucket: process.env.SPACES_BUCKET,
			spacesPublicBaseUrl: process.env.SPACES_PUBLIC_BASE_URL,
		})
		return [
			{
				source: '/:path*',
				headers: security,
			},
			{
				// Static public assets (CACHE-02) — not personalized HTML/API
				source: '/theme.js',
				headers: [
					...security,
					{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
				],
			},
			{
				source: '/favicon.ico',
				headers: [
					...security,
					{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
				],
			},
		]
	},
}

export default withBundleAnalyzer(withNextIntl(nextConfig))
