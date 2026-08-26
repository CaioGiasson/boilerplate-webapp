import { AppError } from './AppError'

export class ClientError extends AppError {
	constructor(message: string, code = 'CLIENT_ERROR', statusCode = 400) {
		super({ message, code, statusCode })
	}
}

export class ValidationError extends ClientError {
	constructor(message: string, code = 'VALIDATION_ERROR') {
		super(message, code, 400)
		this.name = 'ValidationError'
	}
}

export class NotFoundError extends ClientError {
	constructor(message: string) {
		super(message, 'NOT_FOUND', 404)
		this.name = 'NotFoundError'
	}
}

export class UnauthorizedError extends ClientError {
	constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
		super(message, code, 401)
		this.name = 'UnauthorizedError'
	}
}

export class ForbiddenError extends ClientError {
	constructor(message = 'Forbidden') {
		super(message, 'FORBIDDEN', 403)
		this.name = 'ForbiddenError'
	}
}

export class ConflictError extends ClientError {
	constructor(message: string) {
		super(message, 'CONFLICT', 409)
		this.name = 'ConflictError'
	}
}

export class TooManyRequestsError extends ClientError {
	readonly retryAfterSeconds?: number

	constructor(message = 'Too many requests. Try again later.', retryAfterSeconds?: number) {
		super(message, 'RATE_LIMITED', 429)
		this.name = 'TooManyRequestsError'
		this.retryAfterSeconds = retryAfterSeconds
	}
}

export class ServiceUnavailableError extends ClientError {
	constructor(message = 'Service unavailable') {
		super(message, 'SERVICE_UNAVAILABLE', 503)
		this.name = 'ServiceUnavailableError'
	}
}
