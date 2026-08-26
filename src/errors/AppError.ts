export type AppErrorParams = {
	message: string
	code: string
	statusCode: number
	cause?: unknown
}

export abstract class AppError extends Error {
	readonly code: string
	readonly statusCode: number
	readonly cause?: unknown

	constructor(params: AppErrorParams) {
		super(params.message)
		this.name = this.constructor.name
		this.code = params.code
		this.statusCode = params.statusCode
		this.cause = params.cause
	}
}
