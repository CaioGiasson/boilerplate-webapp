'use client'

import { useTranslations } from 'next-intl'
import { AccordionSection, Button, InputPassword, TextInput } from '@/design-system'
import type { ProfileFormModel } from '@/components/auth/useProfileForm'

type ProfileDeleteAccountSectionProps = Pick<
	ProfileFormModel,
	| 'deleteConfirm'
	| 'setDeleteConfirm'
	| 'deletePassword'
	| 'setDeletePassword'
	| 'deleting'
	| 'deleteConfirmWord'
	| 'onDeleteAccount'
	| 'user'
>

export function ProfileDeleteAccountSection({
	deleteConfirm,
	setDeleteConfirm,
	deletePassword,
	setDeletePassword,
	deleting,
	deleteConfirmWord,
	onDeleteAccount,
	user,
}: ProfileDeleteAccountSectionProps) {
	const t = useTranslations('profile')
	const tValidation = useTranslations('validation')
	const googleOnly = Boolean(user && !user.hasPassword && user.googleLinked)
	const canSubmit = deleteConfirm.trim() === deleteConfirmWord && (googleOnly || Boolean(deletePassword)) && !deleting

	return (
		<AccordionSection value="delete-account" title={t('deleteAccount')} data-testid="delete-account-accordion">
			<form className="space-y-4" onSubmit={onDeleteAccount}>
				<p className="text-sm text-muted-foreground">{t('deleteAccountDescription')}</p>
				<TextInput
					label={t('deleteAccountConfirm')}
					value={deleteConfirm}
					onChange={(event) => setDeleteConfirm(event.target.value)}
					autoComplete="off"
					data-testid="delete-account-confirm"
				/>
				{!googleOnly ? (
					<InputPassword
						label={t('deleteAccountPassword')}
						required
						value={deletePassword}
						onChange={(event) => setDeletePassword(event.target.value)}
						showPasswordLabel={t('showPassword')}
						hidePasswordLabel={t('hidePassword')}
						validityMessages={{
							valueMissing: tValidation('currentPasswordRequired'),
						}}
						data-testid="delete-account-password"
					/>
				) : null}
				<Button type="submit" variant="destructive" disabled={!canSubmit} data-testid="delete-account-submit">
					{t('deleteAccountSubmit')}
				</Button>
			</form>
		</AccordionSection>
	)
}
