import Datetime from '@/utils/Datetime'

const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'
const SECRET_PATTERN = /(mongodb(\+srv)?:\/\/|password|secret|token|authorization)/i

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

export default class LogManager {
	static info(message: string, data: unknown = null): void {
		if (LOG_LEVEL === 'silent') {
			return
		}

		const timestamp = Datetime.format(Datetime.now(), 'YYYY-MM-DD HH:mm:ss')
		if (data === null) {
			process.stdout.write(`[INFO] ${timestamp} - ${message}\n`)
			return
		}

		process.stdout.write(`[INFO] ${timestamp} - ${message} ${serializeLogData(data)}\n`)
	}

	static error(message: string, data: unknown = null): void {
		const timestamp = Datetime.format(Datetime.now(), 'YYYY-MM-DD HH:mm:ss')
		if (data === null) {
			process.stderr.write(`[ERROR] ${timestamp} - ${message}\n`)
			return
		}

		process.stderr.write(`[ERROR] ${timestamp} - ${message} ${serializeLogData(data)}\n`)
	}
}
