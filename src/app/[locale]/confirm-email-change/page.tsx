'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Button, Title } from '@/design-system'
import { confirmEmailChallengeRequest } from '@/lib/auth-client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Link } from '@/i18n/navigation'
import type { AppLocale } from '@/constants/texts'

function ConfirmEmailChangeContent() {
	const t = useTranslations('profile')
	const locale = useLocale()
	const searchParams = useSearchParams()
	const { refresh } = useAuth()
	const [status, setStatus] = React.useState<'loading' | 'success' | 'pending_new' | 'error'>('loading')

	React.useEffect(() => {
		const token = searchParams.get('token')?.trim()
		if (!token) {
			setStatus('error')
			return
		}

		let cancelled = false
		void confirmEmailChallengeRequest({ token, locale: locale as AppLocale })
			.then(async (result) => {
				if (cancelled) {
					return
				}
				setStatus(result.user.emailChallenge === 'change_new' ? 'pending_new' : 'success')
				await refresh()
			})
			.catch(() => {
				if (!cancelled) {
					setStatus('error')
				}
			})

		return () => {
			cancelled = true
		}
	}, [locale, refresh, searchParams])

	return (
		<div className="mx-auto w-full max-w-md space-y-6 p-4 sm:p-6" data-testid="confirm-email-change-page">
			<Title as="h1">{t('confirmEmailChangeTitle')}</Title>
			{status === 'loading' ? <p className="text-sm text-muted-foreground">…</p> : null}
			{status === 'success' ? <p className="text-sm text-foreground">{t('confirmEmailChangeSuccess')}</p> : null}
			{status === 'pending_new' ? (
				<p className="text-sm text-foreground">{t('confirmEmailChangePendingNew')}</p>
			) : null}
			{status === 'error' ? <p className="text-sm text-destructive">{t('confirmEmailChangeError')}</p> : null}
			<Button asChild>
				<Link href="/profile">{t('goToProfile')}</Link>
			</Button>
		</div>
	)
}

export default function ConfirmEmailChangePage() {
	return (
		<React.Suspense fallback={null}>
			<ConfirmEmailChangeContent />
		</React.Suspense>
	)
}
