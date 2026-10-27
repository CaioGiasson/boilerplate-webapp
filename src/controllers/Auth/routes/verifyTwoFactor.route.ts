import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import VerifyTwoFactorLogin from '@/useCases/verifyTwoFactorLogin.usecase'
import { ValidationError } from '@/errors'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { assertTwoFactorIpRateLimit, assertTwoFactorUserRateLimit } from '@/middleware/rateLimit.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { readDeviceCookieValue } from '@/utils/session'
import { verifyTwoFactorChallenge } from '@/utils/twoFactorChallenge'
import { respondWithCompletedLogin } from './loginResponse'

type Dependencies = {
	verifyTwoFactorLoginUseCase: VerifyTwoFactorLogin
}

const bodySchema = z.object({
	challengeToken: z.string().min(1).max(2000),
	code: z.string().min(1).max(10).optional(),
	recoveryCode: z.string().min(1).max(32).optional(),
})

/** Segundo passo do login. Limites: 30/min por IP e 5/min por conta (bloqueio progressivo); o da conta segura a força bruta dos 6 dígitos. */
export default async function verifyTwoFactorRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		assertTwoFactorIpRateLimit(request)

		const parsed = bodySchema.safeParse(await parseJsonBodyUnknown(request))
		if (!parsed.success) {
			throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
		}

		// Desafio inválido não gasta o limite de ninguém: o use case responde 401 do mesmo jeito.
		const userId = await verifyTwoFactorChallenge(parsed.data.challengeToken).catch(() => null)
		if (userId) assertTwoFactorUserRateLimit(userId)

		const result = await dependencies.verifyTwoFactorLoginUseCase.run({
			...parsed.data,
			deviceCookie: readDeviceCookieValue(request.cookies),
		})

		return respondWithCompletedLogin(request, result)
	})
}
