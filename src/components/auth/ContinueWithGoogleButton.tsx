'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Button, GoogleIcon } from '@/design-system'
import { fetchGoogleOAuthReady, startGoogleOAuth } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

function ContinueWithGoogleButtonInner() {
	const t = useTranslations('auth')
	const searchParams = useSearchParams()
	const [ready, setReady] = React.useState(false)
	const [checking, setChecking] = React.useState(true)

	React.useEffect(() => {
		let cancelled = false
		void fetchGoogleOAuthReady()
			.then((isReady) => {
				if (!cancelled) {
					setReady(isReady)
				}
			})
			.catch(() => {
				if (!cancelled) {
					setReady(false)
				}
			})
			.finally(() => {
				if (!cancelled) {
					setChecking(false)
				}
			})
		return () => {
			cancelled = true
		}
	}, [])

	if (checking || !ready) {
		return null
	}

	const returnUrl = searchParams.get('returnUrl')?.trim() || undefined

	return (
		<Button
			type="button"
			variant="outline"
			className={cn(
				'w-full border-neutral-300 bg-white text-neutral-800',
				'hover:bg-neutral-50 hover:text-neutral-900',
				'dark:border-neutral-300 dark:bg-white dark:text-neutral-800',
				'dark:hover:bg-neutral-50 dark:hover:text-neutral-900'
			)}
			onClick={() => startGoogleOAuth(returnUrl)}
			data-testid="continue-with-google"
		>
			<GoogleIcon />
			{t('continueWithGoogle')}
		</Button>
	)
}

export function ContinueWithGoogleButton() {
	return (
		<React.Suspense fallback={null}>
			<ContinueWithGoogleButtonInner />
		</React.Suspense>
	)
}
