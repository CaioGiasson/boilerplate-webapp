import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/managers/Db.manager'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { assertNotImpersonation, requireAuth } from '@/middleware/auth.middleware'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'
import type GetTwoFactorStatus from '@/useCases/getTwoFactorStatus.usecase'
import type BeginTwoFactorSetup from '@/useCases/beginTwoFactorSetup.usecase'
import type EnableTwoFactor from '@/useCases/enableTwoFactor.usecase'
import type DisableTwoFactor from '@/useCases/disableTwoFactor.usecase'
import type RegenerateRecoveryCodes from '@/useCases/regenerateRecoveryCodes.usecase'

type Dependencies = {
	getTwoFactorStatusUseCase: GetTwoFactorStatus
	beginTwoFactorSetupUseCase: BeginTwoFactorSetup
	enableTwoFactorUseCase: EnableTwoFactor
	disableTwoFactorUseCase: DisableTwoFactor
	regenerateRecoveryCodesUseCase: RegenerateRecoveryCodes
}

const NO_STORE = { 'Cache-Control': 'no-store' }

const codeBodySchema = z.object({ code: z.string().min(1).max(10) })
const disableBodySchema = z.object({
	password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
	code: z.string().min(1).max(10).optional(),
	recoveryCode: z.string().min(1).max(32).optional(),
})

async function parseBody<T>(request: NextRequest, schema: z.ZodType<T>): Promise<T> {
	const parsed = schema.safeParse(await parseJsonBodyUnknown(request))
	if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
	return parsed.data
}

/**
 * Rotas de configuração do 2FA da própria conta. Todas exigem sessão real (nunca impersonamento); as que mudam
 * estado também exigem same-origin e passam pelo limite de tentativas (o código de 6 dígitos é adivinhável).
 */
export function getTwoFactorStatusRoute(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
	return handleRoute(async () => {
		const session = await requireAuth(request, getPrismaClient())
		const result = await dependencies.getTwoFactorStatusUseCase.run({ userId: session.userId })
		return NextResponse.json(ApiPresenter.success('Two-factor status', result), { status: 200, headers: NO_STORE })
	})
}

export function beginTwoFactorSetupRoute(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const session = await requireAuth(request, getPrismaClient())
		assertNotImpersonation(session)
		assertAuthRateLimit(request, `two-factor-setup:${session.userId}`)

		const result = await dependencies.beginTwoFactorSetupUseCase.run({ userId: session.userId })
		return NextResponse.json(ApiPresenter.success('Two-factor setup started', result), {
			status: 200,
			headers: NO_STORE,
		})
	})
}

export function enableTwoFactorRoute(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const session = await requireAuth(request, getPrismaClient())
		assertNotImpersonation(session)
		assertAuthRateLimit(request, `two-factor-enable:${session.userId}`)

		const { code } = await parseBody(request, codeBodySchema)
		const result = await dependencies.enableTwoFactorUseCase.run({ userId: session.userId, code })
		return NextResponse.json(ApiPresenter.success('Two-factor enabled', result), { status: 200, headers: NO_STORE })
	})
}

export function disableTwoFactorRoute(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const session = await requireAuth(request, getPrismaClient())
		assertNotImpersonation(session)
		assertAuthRateLimit(request, `two-factor-disable:${session.userId}`)

		const body = await parseBody(request, disableBodySchema)
		const result = await dependencies.disableTwoFactorUseCase.run({ userId: session.userId, ...body })
		return NextResponse.json(ApiPresenter.success('Two-factor disabled', result), { status: 200 })
	})
}

export function regenerateRecoveryCodesRoute(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const session = await requireAuth(request, getPrismaClient())
		assertNotImpersonation(session)
		assertAuthRateLimit(request, `two-factor-recovery:${session.userId}`)

		const { code } = await parseBody(request, codeBodySchema)
		const result = await dependencies.regenerateRecoveryCodesUseCase.run({ userId: session.userId, code })
		return NextResponse.json(ApiPresenter.success('Recovery codes regenerated', result), {
			status: 200,
			headers: NO_STORE,
		})
	})
}
