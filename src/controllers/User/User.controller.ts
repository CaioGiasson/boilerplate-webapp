import { NextRequest, NextResponse } from 'next/server'
import checkNicknameRoute from './routes/checkNickname.route'
import getProfileRoute from './routes/getProfile.route'
import updateProfileRoute from './routes/updateProfile.route'
import changePasswordRoute from './routes/changePassword.route'
import uploadPhotoRoute from './routes/uploadPhoto.route'
import setSettingRoute from './routes/setSetting.route'
import deleteAccountRoute from './routes/deleteAccount.route'
import cancelAccountDeletionRoute from './routes/cancelAccountDeletion.route'
import keepAccountDeletionRoute from './routes/keepAccountDeletion.route'
import getAccountDeletionStatusRoute from './routes/getAccountDeletionStatus.route'
import requestEmailChangeRoute from './routes/requestEmailChange.route'
import listSessionsRoute from './routes/listSessions.route'
import getStorageStatsRoute from './routes/getStorageStats.route'
import revokeSessionRoute from './routes/revokeSession.route'
import revokeOtherSessionsRoute from './routes/revokeOtherSessions.route'
import {
	beginTwoFactorSetupRoute,
	disableTwoFactorRoute,
	enableTwoFactorRoute,
	getTwoFactorStatusRoute,
	regenerateRecoveryCodesRoute,
} from './routes/twoFactor.route'
import type CheckNicknameAvailability from '@/useCases/checkNicknameAvailability.usecase'
import type GetUserProfile from '@/useCases/getUserProfile.usecase'
import type UpdateUserProfile from '@/useCases/updateUserProfile.usecase'
import type ChangeUserPassword from '@/useCases/changeUserPassword.usecase'
import type UploadUserPhoto from '@/useCases/uploadUserPhoto.usecase'
import type SetUserSetting from '@/useCases/setUserSetting.usecase'
import type DeleteUserAccount from '@/useCases/deleteUserAccount.usecase'
import type CancelAccountDeletion from '@/useCases/cancelAccountDeletion.usecase'
import type KeepAccountDeletion from '@/useCases/keepAccountDeletion.usecase'
import type GetAccountDeletionStatus from '@/useCases/getAccountDeletionStatus.usecase'
import type RequestEmailChange from '@/useCases/requestEmailChange.usecase'
import type ListUserSessions from '@/useCases/listUserSessions.usecase'
import type GetUserStorageStats from '@/useCases/getUserStorageStats.usecase'
import type RevokeUserSession from '@/useCases/revokeUserSession.usecase'
import type RevokeOtherUserSessions from '@/useCases/revokeOtherUserSessions.usecase'
import type GetTwoFactorStatus from '@/useCases/getTwoFactorStatus.usecase'
import type BeginTwoFactorSetup from '@/useCases/beginTwoFactorSetup.usecase'
import type EnableTwoFactor from '@/useCases/enableTwoFactor.usecase'
import type DisableTwoFactor from '@/useCases/disableTwoFactor.usecase'
import type RegenerateRecoveryCodes from '@/useCases/regenerateRecoveryCodes.usecase'

type Dependencies = {
	checkNicknameAvailabilityUseCase: CheckNicknameAvailability
	getUserProfileUseCase: GetUserProfile
	updateUserProfileUseCase: UpdateUserProfile
	changeUserPasswordUseCase: ChangeUserPassword
	uploadUserPhotoUseCase: UploadUserPhoto
	setUserSettingUseCase: SetUserSetting
	deleteUserAccountUseCase: DeleteUserAccount
	cancelAccountDeletionUseCase: CancelAccountDeletion
	keepAccountDeletionUseCase: KeepAccountDeletion
	getAccountDeletionStatusUseCase: GetAccountDeletionStatus
	requestEmailChangeUseCase: RequestEmailChange
	listUserSessionsUseCase: ListUserSessions
	getUserStorageStatsUseCase: GetUserStorageStats
	revokeUserSessionUseCase: RevokeUserSession
	revokeOtherUserSessionsUseCase: RevokeOtherUserSessions
	getTwoFactorStatusUseCase: GetTwoFactorStatus
	beginTwoFactorSetupUseCase: BeginTwoFactorSetup
	enableTwoFactorUseCase: EnableTwoFactor
	disableTwoFactorUseCase: DisableTwoFactor
	regenerateRecoveryCodesUseCase: RegenerateRecoveryCodes
}

export default class UserController {
	static checkNickname(request: NextRequest, dependencies: Dependencies, nickname: string): Promise<NextResponse> {
		return checkNicknameRoute(request, dependencies, nickname)
	}

	static getProfile(request: NextRequest, dependencies: Dependencies, userId: string): Promise<NextResponse> {
		return getProfileRoute(request, dependencies, userId)
	}

	static updateProfile(request: NextRequest, dependencies: Dependencies, userId: string): Promise<NextResponse> {
		return updateProfileRoute(request, dependencies, userId)
	}

	static changePassword(request: NextRequest, dependencies: Dependencies, userId: string): Promise<NextResponse> {
		return changePasswordRoute(request, dependencies, userId)
	}

	static uploadPhoto(request: NextRequest, dependencies: Dependencies, userId: string): Promise<NextResponse> {
		return uploadPhotoRoute(request, dependencies, userId)
	}

	static setSetting(request: NextRequest, dependencies: Dependencies, userId: string): Promise<NextResponse> {
		return setSettingRoute(request, dependencies, userId)
	}

	static deleteAccount(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return deleteAccountRoute(request, dependencies)
	}

	static cancelAccountDeletion(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return cancelAccountDeletionRoute(request, dependencies)
	}

	static keepAccountDeletion(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return keepAccountDeletionRoute(request, dependencies)
	}

	static getAccountDeletionStatus(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return getAccountDeletionStatusRoute(request, dependencies)
	}

	static requestEmailChange(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return requestEmailChangeRoute(request, dependencies)
	}

	static listSessions(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return listSessionsRoute(request, dependencies)
	}

	static getStorageStats(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return getStorageStatsRoute(request, dependencies)
	}

	static revokeSession(request: NextRequest, dependencies: Dependencies, sessionId: string): Promise<NextResponse> {
		return revokeSessionRoute(request, dependencies, sessionId)
	}

	static revokeOtherSessions(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return revokeOtherSessionsRoute(request, dependencies)
	}

	static getTwoFactorStatus(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return getTwoFactorStatusRoute(request, dependencies)
	}

	static beginTwoFactorSetup(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return beginTwoFactorSetupRoute(request, dependencies)
	}

	static enableTwoFactor(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return enableTwoFactorRoute(request, dependencies)
	}

	static disableTwoFactor(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return disableTwoFactorRoute(request, dependencies)
	}

	static regenerateRecoveryCodes(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return regenerateRecoveryCodesRoute(request, dependencies)
	}
}
