'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button, TextInput, Title, useToast } from '@/design-system'
import { forgotPasswordRequest } from '@/lib/auth-client'
import { Link } from '@/i18n/navigation'
import { LegalLinks } from '@/components/legal/LegalLinks'
import type { AppLocale } from '@/constants/texts'
import { cn } from '@/lib/utils'

type FormFeedback = {
	variant: 'success' | 'error'
	message: string
}

export function ForgotPasswordForm() {
	const t = useTranslations('auth')
	const tValidation = useTranslations('validation')
	const locale = useLocale()
	const { toast } = useToast()
	const [email, setEmail] = React.useState('')
	const [loading, setLoading] = React.useState(false)
	const [feedback, setFeedback] = React.useState<FormFeedback | null>(null)

	const onSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		setLoading(true)
		setFeedback(null)
		try {
			await forgotPasswordRequest({ email, locale: locale as AppLocale })
			const successMessage = t('forgotPasswordSuccess')
			setFeedback({ variant: 'success', message: successMessage })
			toast({ variant: 'success', title: successMessage })
		} catch {
			const message = t('errorGeneric')
			setFeedback({ variant: 'error', message })
			toast({ variant: 'error', title: message })
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="mx-auto w-full max-w-md space-y-6 p-4 sm:p-6" data-testid="forgot-password-page">
			<Title as="h1">{t('forgotPasswordTitle')}</Title>
			<p className="text-sm text-muted-foreground">{t('forgotPasswordHint')}</p>
			<form className="space-y-4" onSubmit={onSubmit}>
				<TextInput
					label={t('email')}
					type="email"
					autoComplete="email"
					required
					value={email}
					onChange={(event) => {
						setEmail(event.target.value)
						if (feedback) {
							setFeedback(null)
						}
					}}
					validityMessages={{
						valueMissing: tValidation('emailRequired'),
						typeMismatch: tValidation('emailInvalid'),
						badInput: tValidation('emailInvalid'),
					}}
					data-testid="forgot-password-email"
				/>
				<Button type="submit" disabled={loading} className="w-full" data-testid="forgot-password-submit">
					{t('forgotPasswordSubmit')}
				</Button>
				{feedback ? (
					<p
						role="status"
						aria-live="polite"
						data-testid="forgot-password-feedback"
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
