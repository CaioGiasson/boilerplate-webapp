import LogManager from '@/managers/Log.manager'
import { reportError } from '@/lib/errorReporter'

export default class ErrorManager {
	static log(error: Error, source = 'route'): void {
		LogManager.error(error.message, {
			name: error.name,
			stack: error.stack,
		})

		// Erro de cliente (4xx de AppError) é esperado e não vai para o destino externo; o resto é falha nossa.
		const statusCode = (error as { statusCode?: unknown }).statusCode
		if (typeof statusCode !== 'number' || statusCode >= 500) {
			reportError(error, { source })
		}
	}
}
