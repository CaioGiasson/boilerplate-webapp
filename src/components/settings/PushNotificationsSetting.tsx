'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Button } from '@/design-system/Button'
import { Toggle } from '@/design-system/Toggle'
import { useToast } from '@/design-system/Toast'
import { useAuth } from '@/components/auth/AuthProvider'
import {
	disablePush,
	enablePush,
	fetchPushConfig,
	getPushSupport,
	isPushSubscribed,
	sendTestPushRequest,
} from '@/lib/push-client'

type PushState = 'loading' | 'unsupported' | 'not-configured' | 'denied' | 'off' | 'on'

/** Liga/desliga o push **neste aparelho** (assinatura do navegador). Sem VAPID configurado a opção explica por quê. */
export function PushNotificationsSetting() {
	const t = useTranslations('settings.push')
	const { toast } = useToast()
	const { user } = useAuth()
	const [state, setState] = React.useState<PushState>('loading')
	const [busy, setBusy] = React.useState(false)
	const impersonating = Boolean(user?.impersonation)

	React.useEffect(() => {
		let cancelled = false

		const detect = async (): Promise<PushState> => {
			if (getPushSupport() === 'unsupported') return 'unsupported'
			if (!(await fetchPushConfig()).enabled) return 'not-configured'
			if (Notification.permission === 'denied') return 'denied'
			return (await isPushSubscribed()) ? 'on' : 'off'
		}

		detect()
			.then((next) => {
				if (!cancelled) setState(next)
			})
			.catch(() => {
				if (!cancelled) setState('unsupported')
			})

		return () => {
			cancelled = true
		}
	}, [])

	const change = async (enable: boolean) => {
		setBusy(true)
		try {
			if (!enable) {
				await disablePush()
				setState('off')
				toast({ variant: 'success', title: t('disabledToast') })
				return
			}

			const result = await enablePush()
			if (result === 'enabled') {
				setState('on')
				toast({ variant: 'success', title: t('enabledToast') })
			} else {
				setState(
					result === 'denied' ? 'denied' : result === 'not-configured' ? 'not-configured' : 'unsupported'
				)
			}
		} catch {
			toast({ variant: 'error', title: t('failed') })
		} finally {
			setBusy(false)
		}
	}

	const sendTest = async () => {
		setBusy(true)
		try {
			await sendTestPushRequest()
			toast({ variant: 'success', title: t('testSent') })
		} catch {
			toast({ variant: 'error', title: t('failed') })
		} finally {
			setBusy(false)
		}
	}

	const unavailableMessage =
		state === 'unsupported'
			? t('unsupported')
			: state === 'not-configured'
				? t('notConfigured')
				: state === 'denied'
					? t('denied')
					: null

	return (
		<div className="flex flex-col gap-3" data-testid="push-setting">
			{unavailableMessage ? (
				<p className="text-sm text-muted-foreground" data-testid="push-unavailable">
					{unavailableMessage}
				</p>
			) : (
				<div className="flex items-center justify-between gap-4">
					<Label htmlFor="push-toggle">{t('enable')}</Label>
					<Toggle
						id="push-toggle"
						checked={state === 'on'}
						disabled={busy || state === 'loading' || impersonating}
						onCheckedChange={(checked) => void change(checked)}
						data-testid="push-toggle"
					/>
				</div>
			)}

			{state === 'on' && !impersonating ? (
				<div>
					<Button type="button" variant="outline" disabled={busy} onClick={() => void sendTest()}>
						{t('sendTest')}
					</Button>
				</div>
			) : null}
		</div>
	)
}
