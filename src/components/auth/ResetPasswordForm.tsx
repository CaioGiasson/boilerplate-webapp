'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Button, CodeInput, InputPassword, Title, useToast } from '@/design-system'
import { ApiClientError, resetPasswordRequest } from '@/lib/auth-client'
import { Link, useRouter } from '@/i18n/navigation'
import { LegalLinks } from '@/components/legal/LegalLinks'
import { EMAIL_CODE_LENGTH, normalizeEmailToken } from '@/utils/emailCode'
import { getPasswordPolicyIssue } from '@/utils/passwordPolicy'
import { cn } from '@/lib/utils'

type FormFeedback = {
	variant: 'success' | 'error'
	message: string
}

function ResetPasswordFormContent() {
	const t = useTranslations('auth')
	const tValidation = useTranslations('validation')
	const searchParams = useSearchParams()
	const router = useRouter()
	const { toast } = useToast()
	const [code, setCode] = React.useState(() => normalizeEmailToken(searchParams.get('token') ?? ''))
	const [newPassword, setNewPassword] = React.useState('')
	const [newPasswordConfirmation, setNewPasswordConfirmation] = React.useState('')
	const [passwordError, setPasswordError] = React.useState<string | null>(null)
	const [passwordConfirmationError, setPasswordConfirmationError] = React.useState<string | null>(null)
	const [loading, setLoading] = React.useState(false)
	const [feedback, setFeedback] = React.useState<FormFeedback | null>(null)

	React.useEffect(() => {
		return () => {
			setNewPassword('')
			setNewPasswordConfirmation('')
		}
	}, [])

	const resolvePasswordError = (value: string): string | null => {
		const issue = getPasswordPolicyIssue(value)
		if (issue === 'minLength') {
			return t('passwordMinLength')
		}
		if (issue === 'complexity') {
			return t('passwordComplexity')
		}
		return null
	}

	const onSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		const token = normalizeEmailToken(code)
		if (token.length !== EMAIL_CODE_LENGTH) {
			return
		}

		const nextPasswordError = resolvePasswordError(newPassword)
		const nextConfirmationError = newPassword !== newPasswordConfirmation ? t('passwordMismatch') : null
		setPasswordError(nextPasswordError)
		setPasswordConfirmationError(nextConfirmationError)
		if (nextPasswordError || nextConfirmationError) {
			return
		}

		setLoading(true)
		setFeedback(null)
		try {
			await resetPasswordRequest({
				token,
				newPassword,
				newPasswordConfirmation,
			})
			const successMessage = t('resetPasswordSuccess')
			setFeedback({ variant: 'success', message: successMessage })
			toast({ variant: 'success', title: successMessage })
			window.setTimeout(() => {
				router.push('/login')
			}, 800)
		} catch (error: unknown) {
			const message =
				error instanceof ApiClientError && error.code === 'VALIDATION_ERROR'
					? t('resetPasswordError')
					: t('errorGeneric')
			setFeedback({ variant: 'error', message })
			toast({ variant: 'error', title: message })
			setLoading(false)
		}
	}

	return (
		<div className="mx-auto w-full max-w-md space-y-6 p-4 sm:p-6" data-testid="reset-password-page">
			<Title as="h1">{t('resetPasswordTitle')}</Title>
			<form className="space-y-4" onSubmit={onSubmit}>
				<CodeInput
					label={t('resetCode')}
					value={code}
					onChange={setCode}
					autoFocus={!searchParams.get('token')}
					data-testid="reset-password-code"
				/>
				<InputPassword
					label={t('newPassword')}
					autoComplete="new-password"
					required
					value={newPassword}
					showPasswordLabel={t('showPassword')}
					hidePasswordLabel={t('hidePassword')}
					policyChecklist={{
						minLength: t('passwordChecklist.minLength'),
						complexity: t('passwordChecklist.complexity'),
						lowercase: t('passwordChecklist.lowercase'),
						uppercase: t('passwordChecklist.uppercase'),
						number: t('passwordChecklist.number'),
						symbol: t('passwordChecklist.symbol'),
					}}
					error={passwordError ?? undefined}
					validityMessages={{
						valueMissing: tValidation('newPasswordRequired'),
					}}
					onChange={(event) => {
						const value = event.target.value
						setNewPassword(value)
						setPasswordError(value ? resolvePasswordError(value) : null)
						if (newPasswordConfirmation) {
							setPasswordConfirmationError(
								value !== newPasswordConfirmation ? t('passwordMismatch') : null
							)
						}
					}}
					data-testid="reset-password-new"
				/>
				<InputPassword
					label={t('newPasswordConfirmation')}
					autoComplete="new-password"
					required
					value={newPasswordConfirmation}
					showPasswordLabel={t('showPassword')}
					hidePasswordLabel={t('hidePassword')}
					error={passwordConfirmationError ?? undefined}
					validityMessages={{
						valueMissing: tValidation('passwordConfirmationRequired'),
					}}
					onChange={(event) => {
						const value = event.target.value
						setNewPasswordConfirmation(value)
						setPasswordConfirmationError(value !== newPassword ? t('passwordMismatch') : null)
					}}
					data-testid="reset-password-confirmation"
				/>
				<Button
					type="submit"
					disabled={loading || normalizeEmailToken(code).length !== EMAIL_CODE_LENGTH}
					className="w-full"
					data-testid="reset-password-submit"
				>
					{t('resetPasswordSubmit')}
				</Button>
				{feedback ? (
					<p
						role="status"
						aria-live="polite"
						data-testid="reset-password-feedback"
						className={cn(
							'text-center text-sm',
							feedback.variant === 'success'
								? 'text-emerald-600 dark:text-emerald-400'
								: 'text-destructive'
						)}
					>
						{feedback.message}
					</p>
				) : null}
				<p className="text-center text-sm text-muted-foreground">
					<Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
						{t('backToLogin')}
					</Link>
				</p>
			</form>
			<LegalLinks />
		</div>
	)
}

export function ResetPasswordForm() {
	return (
		<React.Suspense fallback={null}>
			<ResetPasswordFormContent />
		</React.Suspense>
	)
}
