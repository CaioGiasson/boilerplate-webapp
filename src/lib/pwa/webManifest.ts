import type { MetadataRoute } from 'next'
import { APP_NAME } from '@/constants/app'

export const PWA_THEME_COLOR = '#121212'
export const PWA_BACKGROUND_COLOR = '#121212'

export function buildWebManifest(appName: string = APP_NAME): MetadataRoute.Manifest {
	return {
		name: appName,
		short_name: appName,
		description: `${appName} — starter webapp`,
		start_url: '/',
		display: 'standalone',
		background_color: PWA_BACKGROUND_COLOR,
		theme_color: PWA_THEME_COLOR,
		icons: [
			{ src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
			{ src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
			{ src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
		],
	}
}
