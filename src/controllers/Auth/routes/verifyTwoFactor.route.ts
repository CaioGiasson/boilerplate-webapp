import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import VerifyTwoFactorLogin from '@/useCases/verifyTwoFactorLogin.usecase'
import { ValidationError } from '@/errors'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { readDeviceCookieValue } from '@/utils/session'
import { respondWithCompletedLogin } from './loginResponse'

type Dependencies = {
	verifyTwoFactorLoginUseCase: VerifyTwoFactorLogin
}

const bodySchema = z.object({
	challengeToken: z.string().min(1).max(2000),
	code: z.string().min(1).max(10).optional(),
	recoveryCode: z.string().min(1).max(32).optional(),
})

/** Segundo passo do login. O limite por IP (5/min, com bloqueio progressivo) segura a força bruta dos 6 dígitos. */
export default async function verifyTwoFactorRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		assertAuthRateLimit(request, 'two-factor-verify')

		const parsed = bodySchema.safeParse(await parseJsonBodyUnknown(request))
		if (!parsed.success) {
			throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
		}

		const result = await dependencies.verifyTwoFactorLoginUseCase.run({
			...parsed.data,
			deviceCookie: readDeviceCookieValue(request.cookies),
		})

		return respondWithCompletedLogin(request, result)
	})
}
