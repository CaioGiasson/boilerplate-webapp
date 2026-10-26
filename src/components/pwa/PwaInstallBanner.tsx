'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/design-system/Button'
import { useAuth } from '@/components/auth/AuthProvider'
import {
	isPwaInstalled,
	isStandaloneDisplay,
	markPwaInstalled,
	STANDALONE_DISPLAY_MODES,
} from '@/lib/pwa/isPwaInstalled'

export const PWA_DISMISS_STORAGE_KEY = 'app-pwa-install-dismissed'

type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<void>
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type BannerMode = 'hidden' | 'prompt' | 'ios'

function isIosDevice(): boolean {
	const ua = window.navigator.userAgent
	if (/iphone|ipad|ipod/i.test(ua)) return true
	return window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1
}

function wasDismissed(): boolean {
	try {
		return window.localStorage.getItem(PWA_DISMISS_STORAGE_KEY) === '1'
	} catch {
		return false
	}
}

/** Convite para instalar o app: botão nativo quando o navegador oferece, passo a passo no iOS. Só para quem está logado. */
export function PwaInstallBanner() {
	const t = useTranslations('pwa')
	const { user, loading } = useAuth()
	const [mode, setMode] = React.useState<BannerMode>('hidden')
	const promptRef = React.useRef<BeforeInstallPromptEvent | null>(null)

	const hide = React.useCallback(() => setMode('hidden'), [])

	const dismiss = React.useCallback(() => {
		try {
			window.localStorage.setItem(PWA_DISMISS_STORAGE_KEY, '1')
		} catch {
			// Sem armazenamento, o banner volta na próxima visita.
		}
		hide()
	}, [hide])

	React.useEffect(() => {
		const onInstalled = () => {
			markPwaInstalled()
			hide()
		}
		window.addEventListener('appinstalled', onInstalled)

		const queries = STANDALONE_DISPLAY_MODES.map((displayMode) =>
			window.matchMedia(`(display-mode: ${displayMode})`)
		)
		const onDisplayModeChange = () => {
			if (isStandaloneDisplay()) {
				markPwaInstalled()
				hide()
			}
		}
		queries.forEach((query) => query.addEventListener('change', onDisplayModeChange))

		return () => {
			window.removeEventListener('appinstalled', onInstalled)
			queries.forEach((query) => query.removeEventListener('change', onDisplayModeChange))
		}
	}, [hide])

	React.useEffect(() => {
		if (loading || !user || isPwaInstalled() || wasDismissed()) {
			hide()
			return
		}
		if (isIosDevice()) {
			setMode('ios')
			return
		}

		const onPrompt = (event: Event) => {
			event.preventDefault()
			promptRef.current = event as BeforeInstallPromptEvent
			setMode('prompt')
		}
		window.addEventListener('beforeinstallprompt', onPrompt)
		return () => window.removeEventListener('beforeinstallprompt', onPrompt)
	}, [hide, loading, user])

	const install = async () => {
		const prompt = promptRef.current
		if (!prompt) return

		await prompt.prompt()
		const choice = await prompt.userChoice.catch(() => ({ outcome: 'dismissed' as const }))
		if (choice.outcome === 'accepted') {
			markPwaInstalled()
			hide()
			return
		}
		dismiss()
	}

	if (mode === 'hidden') return null

	return (
		<div
			className="sticky bottom-0 z-30 border-t border-border bg-background px-4 py-3 text-sm text-foreground"
			data-testid="pwa-install-banner"
		>
			<p className="font-medium">{mode === 'ios' ? t('iosTitle') : t('installTitle')}</p>
			{mode === 'ios' ? (
				<ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
					<li>{t('iosShare')}</li>
					<li>{t('iosAdd')}</li>
				</ol>
			) : (
				<p className="mt-1 text-muted-foreground">{t('installDescription')}</p>
			)}
			<div className="mt-3 flex flex-wrap gap-2">
				{mode === 'prompt' ? (
					<Button type="button" onClick={() => void install()} data-testid="pwa-install-cta">
						{t('installCta')}
					</Button>
				) : null}
				<Button type="button" variant="outline" onClick={dismiss} data-testid="pwa-install-dismiss">
					{t('dismiss')}
				</Button>
			</div>
		</div>
	)
}
