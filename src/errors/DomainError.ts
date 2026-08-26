import { AppError } from './AppError'

export class DomainError extends AppError {
	constructor(message: string, code = 'DOMAIN_ERROR') {
		super({ message, code, statusCode: 500 })
	}
}

export class UseCaseError extends DomainError {
	constructor(message: string, code = 'USE_CASE_ERROR') {
		super(message, code)
		this.name = 'UseCaseError'
	}
}
