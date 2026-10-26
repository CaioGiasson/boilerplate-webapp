import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import bundleAnalyzer from '@next/bundle-analyzer'
import { buildSameOriginFrameableHeaders, buildSecurityHeaders } from './src/config/securityHeaders'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })

const nextConfig: NextConfig = {
	// Dependências com CJS/Node nativo que não devem ser empacotadas pelo webpack.
	serverExternalPackages: ['web-push', 'sharp'],
	experimental: {
		globalNotFound: true,
	},
	async headers() {
		const securityEnv = {
			nodeEnv: process.env.NODE_ENV,
			spacesEndpoint: process.env.SPACES_ENDPOINT,
			spacesBucket: process.env.SPACES_BUCKET,
			spacesPublicBaseUrl: process.env.SPACES_PUBLIC_BASE_URL,
		}
		const security = buildSecurityHeaders(securityEnv)
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
				source: '/error-guard.js',
				headers: [
					...security,
					{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
				],
			},
			{
				// O service worker precisa ser revalidado a cada carga, senão uma versão com bug fica presa no navegador.
				source: '/sw.js',
				headers: [
					...security,
					{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
					{ key: 'Service-Worker-Allowed', value: '/' },
				],
			},
			{
				source: '/offline.html',
				headers: [
					...security,
					{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
				],
			},
			{
				// O error-guard.js embute esta página em iframe do mesmo site, então ela não pode ter DENY.
				source: '/error.html',
				headers: [
					...buildSameOriginFrameableHeaders(securityEnv),
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
