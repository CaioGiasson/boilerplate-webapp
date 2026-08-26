import { NextRequest, NextResponse } from 'next/server'
import registerRoute from './routes/register.route'
import loginRoute from './routes/login.route'
import logoutRoute from './routes/logout.route'
import meRoute from './routes/me.route'
import sendEmailVerificationRoute from './routes/sendEmailVerification.route'
import confirmEmailChallengeRoute from './routes/confirmEmailChallenge.route'
import forgotPasswordRoute from './routes/forgotPassword.route'
import resetPasswordRoute from './routes/resetPassword.route'
import googleStartRoute from './routes/googleStart.route'
import googleCallbackRoute from './routes/googleCallback.route'
import completeGoogleRegistrationRoute from './routes/completeGoogleRegistration.route'
import linkGoogleAccountRoute from './routes/linkGoogleAccount.route'
import type RegisterUser from '@/useCases/registerUser.usecase'
import type LoginUser from '@/useCases/loginUser.usecase'
import type LogoutUser from '@/useCases/logoutUser.usecase'
import type GetUserProfile from '@/useCases/getUserProfile.usecase'
import type SendEmailVerification from '@/useCases/sendEmailVerification.usecase'
import type ConfirmEmailChallenge from '@/useCases/confirmEmailChallenge.usecase'
import type ForgotPassword from '@/useCases/forgotPassword.usecase'
import type ResetPassword from '@/useCases/resetPassword.usecase'
import type StartGoogleOAuth from '@/useCases/startGoogleOAuth.usecase'
import type HandleGoogleOAuthCallback from '@/useCases/handleGoogleOAuthCallback.usecase'
import type CompleteGoogleRegistration from '@/useCases/completeGoogleRegistration.usecase'
import type LinkGoogleAccount from '@/useCases/linkGoogleAccount.usecase'

type Dependencies = {
	registerUserUseCase: RegisterUser
	loginUserUseCase: LoginUser
	logoutUserUseCase: LogoutUser
	getUserProfileUseCase: GetUserProfile
	sendEmailVerificationUseCase: SendEmailVerification
	confirmEmailChallengeUseCase: ConfirmEmailChallenge
	forgotPasswordUseCase: ForgotPassword
	resetPasswordUseCase: ResetPassword
	startGoogleOAuthUseCase: StartGoogleOAuth
	handleGoogleOAuthCallbackUseCase: HandleGoogleOAuthCallback
	completeGoogleRegistrationUseCase: CompleteGoogleRegistration
	linkGoogleAccountUseCase: LinkGoogleAccount
}

export default class AuthController {
	static register(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return registerRoute(request, dependencies)
	}

	static login(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return loginRoute(request, dependencies)
	}

	static logout(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return logoutRoute(request, dependencies)
	}

	static me(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return meRoute(request, dependencies)
	}

	static sendEmailVerification(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return sendEmailVerificationRoute(request, dependencies)
	}

	static confirmEmailChallenge(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return confirmEmailChallengeRoute(request, dependencies)
	}

	static forgotPassword(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return forgotPasswordRoute(request, dependencies)
	}

	static resetPassword(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return resetPasswordRoute(request, dependencies)
	}

	static googleStart(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return googleStartRoute(request, dependencies)
	}

	static googleCallback(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return googleCallbackRoute(request, dependencies)
	}

	static completeGoogleRegistration(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return completeGoogleRegistrationRoute(request, dependencies)
	}

	static linkGoogleAccount(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return linkGoogleAccountRoute(request, dependencies)
	}
}
