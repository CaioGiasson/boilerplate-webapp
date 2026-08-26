import { AppError } from './AppError'

export class InfraError extends AppError {
	constructor(message: string, code = 'INFRA_ERROR', cause?: unknown) {
		super({ message, code, statusCode: 500, cause })
	}
}

export class RepositoryError extends InfraError {
	constructor(message: string, cause?: unknown) {
		super(message, 'REPOSITORY_ERROR', cause)
		this.name = 'RepositoryError'
	}
}

export class ServiceError extends InfraError {
	constructor(message: string, cause?: unknown) {
		super(message, 'SERVICE_ERROR', cause)
		this.name = 'ServiceError'
	}
}

export class IntegrationError extends InfraError {
	constructor(message: string, cause?: unknown) {
		super(message, 'INTEGRATION_ERROR', cause)
		this.name = 'IntegrationError'
	}
}
