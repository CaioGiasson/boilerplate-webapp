import type { AppError } from '@/errors/AppError'

export type ApiSuccessResponse<T> = {
	success: true
	message: string
	data: T
}

export type ApiErrorResponse = {
	success: false
	message: string
	code: string
	/** Id para achar a requisição nos logs; o mesmo vai no header `x-request-id`. */
	requestId?: string
}

export default class ApiPresenter {
	static success<T>(message: string, data: T): ApiSuccessResponse<T> {
		return {
			success: true,
			message,
			data,
		}
	}

	static error(error: AppError, requestId?: string): ApiErrorResponse {
		return {
			success: false,
			message: error.message,
			code: error.code,
			...(requestId ? { requestId } : {}),
		}
	}

	static unknownError(message = 'Internal server error', requestId?: string): ApiErrorResponse {
		return {
			success: false,
			message,
			code: 'INTERNAL_ERROR',
			...(requestId ? { requestId } : {}),
		}
	}
}
