'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Button, TextInput, Title, useToast } from '@/design-system'
import { applyCloudSettingsToLocal, completeGoogleRegistrationRequest, ApiClientError } from '@/lib/auth-client'
import { resolveApiErrorMessage } from '@/lib/api-error'
import { useAuth } from '@/components/auth/AuthProvider'
import { GoogleOAuthFlagMessages } from '@/components/auth/GoogleOAuthFlagMessages'
import { LegalLinks } from '@/components/legal/LegalLinks'
import { useRouter, Link } from '@/i18n/navigation'
import { useTheme } from '@/components/theme-provider'
import { validateAdultBirthDate } from '@/utils/ageGate'
import type { AppLocale } from '@/constants/texts'

export function GoogleRegisterOnboardingForm() {
	const t = useTranslations('auth')
	const tValidation = useTranslations('validation')
	const tApiError = useTranslations('apiError')
	const { toast } = useToast()
	const { setUser } = useAuth()
	const router = useRouter()
	const { setTheme } = useTheme()
	const [birthDate, setBirthDate] = React.useState('')
	const [birthDateError, setBirthDateError] = React.useState<string | null>(null)
	const [acceptedTerms, setAcceptedTerms] = React.useState(false)
	const [acceptedPrivacy, setAcceptedPrivacy] = React.useState(false)
	const [consentError, setConsentError] = React.useState<string | null>(null)
	const [loading, setLoading] = React.useState(false)

	const resolveBirthDateError = (value: string): string | null => {
		if (!value) {
			return tValidation('birthDateRequired')
		}
		const check = validateAdultBirthDate(value)
		if (!check.ok) {
			if (check.reason === 'underage') {
				return t('mustBeAdult')
			}
			return t('invalidBirthDate')
		}
		return null
	}

	const validateForm = (): boolean => {
		const nextBirthDateError = resolveBirthDateError(birthDate)
		setBirthDateError(nextBirthDateError)

		if (!acceptedTerms || !acceptedPrivacy) {
			setConsentError(t('consentRequired'))
			return false
		}

		setConsentError(null)
		return !nextBirthDateError
	}

	const onSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		if (!validateForm()) {
			return
		}

		setLoading(true)
		try {
			const result = await completeGoogleRegistrationRequest({
				birthDate,
				acceptedTerms: true,
				acceptedPrivacy: true,
			})
			setUser(result.user)
			const applied = applyCloudSettingsToLocal(result.user.settings)
			if (applied.theme) {
				setTheme(applied.theme)
			}

			const successMessage = t('googleRegisterSuccess')
			toast({ variant: 'success', title: successMessage })

			const target = result.returnUrl || '/'
			window.setTimeout(() => {
				if (applied.locale) {
					router.replace(target, { locale: applied.locale as AppLocale })
				} else {
					router.replace(target)
				}
			}, 400)
		} catch (error: unknown) {
			const message = resolveApiErrorMessage(
				error,
				{
					timeout: tApiError('timeout'),
					unauthorized: tApiError('unauthorized'),
					server: tApiError('server'),
					network: tApiError('network'),
					generic: tApiError('generic'),
				},
				error instanceof ApiClientError &&
					(error.message.toLowerCase().includes('18') || error.message.toLowerCase().includes('maior'))
					? t('mustBeAdult')
					: t('errorGeneric')
			)
			toast({ variant: 'error', title: message })
			setLoading(false)
		}
	}

	return (
		<div className="mx-auto w-full max-w-md space-y-6 p-4 sm:p-6" data-testid="google-register-page">
			<Title as="h1">{t('googleRegisterTitle')}</Title>
			<p className="text-sm text-muted-foreground">{t('googleRegisterHint')}</p>
			<GoogleOAuthFlagMessages />
			<form className="space-y-4" onSubmit={onSubmit} autoComplete="off">
				<TextInput
					label={t('birthDate')}
					type="date"
					required
					value={birthDate}
					error={birthDateError ?? undefined}
					hint={t('birthDateHint')}
					onChange={(event) => {
						const value = event.target.value
						setBirthDate(value)
						setBirthDateError(value ? resolveBirthDateError(value) : null)
					}}
					validityMessages={{
						valueMissing: tValidation('birthDateRequired'),
					}}
					data-testid="google-register-birth-date"
				/>
				<label className="flex items-start gap-2 text-sm">
					<input
						type="checkbox"
						required
						checked={acceptedTerms}
						onChange={(event) => {
							setAcceptedTerms(event.target.checked)
							if (event.target.checked && acceptedPrivacy) {
								setConsentError(null)
							}
						}}
						className="mt-1"
						data-testid="google-accept-terms"
					/>
					<span>
						{t.rich('acceptTerms', {
							terms: (chunks) => (
								<Link
									href="/terms"
									className="font-medium text-primary underline-offset-4 hover:underline"
								>
									{chunks}
								</Link>
							),
						})}
					</span>
				</label>
				<label className="flex items-start gap-2 text-sm">
					<input
						type="checkbox"
						required
						checked={acceptedPrivacy}
						onChange={(event) => {
							setAcceptedPrivacy(event.target.checked)
							if (event.target.checked && acceptedTerms) {
								setConsentError(null)
							}
						}}
						className="mt-1"
						data-testid="google-accept-privacy"
					/>
					<span>
						{t.rich('acceptPrivacy', {
							privacy: (chunks) => (
								<Link
									href="/privacy"
									className="font-medium text-primary underline-offset-4 hover:underline"
								>
									{chunks}
								</Link>
							),
						})}
					</span>
				</label>
				{consentError ? <p className="text-sm text-destructive">{consentError}</p> : null}
				<Button
					type="submit"
					disabled={loading || !acceptedTerms || !acceptedPrivacy}
					className="w-full"
					data-testid="google-register-submit"
				>
					{t('googleRegisterSubmit')}
				</Button>
			</form>
			<LegalLinks />
		</div>
	)
}
