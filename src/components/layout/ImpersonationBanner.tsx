'use client'

import * as React from 'react'
import { TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/design-system/Button'
import { Icon } from '@/design-system/Icon'
import { useAuth } from '@/components/auth/AuthProvider'

export const APP_BANNER_HEIGHT_VAR = '--app-banner-h'

export function formatRemaining(seconds: number): string {
	const safe = Math.max(0, seconds)
	const minutes = Math.floor(safe / 60)
	const rest = safe % 60
	return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function secondsUntil(iso: string): number {
	return Math.ceil((new Date(iso).getTime() - Date.now()) / 1000)
}

/**
 * Faixa no topo de toda tela enquanto a sessão é de impersonamento. Fica no fluxo e publica a própria altura
 * em `--app-banner-h` para o shell descontar do `100vh`. Ao zerar o tempo, relê a sessão (que já expirou).
 */
export function ImpersonationBanner() {
	const t = useTranslations('impersonation')
	const { user, logout, refresh } = useAuth()
	const expiresAt = user?.impersonation?.expiresAt ?? null
	const nickname = user?.nickname ?? ''
	const [remaining, setRemaining] = React.useState(() => (expiresAt ? secondsUntil(expiresAt) : 0))
	const ref = React.useRef<HTMLDivElement>(null)

	React.useEffect(() => {
		if (!expiresAt) return
		const tick = () => setRemaining(secondsUntil(expiresAt))
		tick()
		const interval = window.setInterval(tick, 1000)
		return () => window.clearInterval(interval)
	}, [expiresAt])

	React.useEffect(() => {
		if (expiresAt && remaining <= 0) void refresh()
	}, [expiresAt, remaining, refresh])

	React.useEffect(() => {
		const root = document.documentElement
		if (!expiresAt || !ref.current) {
			root.style.removeProperty(APP_BANNER_HEIGHT_VAR)
			return
		}
		root.style.setProperty(APP_BANNER_HEIGHT_VAR, `${ref.current.offsetHeight}px`)
		return () => {
			root.style.removeProperty(APP_BANNER_HEIGHT_VAR)
		}
	}, [expiresAt])

	if (!expiresAt) return null

	return (
		<div
			ref={ref}
			role="status"
			aria-label={t('sessionActive')}
			className="flex flex-wrap items-center justify-center gap-3 bg-destructive px-4 py-2 text-sm text-white"
			data-testid="impersonation-banner"
		>
			<Icon icon={TriangleAlert} className="h-4 w-4" />
			<span className="font-medium">{t('banner', { nickname })}</span>
			<span className="tabular-nums">{t('remaining', { time: formatRemaining(remaining) })}</span>
			<Button type="button" size="sm" variant="secondary" onClick={() => void logout()}>
				{t('exit')}
			</Button>
		</div>
	)
}
