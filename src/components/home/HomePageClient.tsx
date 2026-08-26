'use client'

import { useTranslations } from 'next-intl'
import { Title } from '@/design-system'
import { useAuth } from '@/components/auth/AuthProvider'
import { Link } from '@/i18n/navigation'

export function HomePageClient() {
	const t = useTranslations('home')
	const tNav = useTranslations('nav')
	const { user, loading } = useAuth()

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6 sm:p-10" data-testid="home-page">
			<div className="space-y-2">
				<Title as="h1">{t('title')}</Title>
				<p className="text-muted-foreground">{t('description')}</p>
			</div>

			{loading ? (
				<p className="text-sm text-muted-foreground">{t('loading')}</p>
			) : user ? (
				<div className="rounded-lg border border-border bg-surface p-6">
					<p className="text-sm text-muted-foreground">{t('signedInAs')}</p>
					<p className="mt-1 font-medium">{user.nickname}</p>
					<div className="mt-4 flex flex-wrap gap-3">
						<Link
							href="/profile"
							className="text-sm font-medium text-primary underline-offset-4 hover:underline"
						>
							{tNav('profile')}
						</Link>
						<Link
							href="/config"
							className="text-sm font-medium text-primary underline-offset-4 hover:underline"
						>
							{tNav('settings')}
						</Link>
					</div>
				</div>
			) : (
				<div className="rounded-lg border border-border bg-surface p-6">
					<p className="text-muted-foreground">{t('guestPrompt')}</p>
					<div className="mt-4 flex flex-wrap gap-3">
						<Link
							href="/login"
							className="text-sm font-medium text-primary underline-offset-4 hover:underline"
						>
							{tNav('signIn')}
						</Link>
						<Link
							href="/register"
							className="text-sm font-medium text-primary underline-offset-4 hover:underline"
						>
							{tNav('signUp')}
						</Link>
					</div>
				</div>
			)}
		</div>
	)
}
