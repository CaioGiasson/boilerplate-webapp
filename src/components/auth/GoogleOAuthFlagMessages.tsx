'use client'

import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import * as React from 'react'

function GoogleOAuthFlagMessagesInner() {
	const t = useTranslations('auth')
	const searchParams = useSearchParams()
	const emailChangeCancelled = searchParams.get('emailChangeCancelled') === '1'
	const googleEmailUnverified = searchParams.get('googleEmailUnverified') === '1'

	if (!emailChangeCancelled && !googleEmailUnverified) {
		return null
	}

	return (
		<div className="space-y-2" data-testid="google-oauth-flags">
			{emailChangeCancelled ? (
				<p className="text-sm text-amber-700 dark:text-amber-400" role="status">
					{t('emailChangeCancelledMessage')}
				</p>
			) : null}
			{googleEmailUnverified ? (
				<p className="text-sm text-amber-700 dark:text-amber-400" role="status">
					{t('googleEmailUnverifiedMessage')}
				</p>
			) : null}
		</div>
	)
}

export function GoogleOAuthFlagMessages() {
	return (
		<React.Suspense fallback={null}>
			<GoogleOAuthFlagMessagesInner />
		</React.Suspense>
	)
}
