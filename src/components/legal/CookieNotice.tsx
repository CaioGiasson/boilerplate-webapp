'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/design-system'

const STORAGE_KEY = 'vitraux-cookie-notice-dismissed'

export function CookieNotice() {
	const t = useTranslations('legal')
	const [visible, setVisible] = React.useState(false)

	React.useEffect(() => {
		setVisible(window.localStorage.getItem(STORAGE_KEY) !== '1')
	}, [])

	if (!visible) {
		return null
	}

	return (
		<div className="sticky bottom-0 z-40 border-t border-border bg-background px-4 py-3 text-sm text-foreground">
			<p>
				{t('cookieNotice')}{' '}
				<Link href="/privacy" className="underline">
					{t('privacyLink')}
				</Link>
			</p>
			<Button
				className="mt-2"
				type="button"
				onClick={() => {
					window.localStorage.setItem(STORAGE_KEY, '1')
					setVisible(false)
				}}
			>
				{t('cookieDismiss')}
			</Button>
		</div>
	)
}
