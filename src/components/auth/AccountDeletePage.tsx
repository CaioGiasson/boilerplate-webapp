'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Button, Title, useToast } from '@/design-system'
import {
	applyCloudSettingsToLocal,
	cancelAccountDeletionRequest,
	getAccountDeletionStatusRequest,
	keepAccountDeletionRequest,
} from '@/lib/auth-client'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter, Link } from '@/i18n/navigation'
import { useTheme } from '@/components/theme-provider'

function formatUtc(iso: string, locale: string): string {
	const tag = locale === 'pt' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US'
	return new Intl.DateTimeFormat(tag, {
		dateStyle: 'short',
		timeStyle: 'short',
		timeZone: 'UTC',
	}).format(new Date(iso))
}

export function AccountDeletePage() {
	const t = useTranslations('profile.accountDeletion')
	const tAuth = useTranslations('auth')
	const locale = useLocale()
	const searchParams = useSearchParams()
	const decisionMode = searchParams.get('decision') === '1'
	const { setUser } = useAuth()
	const router = useRouter()
	const { setTheme } = useTheme()
	const { toast } = useToast()

	const [deletedAt, setDeletedAt] = React.useState<string | null>(null)
	const [deadlineAt, setDeadlineAt] = React.useState<string | null>(null)
	const [loading, setLoading] = React.useState(decisionMode)
	const [acting, setActing] = React.useState(false)

	React.useEffect(() => {
		const fromQueryDeleted = searchParams.get('deletedAt')
		const fromQueryDeadline = searchParams.get('deadlineAt')
		if (fromQueryDeleted) {
			setDeletedAt(fromQueryDeleted)
		}
		if (fromQueryDeadline) {
			setDeadlineAt(fromQueryDeadline)
		}

		if (!decisionMode) {
			setLoading(false)
			return
		}
		if (fromQueryDeleted && fromQueryDeadline) {
			setLoading(false)
			return
		}

		let cancelled = false
		;(async () => {
			try {
				const status = await getAccountDeletionStatusRequest()
				if (!cancelled) {
					setDeletedAt(status.deletedAt)
					setDeadlineAt(status.deadlineAt)
				}
			} catch {
				if (!cancelled) {
					toast({ variant: 'error', title: t('errorAction') })
					router.replace('/login')
				}
			} finally {
				if (!cancelled) {
					setLoading(false)
				}
			}
		})()
		return () => {
			cancelled = true
		}
	}, [decisionMode, router, searchParams, t, toast])

	const onCancel = async () => {
		setActing(true)
		try {
			const result = await cancelAccountDeletionRequest(locale as 'pt' | 'en' | 'es')
			setUser(result.user)
			const applied = applyCloudSettingsToLocal(result.settings)
			if (applied.theme) {
				setTheme(applied.theme)
			}
			toast({ variant: 'success', title: t('successCancel') })
			if (applied.locale) {
				router.replace('/', { locale: applied.locale })
			} else {
				router.replace('/')
			}
		} catch {
			toast({ variant: 'error', title: t('errorAction') })
			setActing(false)
		}
	}

	const onKeep = async () => {
		setActing(true)
		try {
			await keepAccountDeletionRequest()
			setUser(null)
			toast({ variant: 'success', title: t('successKeep') })
			router.replace('/login')
		} catch {
			toast({ variant: 'error', title: t('errorAction') })
			setActing(false)
		}
	}

	if (loading) {
		return (
			<div className="mx-auto w-full max-w-lg space-y-4 p-4 sm:p-6" data-testid="account-delete-page">
				<p className="text-sm text-muted-foreground">{t('loading')}</p>
			</div>
		)
	}

	return (
		<div className="mx-auto w-full max-w-lg space-y-6 p-4 sm:p-6" data-testid="account-delete-page">
			<Title as="h1">{t('title')}</Title>
			<div className="space-y-3 text-sm text-muted-foreground">
				{deletedAt ? <p>{t('requestedAt', { datetime: formatUtc(deletedAt, locale) })}</p> : null}
				<p>{t('bodyQuarantine')}</p>
				{deadlineAt ? <p>{t('deadlineAt', { datetime: formatUtc(deadlineAt, locale) })}</p> : null}
				<p>{t('bodyRestore')}</p>
				<p>{t('bodyIrreversible')}</p>
				{!decisionMode ? <p>{t('infoOnlyHint')}</p> : null}
			</div>
			{decisionMode ? (
				<div className="flex flex-col gap-3 sm:flex-row">
					<Button
						type="button"
						variant="destructive"
						disabled={acting}
						onClick={() => void onKeep()}
						data-testid="account-delete-keep"
					>
						{t('keepButton')}
					</Button>
					<Button
						type="button"
						disabled={acting}
						onClick={() => void onCancel()}
						data-testid="account-delete-cancel"
					>
						{t('cancelButton')}
					</Button>
				</div>
			) : (
				<p className="text-sm">
					<Link
						href="/login"
						className="underline underline-offset-4"
						data-testid="account-delete-login-link"
					>
						{tAuth('loginTitle')}
					</Link>
				</p>
			)}
		</div>
	)
}
