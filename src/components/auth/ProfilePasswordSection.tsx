'use client'

import { useTranslations } from 'next-intl'
import { AccordionSection, Button, InputPassword } from '@/design-system'
import { useAuth } from '@/components/auth/AuthProvider'
import type { ProfileFormModel } from '@/components/auth/useProfileForm'

type ProfilePasswordSectionProps = Pick<
	ProfileFormModel,
	| 'currentPassword'
	| 'setCurrentPassword'
	| 'newPassword'
	| 'setNewPassword'
	| 'newPasswordConfirmation'
	| 'setNewPasswordConfirmation'
	| 'newPasswordError'
	| 'setNewPasswordError'
	| 'newPasswordConfirmationError'
	| 'setNewPasswordConfirmationError'
	| 'saving'
	| 'resolvePasswordError'
	| 'savePassword'
>

export function ProfilePasswordSection({
	currentPassword,
	setCurrentPassword,
	newPassword,
	setNewPassword,
	newPasswordConfirmation,
	setNewPasswordConfirmation,
	newPasswordError,
	setNewPasswordError,
	newPasswordConfirmationError,
	setNewPasswordConfirmationError,
	saving,
	resolvePasswordError,
	savePassword,
}: ProfilePasswordSectionProps) {
	const t = useTranslations('profile')
	const tValidation = useTranslations('validation')
	const { user } = useAuth()
	const googleWithoutPassword = Boolean(user && !user.hasPassword && user.googleLinked)

	return (
		<AccordionSection value="change-password" title={t('changePassword')} data-testid="change-password-accordion">
			<form className="space-y-4" onSubmit={savePassword}>
				<InputPassword
					label={t('currentPassword')}
					required={!googleWithoutPassword}
					value={currentPassword}
					onChange={(event) => setCurrentPassword(event.target.value)}
					hint={googleWithoutPassword ? t('currentPasswordGoogleHint') : undefined}
					showPasswordLabel={t('showPassword')}
					hidePasswordLabel={t('hidePassword')}
					validityMessages={
						googleWithoutPassword
							? undefined
							: {
									valueMissing: tValidation('currentPasswordRequired'),
								}
					}
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
					error={newPasswordError ?? undefined}
					validityMessages={{
						valueMissing: tValidation('newPasswordRequired'),
					}}
					onChange={(event) => {
						const value = event.target.value
						setNewPassword(value)
						setNewPasswordError(value ? resolvePasswordError(value) : null)
						if (newPasswordConfirmation) {
							setNewPasswordConfirmationError(
								value !== newPasswordConfirmation ? t('passwordMismatch') : null
							)
						}
					}}
				/>
				<InputPassword
					label={t('newPasswordConfirmation')}
					autoComplete="new-password"
					required
					value={newPasswordConfirmation}
					error={newPasswordConfirmationError ?? undefined}
					showPasswordLabel={t('showPassword')}
					hidePasswordLabel={t('hidePassword')}
					validityMessages={{
						valueMissing: tValidation('passwordConfirmationRequired'),
					}}
					onChange={(event) => {
						const value = event.target.value
						setNewPasswordConfirmation(value)
						setNewPasswordConfirmationError(value && value !== newPassword ? t('passwordMismatch') : null)
					}}
				/>
				<Button type="submit" disabled={saving}>
					{t('changePassword')}
				</Button>
			</form>
		</AccordionSection>
	)
}
