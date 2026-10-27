'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Button, InputPassword, TextInput, Title, useToast } from '@/design-system'
import {
	applyCloudSettingsToLocal,
	loginRequest,
	verifyTwoFactorLoginRequest,
	type LoginCompleted,
} from '@/lib/auth-client'
import { ApiClientError, resolveApiErrorMessage } from '@/lib/api-error'
import { useAuth } from '@/components/auth/AuthProvider'
import { ContinueWithGoogleButton } from '@/components/auth/ContinueWithGoogleButton'
import { useRouter, Link } from '@/i18n/navigation'
import { useTheme } from '@/components/theme-provider'
import { LegalLinks } from '@/components/legal/LegalLinks'
import { cn } from '@/lib/utils'

type FormFeedback = {
	variant: 'success' | 'error'
	message: string
}

export function LoginForm() {
	const t = useTranslations('auth')
	const tApiError = useTranslations('apiError')
	const tValidation = useTranslations('validation')
	const { toast } = useToast()
	const { setUser } = useAuth()
	const router = useRouter()
	const { setTheme } = useTheme()
	const [identifier, setIdentifier] = React.useState('')
	const [password, setPassword] = React.useState('')
	const [loading, setLoading] = React.useState(false)
	const [feedback, setFeedback] = React.useState<FormFeedback | null>(null)
	// Preenchido quando a senha está certa e a conta tem 2FA: a tela troca para o código.
	const [challengeToken, setChallengeToken] = React.useState<string | null>(null)
	const [useRecoveryCode, setUseRecoveryCode] = React.useState(false)
	const [secondFactor, setSecondFactor] = React.useState('')

	React.useEffect(() => {
		return () => setPassword('')
	}, [])

	const showError = (message: string) => {
		setFeedback({ variant: 'error', message })
		toast({ variant: 'error', title: message })
	}

	const finishLogin = (result: LoginCompleted) => {
		if (result.deletionDecisionRequired) {
			const params = new URLSearchParams({
				decision: '1',
				deletedAt: result.deletedAt,
				deadlineAt: result.deadlineAt,
			})
			router.replace(`/account-delete?${params.toString()}`)
			return
		}

		setUser(result.user)
		const applied = applyCloudSettingsToLocal(result.settings)
		if (applied.theme) {
			setTheme(applied.theme)
		}

		const successMessage = t('successLogin')
		setFeedback({ variant: 'success', message: successMessage })
		toast({ variant: 'success', title: successMessage })

		window.setTimeout(() => {
			if (applied.locale) {
				router.replace('/', { locale: applied.locale })
			} else {
				router.push('/')
			}
		}, 600)
	}

	const onSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		setLoading(true)
		setFeedback(null)
		try {
			const result = await loginRequest({ identifier, password })
			if (result.twoFactorRequired) {
				setChallengeToken(result.challengeToken)
				setPassword('')
				return
			}
			finishLogin(result)
		} catch (error: unknown) {
			const isGoogleLoginRequired = error instanceof ApiClientError && error.code === 'GOOGLE_LOGIN_REQUIRED'
			const isUnauthorized =
				error instanceof ApiClientError && (error.code === 'UNAUTHORIZED' || error.kind === 'unauthorized')
			showError(
				isGoogleLoginRequired
					? t('googleLoginRequired')
					: isUnauthorized
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
			)
		} finally {
			setLoading(false)
		}
	}

	const onSubmitSecondFactor = async (event: React.FormEvent) => {
		event.preventDefault()
		if (!challengeToken) return
		setLoading(true)
		setFeedback(null)
		try {
			const value = secondFactor.trim()
			const result = await verifyTwoFactorLoginRequest({
				challengeToken,
				...(useRecoveryCode ? { recoveryCode: value } : { code: value }),
			})
			finishLogin(result)
		} catch (error: unknown) {
			const isUnauthorized =
				error instanceof ApiClientError && (error.code === 'UNAUTHORIZED' || error.kind === 'unauthorized')
			showError(
				isUnauthorized
					? t('twoFactorInvalid')
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
			)
		} finally {
			setLoading(false)
		}
	}

	const feedbackNode = feedback ? (
		<p
			role="status"
			aria-live="polite"
			data-testid="login-feedback"
			className={cn(
				'text-center text-sm',
				feedback.variant === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
			)}
		>
			{feedback.message}
		</p>
	) : null

	if (challengeToken) {
		return (
			<div className="mx-auto w-full max-w-md space-y-6 p-4 sm:p-6" data-testid="login-two-factor">
				<Title as="h1">{t('twoFactorTitle')}</Title>
				<p className="text-sm text-muted-foreground">
					{useRecoveryCode ? t('twoFactorRecoveryHint') : t('twoFactorHint')}
				</p>
				<form className="space-y-4" onSubmit={onSubmitSecondFactor}>
					<TextInput
						label={useRecoveryCode ? t('twoFactorRecoveryLabel') : t('twoFactorCodeLabel')}
						type="text"
						inputMode={useRecoveryCode ? 'text' : 'numeric'}
						autoComplete="one-time-code"
						autoFocus
						required
						maxLength={useRecoveryCode ? 16 : 6}
						value={secondFactor}
						onChange={(event) => {
							setSecondFactor(event.target.value)
							if (feedback) setFeedback(null)
						}}
					/>
					<Button type="submit" disabled={loading} className="w-full">
						{t('twoFactorSubmit')}
					</Button>
					{feedbackNode}
				</form>
				<div className="flex flex-col items-center gap-2 text-sm">
					<button
						type="button"
						className="font-medium text-primary underline-offset-4 hover:underline"
						onClick={() => {
							setUseRecoveryCode((current) => !current)
							setSecondFactor('')
							setFeedback(null)
						}}
					>
						{useRecoveryCode ? t('twoFactorUseApp') : t('twoFactorUseRecovery')}
					</button>
					<button
						type="button"
						className="text-muted-foreground underline-offset-4 hover:underline"
						onClick={() => {
							setChallengeToken(null)
							setSecondFactor('')
							setUseRecoveryCode(false)
							setFeedback(null)
						}}
					>
						{t('twoFactorBack')}
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="mx-auto w-full max-w-md space-y-6 p-4 sm:p-6" data-testid="login-page">
			<Title as="h1">{t('loginTitle')}</Title>
			<form className="space-y-4" onSubmit={onSubmit}>
				<TextInput
					label={t('identifier')}
					type="text"
					autoComplete="username"
					required
					value={identifier}
					onChange={(event) => {
						setIdentifier(event.target.value)
						if (feedback) {
							setFeedback(null)
						}
					}}
					validityMessages={{
						valueMissing: tValidation('identifierRequired'),
					}}
				/>
				<InputPassword
					label={t('password')}
					autoComplete="current-password"
					required
					value={password}
					onChange={(event) => {
						setPassword(event.target.value)
						if (feedback) {
							setFeedback(null)
						}
					}}
					showPasswordLabel={t('showPassword')}
					hidePasswordLabel={t('hidePassword')}
					validityMessages={{
						valueMissing: tValidation('passwordRequired'),
					}}
				/>
				<p className="text-right text-sm">
					<Link
						href="/forgot-password"
						className="font-medium text-primary underline-offset-4 hover:underline"
						data-testid="forgot-password-link"
					>
						{t('forgotPasswordLink')}
					</Link>
				</p>
				<Button type="submit" disabled={loading} className="w-full">
					{t('submitLogin')}
				</Button>
				{feedbackNode}
			</form>
			<ContinueWithGoogleButton />
			<p className="text-center text-sm text-muted-foreground">
				{t('noAccount')}{' '}
				<Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
					{t('registerNow')}
				</Link>
			</p>
			<LegalLinks />
		</div>
	)
}
