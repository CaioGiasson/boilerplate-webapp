import Datetime from '@/utils/Datetime'
import { isProductionEnv } from '@/utils/isProductionEnv'
import { getRequestId } from '@/lib/requestContext'

const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'
const SECRET_PATTERN = /(mongodb(\+srv)?:\/\/|password|secret|token|authorization)/i

type LogLevel = 'INFO' | 'WARN' | 'ERROR'

function redactString(value: string): string {
	if (SECRET_PATTERN.test(value)) {
		return '[redacted]'
	}
	return value.length > 500 ? `${value.slice(0, 500)}…` : value
}

function serializeLogData(data: unknown): string {
	if (data instanceof Error) {
		const payload: Record<string, string> = {
			name: data.name,
			message: redactString(data.message),
		}
		if (process.env.NODE_ENV !== 'production' && data.stack) {
			payload.stack = redactString(data.stack)
		}
		return JSON.stringify(payload)
	}

	if (data && typeof data === 'object') {
		const record = data as Record<string, unknown>
		const name = typeof record.name === 'string' ? record.name : undefined
		const message = typeof record.message === 'string' ? record.message : undefined
		if (name || message) {
			return JSON.stringify({
				name: name ?? 'Error',
				message: redactString(message ?? ''),
			})
		}
	}

	try {
		return JSON.stringify(data, (_key, value) => {
			if (typeof value === 'string') {
				return redactString(value)
			}
			return value
		})
	} catch {
		return '"[unserializable]"'
	}
}

/** `LOG_FORMAT=json|text`. Sem valor: JSON em produção (uma linha por evento, fácil de indexar), texto no resto. */
function isJsonFormat(): boolean {
	const configured = process.env.LOG_FORMAT?.trim().toLowerCase()
	if (configured === 'json' || configured === 'text') {
		return configured === 'json'
	}
	return isProductionEnv()
}

function formatLine(level: LogLevel, message: string, data: unknown): string {
	const requestId = getRequestId()

	if (isJsonFormat()) {
		const parts = [
			`"level":"${level.toLowerCase()}"`,
			`"time":${JSON.stringify(new Date().toISOString())}`,
			...(requestId ? [`"requestId":${JSON.stringify(requestId)}`] : []),
			`"message":${JSON.stringify(message)}`,
		]
		if (data !== null) {
			parts.push(`"data":${serializeLogData(data)}`)
		}
		return `{${parts.join(',')}}\n`
	}

	const timestamp = Datetime.format(Datetime.now(), 'YYYY-MM-DD HH:mm:ss')
	const prefix = `[${level}] ${timestamp} - ${message}${requestId ? ` requestId=${requestId}` : ''}`
	return data === null ? `${prefix}\n` : `${prefix} ${serializeLogData(data)}\n`
}

export default class LogManager {
	static info(message: string, data: unknown = null): void {
		if (LOG_LEVEL === 'silent') {
			return
		}
		process.stdout.write(formatLine('INFO', message, data))
	}

	static warn(message: string, data: unknown = null): void {
		if (LOG_LEVEL === 'silent') {
			return
		}
		process.stderr.write(formatLine('WARN', message, data))
	}

	static error(message: string, data: unknown = null): void {
		process.stderr.write(formatLine('ERROR', message, data))
	}
}
