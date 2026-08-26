'use client'

import { useTranslations } from 'next-intl'
import { AccordionSection, Button, InputPassword, TextInput } from '@/design-system'
import type { ProfileFormModel } from '@/components/auth/useProfileForm'

type ProfileEmailSectionProps = Pick<
	ProfileFormModel,
	| 'user'
	| 'isVerified'
	| 'emailChangeInProgress'
	| 'newEmail'
	| 'setNewEmail'
	| 'emailChangePassword'
	| 'setEmailChangePassword'
	| 'changingEmail'
	| 'saveEmailChange'
>

export function ProfileEmailSection({
	user,
	isVerified,
	emailChangeInProgress,
	newEmail,
	setNewEmail,
	emailChangePassword,
	setEmailChangePassword,
	changingEmail,
	saveEmailChange,
}: ProfileEmailSectionProps) {
	const t = useTranslations('profile')
	const tValidation = useTranslations('validation')

	return (
		<AccordionSection value="change-email" title={t('changeEmail')} data-testid="change-email-accordion">
			<form className="space-y-4" onSubmit={saveEmailChange}>
				<TextInput label={t('currentEmail')} value={user.email} readOnly />
				{user.googleLinked ? (
					<p
						className="text-sm text-amber-700 dark:text-amber-400"
						role="status"
						data-testid="email-change-google-warning"
					>
						{t('emailChangeUnlinksGoogleWarning')}
					</p>
				) : null}
				<TextInput
					label={t('newEmail')}
					type="email"
					required
					value={newEmail}
					onChange={(event) => setNewEmail(event.target.value)}
					autoComplete="email"
					data-testid="change-email-new"
				/>
				<InputPassword
					label={t('currentPassword')}
					required
					value={emailChangePassword}
					onChange={(event) => setEmailChangePassword(event.target.value)}
					showPasswordLabel={t('showPassword')}
					hidePasswordLabel={t('hidePassword')}
					validityMessages={{
						valueMissing: tValidation('currentPasswordRequired'),
					}}
					data-testid="change-email-password"
				/>
				{emailChangeInProgress ? (
					<p className="text-sm text-muted-foreground">{t('emailChangeInboxHint')}</p>
				) : null}
				{!isVerified ? (
					<p className="text-sm text-muted-foreground">{t('emailChangeRequiresVerified')}</p>
				) : null}
				<Button type="submit" disabled={changingEmail || !isVerified} data-testid="change-email-submit">
					{t('changeEmail')}
				</Button>
			</form>
		</AccordionSection>
	)
}
