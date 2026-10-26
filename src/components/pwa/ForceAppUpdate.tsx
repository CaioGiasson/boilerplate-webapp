'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { APP_VERSION } from '@/constants/app'
import {
	APP_VERSION_PATH,
	applyForcedUpdate,
	FORCE_UPDATE_RELOAD_DELAY_MS,
	parseServerVersion,
	shouldDeferReload,
	shouldForceAppUpdate,
	VERSION_POLL_MS,
} from '@/lib/pwa/appUpdate'

/**
 * Consulta `/api/v1/version` a cada 5 min e ao voltar para a aba. Se a versão do servidor difere da do bundle,
 * mostra um aviso e recarrega — exceto enquanto a pessoa digita num campo (o próximo check tenta de novo).
 */
export function ForceAppUpdate() {
	const t = useTranslations('pwa')
	/** Quantas vezes o servidor confirmou versão diferente; muda a cada check e reavalia o adiamento. */
	const [mismatchChecks, setMismatchChecks] = React.useState(0)
	const [reloading, setReloading] = React.useState(false)

	React.useEffect(() => {
		let cancelled = false

		const check = async () => {
			try {
				const response = await fetch(APP_VERSION_PATH, { cache: 'no-store' })
				if (!response.ok) return
				const serverVersion = parseServerVersion(await response.json())
				if (!serverVersion || cancelled) return
				if (shouldForceAppUpdate(APP_VERSION, serverVersion)) {
					setMismatchChecks((count) => count + 1)
				}
			} catch {
				// Offline ou endpoint inacessível: mantém o bundle atual, sem estado de update nem tela de erro.
			}
		}

		void check()
		const intervalId = window.setInterval(() => void check(), VERSION_POLL_MS)
		const onVisible = () => {
			if (document.visibilityState === 'visible') void check()
		}
		document.addEventListener('visibilitychange', onVisible)

		return () => {
			cancelled = true
			window.clearInterval(intervalId)
			document.removeEventListener('visibilitychange', onVisible)
		}
	}, [])

	React.useEffect(() => {
		if (mismatchChecks === 0 || reloading) return
		if (shouldDeferReload(document.activeElement)) return
		setReloading(true)
	}, [mismatchChecks, reloading])

	React.useEffect(() => {
		if (!reloading) return
		const timeoutId = window.setTimeout(() => {
			void applyForcedUpdate()
		}, FORCE_UPDATE_RELOAD_DELAY_MS)
		return () => window.clearTimeout(timeoutId)
	}, [reloading])

	if (!reloading) return null

	return (
		<div
			className="fixed inset-0 z-[250] flex items-center justify-center bg-background/90 p-6 text-foreground"
			data-testid="force-app-update"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="force-app-update-title"
			aria-describedby="force-app-update-body"
		>
			<div className="max-w-sm text-center">
				<p id="force-app-update-title" className="font-medium">
					{t('updateTitle')}
				</p>
				<p id="force-app-update-body" className="mt-2 text-sm text-muted-foreground">
					{t('updateBody')}
				</p>
			</div>
		</div>
	)
}
