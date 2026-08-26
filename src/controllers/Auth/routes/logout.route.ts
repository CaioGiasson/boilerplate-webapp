import { NextRequest, NextResponse } from 'next/server'
import LogoutUser from '@/useCases/logoutUser.usecase'
import { handleRoute } from '@/utils/routeHandler'
import { readSessionTokenFromRequest } from '@/middleware/auth.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { clearSessionCookies } from '@/utils/session'

type Dependencies = {
	logoutUserUseCase: LogoutUser
}

export default async function logoutRoute(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const token = readSessionTokenFromRequest(request)
		if (token) {
			try {
				await dependencies.logoutUserUseCase.run({ token })
			} catch {
				// Invalid or already-revoked tokens still clear the cookie.
			}
		}

		const response = new NextResponse(null, { status: 204 })
		clearSessionCookies(response.cookies, request)
		return response
	})
}
