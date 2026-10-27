import { NextRequest, NextResponse } from 'next/server'
import ApiPresenter from '@/utils/Api.presenter'
import { applyDeviceCookie, applySessionCookie } from '@/utils/session'
import type { CompletedLogin } from '@/useCases/shared/completeLogin'

/** Resposta de um login concluído (senha, ou senha + 2FA): cookies de sessão e de dispositivo. */
export function respondWithCompletedLogin(request: NextRequest, result: CompletedLogin): NextResponse {
	if (result.kind === 'deletion_decision') {
		const response = NextResponse.json(
			ApiPresenter.success('Account deletion decision required', {
				deletionDecisionRequired: true,
				deletedAt: result.deletedAt.toISOString(),
				deadlineAt: result.deadlineAt.toISOString(),
			}),
			{ status: 200 }
		)
		applySessionCookie(response.cookies, result.token, result.ttlSeconds, request)
		applyDeviceCookie(response.cookies, result.device, request)
		return response
	}

	const response = NextResponse.json(
		ApiPresenter.success('Login successful', {
			user: result.user,
			settings: result.settings,
		}),
		{ status: 200 }
	)
	applySessionCookie(response.cookies, result.token, result.ttlSeconds, request)
	applyDeviceCookie(response.cookies, result.device, request)
	return response
}
