export type ApiErrorKind = 'timeout' | 'unauthorized' | 'server' | 'network' | 'generic'

export type ApiErrorMessages = {
	timeout: string
	unauthorized: string
	server: string
	network: string
	generic: string
}

type ApiEnvelope<T> = {
	success: boolean
	message: string
	data?: T
	code?: string
}

export class ApiClientError extends Error {
	readonly code: string
	readonly kind: ApiErrorKind
	readonly status?: number

	constructor(message: string, code = 'UNKNOWN', kind: ApiErrorKind = 'generic', status?: number) {
		super(message)
		this.name = 'ApiClientError'
		this.code = code
		this.kind = kind
		this.status = status
	}
}

export function kindFromHttpStatus(status: number): ApiErrorKind {
	if (status === 401 || status === 403) return 'unauthorized'
	if (status >= 500) return 'server'
	return 'generic'
}

export function classifyThrownError(error: unknown): ApiErrorKind {
	if (error instanceof ApiClientError) return error.kind
	if (error instanceof DOMException && error.name === 'AbortError') return 'timeout'
	if (error instanceof TypeError) return 'network'
	return 'generic'
}

export function resolveApiErrorMessage(error: unknown, messages: ApiErrorMessages, fallback?: string): string {
	if (error instanceof ApiClientError) {
		if (error.kind !== 'generic') {
			return messages[error.kind]
		}
		if (error.message && error.message !== 'Request failed') {
			return error.message
		}
	}

	const kind = classifyThrownError(error)
	if (kind !== 'generic') {
		return messages[kind]
	}

	return fallback ?? messages.generic
}

export type ApiErrorToastFn = (options: { variant: 'error'; title: string }) => void

export function notifyApiError(
	error: unknown,
	options: { toast: ApiErrorToastFn; messages: ApiErrorMessages; fallback?: string }
): string {
	const message = resolveApiErrorMessage(error, options.messages, options.fallback)
	options.toast({ variant: 'error', title: message })
	return message
}

export async function fetchApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	try {
		return await fetch(input, init)
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			throw new ApiClientError('Request timed out', 'TIMEOUT', 'timeout')
		}
		throw new ApiClientError('Network error', 'NETWORK', 'network')
	}
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
	let payload: ApiEnvelope<T>
	try {
		payload = (await response.json()) as ApiEnvelope<T>
	} catch {
		throw new ApiClientError('Request failed', 'PARSE_ERROR', kindFromHttpStatus(response.status), response.status)
	}

	if (!response.ok || !payload.success) {
		const kind = kindFromHttpStatus(response.status)
		throw new ApiClientError(payload.message || 'Request failed', payload.code ?? 'UNKNOWN', kind, response.status)
	}

	return payload.data as T
}
