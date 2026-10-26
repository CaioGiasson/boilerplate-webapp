import { NextRequest, NextResponse } from 'next/server'
import LogoutUser from '@/useCases/logoutUser.usecase'
import { handleRoute } from '@/utils/routeHandler'
import { readSessionTokenFromRequest } from '@/middleware/auth.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { clearSessionCookies, isImpersonationSession, verifySessionToken } from '@/utils/session'

type Dependencies = {
	logoutUserUseCase: LogoutUser
}

async function isImpersonationToken(token: string): Promise<boolean> {
	try {
		return isImpersonationSession(await verifySessionToken(token))
	} catch {
		return false
	}
}

export default async function logoutRoute(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const token = readSessionTokenFromRequest(request)
		const impersonating = token ? await isImpersonationToken(token) : false
		if (token) {
			try {
				await dependencies.logoutUserUseCase.run({ token })
			} catch {
				// Invalid or already-revoked tokens still clear the cookie.
			}
		}

		const response = new NextResponse(null, { status: 204 })
		clearSessionCookies(response.cookies, request, { keepDevice: impersonating })
		return response
	})
}
