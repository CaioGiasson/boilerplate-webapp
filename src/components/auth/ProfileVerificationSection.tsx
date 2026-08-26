'use client'

import { BadgeCheck, TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AccordionSection, Button, CodeInput } from '@/design-system'
import { EMAIL_CODE_LENGTH, normalizeEmailToken } from '@/utils/emailCode'
import type { ProfileFormModel } from '@/components/auth/useProfileForm'

type ProfileVerificationSectionProps = Pick<
	ProfileFormModel,
	| 'user'
	| 'isVerified'
	| 'verificationToken'
	| 'setVerificationToken'
	| 'resendingVerification'
	| 'confirmingVerification'
	| 'resendVerification'
	| 'confirmVerificationToken'
>

export function ProfileVerificationSection({
	user,
	isVerified,
	verificationToken,
	setVerificationToken,
	resendingVerification,
	confirmingVerification,
	resendVerification,
	confirmVerificationToken,
}: ProfileVerificationSectionProps) {
	const t = useTranslations('profile')

	return (
		<AccordionSection
			value="account-verification"
			title={isVerified ? t('accountVerified') : t('accountUnverified')}
			titleClassName={isVerified ? 'text-green-600' : 'text-yellow-600'}
			titleIcon={isVerified ? BadgeCheck : TriangleAlert}
			data-testid="account-verification-accordion"
		>
			<p className="text-sm text-foreground" data-testid="account-verification-email">
				{t('emailDisplay', { email: user.email })}
			</p>
			{user.pendingEmail ? (
				<p className="text-sm text-muted-foreground">{t('pendingEmailChange', { email: user.pendingEmail })}</p>
			) : null}
			{!isVerified ? (
				<div className="space-y-4">
					<Button
						type="button"
						disabled={resendingVerification}
						onClick={() => void resendVerification()}
						data-testid="resend-verification"
					>
						{t('resendVerification')}
					</Button>
					<form className="space-y-4" onSubmit={confirmVerificationToken}>
						<CodeInput
							label={t('verificationToken')}
							value={verificationToken}
							onChange={setVerificationToken}
							data-testid="verification-code-input"
						/>
						<Button
							type="submit"
							disabled={
								confirmingVerification ||
								normalizeEmailToken(verificationToken).length !== EMAIL_CODE_LENGTH
							}
							data-testid="confirm-verification-token"
						>
							{t('confirmVerification')}
						</Button>
					</form>
				</div>
			) : null}
		</AccordionSection>
	)
}
