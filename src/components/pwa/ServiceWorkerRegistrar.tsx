'use client'

import * as React from 'react'

export const SERVICE_WORKER_URL = '/sw.js'

/**
 * Registra o service worker só em produção: em desenvolvimento ele atrapalharia o HMR e o cache do Next.
 * Uma sessão de dev que tenha herdado um SW antigo (mesma origem/porta) o desregistra.
 */
export function ServiceWorkerRegistrar() {
	React.useEffect(() => {
		if (!('serviceWorker' in navigator)) return

		if (process.env.NODE_ENV !== 'production') {
			void navigator.serviceWorker.getRegistrations().then((registrations) => {
				registrations.forEach((registration) => void registration.unregister())
			})
			return
		}

		void navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: '/' }).catch(() => undefined)
	}, [])

	return null
}
