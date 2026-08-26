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
}

export default class ApiPresenter {
	static success<T>(message: string, data: T): ApiSuccessResponse<T> {
		return {
			success: true,
			message,
			data,
		}
	}

	static error(error: AppError): ApiErrorResponse {
		return {
			success: false,
			message: error.message,
			code: error.code,
		}
	}

	static unknownError(message = 'Internal server error'): ApiErrorResponse {
		return {
			success: false,
			message,
			code: 'INTERNAL_ERROR',
		}
	}
}
