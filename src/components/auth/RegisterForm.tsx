'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button, InputPassword, TextInput, Title, useToast } from '@/design-system'
import { registerRequest, ApiClientError } from '@/lib/auth-client'
import { getPasswordPolicyIssue } from '@/utils/passwordPolicy'
import { useAuth } from '@/components/auth/AuthProvider'
import { ContinueWithGoogleButton } from '@/components/auth/ContinueWithGoogleButton'
import { LegalLinks } from '@/components/legal/LegalLinks'
import { useRouter, Link } from '@/i18n/navigation'
import { useTheme } from '@/components/theme-provider'
import CookiesManager, { COOKIE_KEYS } from '@/managers/Cookies.manager'
import { SETTINGS_KEYS } from '@/managers/Settings.manager'
import type { AppLocale } from '@/constants/texts'
import { validateAdultBirthDate } from '@/utils/ageGate'

export function RegisterForm() {
	const t = useTranslations('auth')
	const tValidation = useTranslations('validation')
	const { toast } = useToast()
	const { setUser } = useAuth()
	const router = useRouter()
	const { theme } = useTheme()
	const locale = useLocale()
	const [nickname, setNickname] = React.useState('')
	const [email, setEmail] = React.useState('')
	const [birthDate, setBirthDate] = React.useState('')
	const [birthDateError, setBirthDateError] = React.useState<string | null>(null)
	const [password, setPassword] = React.useState('')
	const [passwordConfirmation, setPasswordConfirmation] = React.useState('')
	const [passwordError, setPasswordError] = React.useState<string | null>(null)
	const [passwordConfirmationError, setPasswordConfirmationError] = React.useState<string | null>(null)
	const [acceptedTerms, setAcceptedTerms] = React.useState(false)
	const [acceptedPrivacy, setAcceptedPrivacy] = React.useState(false)
	const [consentError, setConsentError] = React.useState<string | null>(null)
	const [loading, setLoading] = React.useState(false)

	React.useEffect(() => {
		return () => {
			setPassword('')
			setPasswordConfirmation('')
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
		const nextPasswordError = resolvePasswordError(password)
		const nextConfirmationError = password !== passwordConfirmation ? t('passwordMismatch') : null
		const nextBirthDateError = resolveBirthDateError(birthDate)

		setPasswordError(nextPasswordError)
		setPasswordConfirmationError(nextConfirmationError)
		setBirthDateError(nextBirthDateError)

		if (!acceptedTerms || !acceptedPrivacy) {
			setConsentError(t('consentRequired'))
			return false
		}

		setConsentError(null)

		return !nextPasswordError && !nextConfirmationError && !nextBirthDateError
	}

	const mapRegisterError = (error: unknown): string => {
		if (error instanceof ApiClientError) {
			const message = error.message.toLowerCase()
			if (message.includes('18') || message.includes('least 18') || message.includes('maior')) {
				return t('mustBeAdult')
			}
			if (message.includes('birth')) {
				return t('invalidBirthDate')
			}
			if (error.code === 'VALIDATION_ERROR' && message.includes('nickname')) {
				return tValidation('nicknameInvalid')
			}
		}
		return t('errorGeneric')
	}

	const collectDeviceSettings = () => {
		const cookieTheme = CookiesManager.get(COOKIE_KEYS.THEME)
		const darkMode = (cookieTheme ?? theme) === 'dark'
		const cookieLocale = CookiesManager.get(COOKIE_KEYS.LOCALE)
		const language = (cookieLocale || locale) as AppLocale

		return [
			{ key: SETTINGS_KEYS.DARK_MODE, value: darkMode },
			{ key: SETTINGS_KEYS.LANGUAGE, value: language },
		]
	}

	const onSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		if (!validateForm()) {
			return
		}

		setLoading(true)
		try {
			const settings = collectDeviceSettings()
			const languageSetting = settings.find((entry) => entry.key === SETTINGS_KEYS.LANGUAGE)
			const registerLocale =
				typeof languageSetting?.value === 'string'
					? (languageSetting.value as AppLocale)
					: (locale as AppLocale)

			const result = await registerRequest({
				nickname,
				email,
				password,
				passwordConfirmation,
				birthDate,
				acceptedTerms,
				acceptedPrivacy,
				settings,
				locale: registerLocale,
			})
			setUser(result.user)
			toast({ variant: 'success', title: t('successRegister') })
			router.push('/')
		} catch (error: unknown) {
			toast({
				variant: 'error',
				title: mapRegisterError(error),
			})
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="mx-auto w-full max-w-md space-y-6 p-4 sm:p-6" data-testid="register-page">
			<Title as="h1">{t('registerTitle')}</Title>
			<form className="space-y-4" onSubmit={onSubmit} autoComplete="off">
				<TextInput
					label={t('nickname')}
					autoComplete="off"
					required
					value={nickname}
					onChange={(event) => setNickname(event.target.value)}
					hint={t('nicknameUniquenessHint')}
					validityMessages={{
						valueMissing: tValidation('nicknameRequired'),
					}}
				/>
				<TextInput
					label={t('email')}
					type="email"
					autoComplete="email"
					required
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					validityMessages={{
						valueMissing: tValidation('emailRequired'),
						typeMismatch: tValidation('emailInvalid'),
						badInput: tValidation('emailInvalid'),
					}}
				/>
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
					data-testid="register-birth-date"
				/>
				<InputPassword
					label={t('password')}
					autoComplete="new-password"
					required
					value={password}
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
						valueMissing: tValidation('passwordRequired'),
					}}
					onChange={(event) => {
						const value = event.target.value
						setPassword(value)
						setPasswordError(value ? resolvePasswordError(value) : null)
						if (passwordConfirmation) {
							setPasswordConfirmationError(value !== passwordConfirmation ? t('passwordMismatch') : null)
						}
					}}
				/>
				<InputPassword
					label={t('passwordConfirmation')}
					autoComplete="new-password"
					required
					value={passwordConfirmation}
					error={passwordConfirmationError ?? undefined}
					showPasswordLabel={t('showPassword')}
					hidePasswordLabel={t('hidePassword')}
					validityMessages={{
						valueMissing: tValidation('passwordConfirmationRequired'),
					}}
					onChange={(event) => {
						const value = event.target.value
						setPasswordConfirmation(value)
						setPasswordConfirmationError(value && value !== password ? t('passwordMismatch') : null)
					}}
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
						data-testid="accept-terms"
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
						data-testid="accept-privacy"
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
				<Button type="submit" disabled={loading || !acceptedTerms || !acceptedPrivacy} className="w-full">
					{t('submitRegister')}
				</Button>
			</form>
			<ContinueWithGoogleButton />
			<LegalLinks />
		</div>
	)
}
