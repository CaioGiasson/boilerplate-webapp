'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Button, InputPassword, Title, useToast } from '@/design-system'
import { applyCloudSettingsToLocal, linkGoogleAccountRequest, ApiClientError } from '@/lib/auth-client'
import { resolveApiErrorMessage } from '@/lib/api-error'
import { useAuth } from '@/components/auth/AuthProvider'
import { GoogleOAuthFlagMessages } from '@/components/auth/GoogleOAuthFlagMessages'
import { LegalLinks } from '@/components/legal/LegalLinks'
import { useRouter, Link } from '@/i18n/navigation'
import { useTheme } from '@/components/theme-provider'
import type { AppLocale } from '@/constants/texts'

export function GoogleLinkAccountForm() {
	const t = useTranslations('auth')
	const tValidation = useTranslations('validation')
	const tApiError = useTranslations('apiError')
	const { toast } = useToast()
	const { setUser } = useAuth()
	const router = useRouter()
	const { setTheme } = useTheme()
	const [password, setPassword] = React.useState('')
	const [loading, setLoading] = React.useState(false)

	React.useEffect(() => {
		return () => setPassword('')
	}, [])

	const onSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		setLoading(true)
		try {
			const result = await linkGoogleAccountRequest(password)
			setUser(result.user)
			const applied = applyCloudSettingsToLocal(result.user.settings)
			if (applied.theme) {
				setTheme(applied.theme)
			}

			toast({ variant: 'success', title: t('googleLinkSuccess') })

			const target = result.returnUrl || '/'
			window.setTimeout(() => {
				if (applied.locale) {
					router.replace(target, { locale: applied.locale as AppLocale })
				} else {
					router.replace(target)
				}
			}, 400)
		} catch (error: unknown) {
			const isUnauthorized =
				error instanceof ApiClientError && (error.code === 'UNAUTHORIZED' || error.kind === 'unauthorized')
			const message = isUnauthorized
				? t('invalidCredentials')
				: resolveApiErrorMessage(
						error,
						{
							timeout: tApiError('timeout'),
							unauthorized: tApiError('unauthorized'),
							server: tApiError('server'),
							network: tApiError('network'),
							generic: tApiError('generic'),
						},
						t('errorGeneric')
					)
			toast({ variant: 'error', title: message })
			setLoading(false)
		}
	}

	return (
		<div className="mx-auto w-full max-w-md space-y-6 p-4 sm:p-6" data-testid="google-link-page">
			<Title as="h1">{t('googleLinkTitle')}</Title>
			<p className="text-sm text-muted-foreground">{t('googleLinkMessage')}</p>
			<GoogleOAuthFlagMessages />
			<form className="space-y-4" onSubmit={onSubmit}>
				<InputPassword
					label={t('password')}
					autoComplete="current-password"
					required
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					showPasswordLabel={t('showPassword')}
					hidePasswordLabel={t('hidePassword')}
					validityMessages={{
						valueMissing: tValidation('passwordRequired'),
					}}
					data-testid="google-link-password"
				/>
				<Button type="submit" disabled={loading} className="w-full" data-testid="google-link-submit">
					{t('googleLinkSubmit')}
				</Button>
				<p className="text-center text-sm">
					<Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
						{t('backToLogin')}
					</Link>
				</p>
			</form>
			<LegalLinks />
		</div>
	)
}
