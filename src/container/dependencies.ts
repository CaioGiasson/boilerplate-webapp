import ExampleService from '@/services/Example/Example.service'
import RecoverOrGenerateExample from '@/useCases/recoverOrGenerateExample.usecase'
import RegisterUser from '@/useCases/registerUser.usecase'
import LoginUser from '@/useCases/loginUser.usecase'
import LogoutUser from '@/useCases/logoutUser.usecase'
import CheckNicknameAvailability from '@/useCases/checkNicknameAvailability.usecase'
import GetUserProfile from '@/useCases/getUserProfile.usecase'
import UpdateUserProfile from '@/useCases/updateUserProfile.usecase'
import ChangeUserPassword from '@/useCases/changeUserPassword.usecase'
import UploadUserPhoto from '@/useCases/uploadUserPhoto.usecase'
import SetUserSetting from '@/useCases/setUserSetting.usecase'
import ExportUserData from '@/useCases/exportUserData.usecase'
import DeleteUserAccount from '@/useCases/deleteUserAccount.usecase'
import CancelAccountDeletion from '@/useCases/cancelAccountDeletion.usecase'
import KeepAccountDeletion from '@/useCases/keepAccountDeletion.usecase'
import GetAccountDeletionStatus from '@/useCases/getAccountDeletionStatus.usecase'
import SendEmailVerification from '@/useCases/sendEmailVerification.usecase'
import ConfirmEmailChallenge from '@/useCases/confirmEmailChallenge.usecase'
import RequestEmailChange from '@/useCases/requestEmailChange.usecase'
import ForgotPassword from '@/useCases/forgotPassword.usecase'
import ResetPassword from '@/useCases/resetPassword.usecase'
import ListUserSessions from '@/useCases/listUserSessions.usecase'
import GetUserStorageStats from '@/useCases/getUserStorageStats.usecase'
import RevokeUserSession from '@/useCases/revokeUserSession.usecase'
import RevokeOtherUserSessions from '@/useCases/revokeOtherUserSessions.usecase'
import StartGoogleOAuth from '@/useCases/startGoogleOAuth.usecase'
import HandleGoogleOAuthCallback from '@/useCases/handleGoogleOAuthCallback.usecase'
import CompleteGoogleRegistration from '@/useCases/completeGoogleRegistration.usecase'
import LinkGoogleAccount from '@/useCases/linkGoogleAccount.usecase'

export type AppDependencies = {
	exampleService: ExampleService
	recoverOrGenerateExampleUseCase: RecoverOrGenerateExample
	registerUserUseCase: RegisterUser
	loginUserUseCase: LoginUser
	logoutUserUseCase: LogoutUser
	checkNicknameAvailabilityUseCase: CheckNicknameAvailability
	getUserProfileUseCase: GetUserProfile
	updateUserProfileUseCase: UpdateUserProfile
	changeUserPasswordUseCase: ChangeUserPassword
	uploadUserPhotoUseCase: UploadUserPhoto
	setUserSettingUseCase: SetUserSetting
	exportUserDataUseCase: ExportUserData
	deleteUserAccountUseCase: DeleteUserAccount
	cancelAccountDeletionUseCase: CancelAccountDeletion
	keepAccountDeletionUseCase: KeepAccountDeletion
	getAccountDeletionStatusUseCase: GetAccountDeletionStatus
	sendEmailVerificationUseCase: SendEmailVerification
	confirmEmailChallengeUseCase: ConfirmEmailChallenge
	requestEmailChangeUseCase: RequestEmailChange
	forgotPasswordUseCase: ForgotPassword
	resetPasswordUseCase: ResetPassword
	listUserSessionsUseCase: ListUserSessions
	getUserStorageStatsUseCase: GetUserStorageStats
	revokeUserSessionUseCase: RevokeUserSession
	revokeOtherUserSessionsUseCase: RevokeOtherUserSessions
	startGoogleOAuthUseCase: StartGoogleOAuth
	handleGoogleOAuthCallbackUseCase: HandleGoogleOAuthCallback
	completeGoogleRegistrationUseCase: CompleteGoogleRegistration
	linkGoogleAccountUseCase: LinkGoogleAccount
}

let cachedDependencies: AppDependencies | null = null

export function getDependencies(): AppDependencies {
	if (cachedDependencies) {
		return cachedDependencies
	}

	const exampleService = new ExampleService()
	const recoverOrGenerateExampleUseCase = new RecoverOrGenerateExample(exampleService)
	const registerUserUseCase = new RegisterUser()
	const loginUserUseCase = new LoginUser()
	const logoutUserUseCase = new LogoutUser()
	const checkNicknameAvailabilityUseCase = new CheckNicknameAvailability()
	const getUserProfileUseCase = new GetUserProfile()
	const updateUserProfileUseCase = new UpdateUserProfile()
	const changeUserPasswordUseCase = new ChangeUserPassword()
	const uploadUserPhotoUseCase = new UploadUserPhoto()
	const setUserSettingUseCase = new SetUserSetting()
	const exportUserDataUseCase = new ExportUserData()
	const deleteUserAccountUseCase = new DeleteUserAccount()
	const cancelAccountDeletionUseCase = new CancelAccountDeletion()
	const keepAccountDeletionUseCase = new KeepAccountDeletion()
	const getAccountDeletionStatusUseCase = new GetAccountDeletionStatus()
	const sendEmailVerificationUseCase = new SendEmailVerification()
	const confirmEmailChallengeUseCase = new ConfirmEmailChallenge()
	const requestEmailChangeUseCase = new RequestEmailChange()
	const forgotPasswordUseCase = new ForgotPassword()
	const resetPasswordUseCase = new ResetPassword()
	const listUserSessionsUseCase = new ListUserSessions()
	const getUserStorageStatsUseCase = new GetUserStorageStats()
	const revokeUserSessionUseCase = new RevokeUserSession()
	const revokeOtherUserSessionsUseCase = new RevokeOtherUserSessions()
	const startGoogleOAuthUseCase = new StartGoogleOAuth()
	const handleGoogleOAuthCallbackUseCase = new HandleGoogleOAuthCallback()
	const completeGoogleRegistrationUseCase = new CompleteGoogleRegistration()
	const linkGoogleAccountUseCase = new LinkGoogleAccount()

	cachedDependencies = {
		exampleService,
		recoverOrGenerateExampleUseCase,
		registerUserUseCase,
		loginUserUseCase,
		logoutUserUseCase,
		checkNicknameAvailabilityUseCase,
		getUserProfileUseCase,
		updateUserProfileUseCase,
		changeUserPasswordUseCase,
		uploadUserPhotoUseCase,
		setUserSettingUseCase,
		exportUserDataUseCase,
		deleteUserAccountUseCase,
		cancelAccountDeletionUseCase,
		keepAccountDeletionUseCase,
		getAccountDeletionStatusUseCase,
		sendEmailVerificationUseCase,
		confirmEmailChallengeUseCase,
		requestEmailChangeUseCase,
		forgotPasswordUseCase,
		resetPasswordUseCase,
		listUserSessionsUseCase,
		getUserStorageStatsUseCase,
		revokeUserSessionUseCase,
		revokeOtherUserSessionsUseCase,
		startGoogleOAuthUseCase,
		handleGoogleOAuthCallbackUseCase,
		completeGoogleRegistrationUseCase,
		linkGoogleAccountUseCase,
	}

	return cachedDependencies
}
