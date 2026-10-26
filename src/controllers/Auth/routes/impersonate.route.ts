import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/managers/Db.manager'
import type ConsumeImpersonationToken from '@/useCases/consumeImpersonationToken.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ConflictError, ValidationError } from '@/errors'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'
import { tryAuth } from '@/middleware/auth.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { applySessionCookie } from '@/utils/session'

type Dependencies = {
	consumeImpersonationTokenUseCase: ConsumeImpersonationToken
}

const bodySchema = z.object({
	token: z.string().min(1),
})

export default async function impersonateRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		assertAuthRateLimit(request, 'impersonate')
		const body = await parseJsonBodyUnknown(request)

		// O link só vale em navegador sem sessão: não sobrescreve a sessão de quem já está logado.
		if (await tryAuth(request, getPrismaClient())) {
			throw new ConflictError('Impersonation requires a browser without an active session')
		}

		const parsed = bodySchema.safeParse(body)
		if (!parsed.success) {
			throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
		}

		const result = await dependencies.consumeImpersonationTokenUseCase.run({ token: parsed.data.token })

		const maxAgeSeconds = Math.max(1, result.exp - Math.floor(Date.now() / 1000))
		const response = NextResponse.json(
			ApiPresenter.success('Impersonation started', { expiresAt: new Date(result.exp * 1000).toISOString() }),
			{ status: 200, headers: { 'Cache-Control': 'no-store' } }
		)
		// Sem applyDeviceCookie: o navegador não ganha device nem dispara aviso de novo login.
		applySessionCookie(response.cookies, result.token, maxAgeSeconds, request)
		return response
	})
}
