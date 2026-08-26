'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Button, Title } from '@/design-system'
import { Link } from '@/i18n/navigation'

type LocaleErrorProps = {
	error: Error & { digest?: string }
	reset: () => void
}

export default function LocaleError({ error, reset }: LocaleErrorProps) {
	const t = useTranslations('error')

	React.useEffect(() => {
		console.error(error)
	}, [error])

	return (
		<main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
			<Title as="h1">{t('title')}</Title>
			<p className="max-w-md text-muted-foreground">{t('description')}</p>
			<div className="flex flex-wrap items-center justify-center gap-3">
				<Button type="button" onClick={reset}>
					{t('retry')}
				</Button>
				<Button asChild variant="outline">
					<Link href="/">{t('backHome')}</Link>
				</Button>
			</div>
		</main>
	)
}
