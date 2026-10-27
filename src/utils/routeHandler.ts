import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { AppError } from '@/errors'
import { AppError as AppErrorClass, TooManyRequestsError } from '@/errors'
import ApiPresenter from '@/utils/Api.presenter'
import ErrorManager from '@/managers/Error.manager'
import { REQUEST_ID_HEADER, resolveRequestId, runWithRequestContext } from '@/lib/requestContext'

async function incomingRequestId(): Promise<string> {
	try {
		return resolveRequestId((await headers()).get(REQUEST_ID_HEADER))
	} catch {
		// Fora do escopo de uma requisição do Next (testes, scripts): gera um id novo.
		return resolveRequestId(null)
	}
}

function withRequestId(response: NextResponse, requestId: string): NextResponse {
	try {
		response.headers.set(REQUEST_ID_HEADER, requestId)
	} catch {
		// Resposta com headers imutáveis: segue sem o header em vez de falhar a requisição.
	}
	return response
}

/**
 * Executa um handler de rota com tratamento padronizado de erros.
 * Cada chamada tem um `requestId` (o `x-request-id` de entrada, se válido): vai para os logs, para o
 * header da resposta e para o corpo dos erros.
 */
export async function handleRoute(handler: () => Promise<NextResponse>): Promise<NextResponse> {
	const requestId = await incomingRequestId()

	return runWithRequestContext(requestId, async () => {
		try {
			return withRequestId(await handler(), requestId)
		} catch (error: unknown) {
			if (error instanceof AppErrorClass) {
				ErrorManager.log(error)
				const retryAfter =
					error instanceof TooManyRequestsError && error.retryAfterSeconds != null
						? { 'Retry-After': String(error.retryAfterSeconds) }
						: undefined
				return withRequestId(
					NextResponse.json(ApiPresenter.error(error as AppError, requestId), {
						status: error.statusCode,
						headers: retryAfter,
					}),
					requestId
				)
			}

			ErrorManager.log(error as Error)
			return withRequestId(
				NextResponse.json(ApiPresenter.unknownError('Internal server error', requestId), { status: 500 }),
				requestId
			)
		}
	})
}

export function parseJsonBody<T>(request: NextRequest): Promise<T> {
	return request.json() as Promise<T>
}

export async function parseJsonBodyUnknown(request: NextRequest): Promise<unknown> {
	try {
		return await request.json()
	} catch {
		return undefined
	}
}
