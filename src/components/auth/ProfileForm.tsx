'use client'

import { AccordionGroup } from '@/design-system'
import { ProfileBasicsSection } from '@/components/auth/ProfileBasicsSection'
import { ProfileVerificationSection } from '@/components/auth/ProfileVerificationSection'
import { ProfileEmailSection } from '@/components/auth/ProfileEmailSection'
import { ProfilePasswordSection } from '@/components/auth/ProfilePasswordSection'
import { ProfileStatisticsSection } from '@/components/auth/ProfileStatisticsSection'
import { ProfileSessionsSection } from '@/components/auth/ProfileSessionsSection'
import { ProfileDeleteAccountSection } from '@/components/auth/ProfileDeleteAccountSection'
import { useProfileForm } from '@/components/auth/useProfileForm'

export function ProfileForm() {
	const profile = useProfileForm()

	if (!profile.ready) {
		return null
	}

	return (
		<div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6" data-testid="profile-page">
			<ProfileBasicsSection
				name={profile.name}
				setName={profile.setName}
				nickname={profile.nickname}
				setNickname={profile.setNickname}
				nicknameStatus={profile.nicknameStatus}
				saving={profile.saving}
				exporting={profile.exporting}
				photoInputRef={profile.photoInputRef}
				visiblePhotoUrl={profile.visiblePhotoUrl}
				onPhotoChange={profile.onPhotoChange}
				openPhotoPicker={profile.openPhotoPicker}
				markPhotoRemoved={profile.markPhotoRemoved}
				saveProfile={profile.saveProfile}
				downloadMyData={profile.downloadMyData}
			/>

			<AccordionGroup value={profile.openAccordion} onValueChange={profile.setOpenAccordion}>
				<ProfileVerificationSection
					user={profile.user}
					isVerified={profile.isVerified}
					verificationToken={profile.verificationToken}
					setVerificationToken={profile.setVerificationToken}
					resendingVerification={profile.resendingVerification}
					confirmingVerification={profile.confirmingVerification}
					resendVerification={profile.resendVerification}
					confirmVerificationToken={profile.confirmVerificationToken}
				/>

				<ProfileEmailSection
					user={profile.user}
					isVerified={profile.isVerified}
					emailChangeInProgress={profile.emailChangeInProgress}
					newEmail={profile.newEmail}
					setNewEmail={profile.setNewEmail}
					emailChangePassword={profile.emailChangePassword}
					setEmailChangePassword={profile.setEmailChangePassword}
					changingEmail={profile.changingEmail}
					saveEmailChange={profile.saveEmailChange}
				/>

				<ProfilePasswordSection
					currentPassword={profile.currentPassword}
					setCurrentPassword={profile.setCurrentPassword}
					newPassword={profile.newPassword}
					setNewPassword={profile.setNewPassword}
					newPasswordConfirmation={profile.newPasswordConfirmation}
					setNewPasswordConfirmation={profile.setNewPasswordConfirmation}
					newPasswordError={profile.newPasswordError}
					setNewPasswordError={profile.setNewPasswordError}
					newPasswordConfirmationError={profile.newPasswordConfirmationError}
					setNewPasswordConfirmationError={profile.setNewPasswordConfirmationError}
					saving={profile.saving}
					resolvePasswordError={profile.resolvePasswordError}
					savePassword={profile.savePassword}
				/>

				<ProfileStatisticsSection
					statisticsLoading={profile.statisticsLoading}
					statisticsLoaded={profile.statisticsLoaded}
					statisticsImageCount={profile.statisticsImageCount}
					statisticsUsedMegabytes={profile.statisticsUsedMegabytes}
				/>

				<ProfileSessionsSection
					sessions={profile.sessions}
					sessionsLoading={profile.sessionsLoading}
					revokingSessionId={profile.revokingSessionId}
					revokingOthers={profile.revokingOthers}
					hasOtherSessions={profile.hasOtherSessions}
					revokeSession={profile.revokeSession}
					revokeOthers={profile.revokeOthers}
					formatSessionDate={profile.formatSessionDate}
				/>

				<ProfileDeleteAccountSection
					user={profile.user}
					deleteConfirm={profile.deleteConfirm}
					setDeleteConfirm={profile.setDeleteConfirm}
					deletePassword={profile.deletePassword}
					setDeletePassword={profile.setDeletePassword}
					deleting={profile.deleting}
					deleteConfirmWord={profile.deleteConfirmWord}
					onDeleteAccount={profile.onDeleteAccount}
				/>
			</AccordionGroup>
		</div>
	)
}
