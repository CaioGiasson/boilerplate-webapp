import { NextRequest, NextResponse } from 'next/server'
import type { AppError } from '@/errors'
import { AppError as AppErrorClass, TooManyRequestsError } from '@/errors'
import ApiPresenter from '@/utils/Api.presenter'
import ErrorManager from '@/managers/Error.manager'

/**
 * Executa um handler de rota com tratamento padronizado de erros.
 */
export async function handleRoute(handler: () => Promise<NextResponse>): Promise<NextResponse> {
	try {
		return await handler()
	} catch (error: unknown) {
		if (error instanceof AppErrorClass) {
			ErrorManager.log(error)
			const headers =
				error instanceof TooManyRequestsError && error.retryAfterSeconds != null
					? { 'Retry-After': String(error.retryAfterSeconds) }
					: undefined
			return NextResponse.json(ApiPresenter.error(error as AppError), {
				status: error.statusCode,
				headers,
			})
		}

		ErrorManager.log(error as Error)
		return NextResponse.json(ApiPresenter.unknownError(), { status: 500 })
	}
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
