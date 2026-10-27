import { validateEnv } from '@/config/env'
import { registerGracefulShutdown } from '@/lib/gracefulShutdown'
import ErrorManager from '@/managers/Error.manager'
import LogManager from '@/managers/Log.manager'

/** Inicialização que só roda no runtime Node (Prisma e handlers de processo não existem na Edge). */
export function registerNodeInstrumentation(): void {
	validateEnv()
	registerGracefulShutdown()
	// Para ligar Sentry/OpenTelemetry: registerErrorReporter(...) aqui (docs/operators/observability.md).
}

export function reportRequestError(
	error: unknown,
	request: { path: string; method: string },
	context: { routeType: string }
): void {
	LogManager.error('Unhandled request error', {
		method: request.method,
		path: request.path.split('?')[0],
		routeType: context.routeType,
	})
	ErrorManager.log(error instanceof Error ? error : new Error(String(error)), `request:${context.routeType}`)
}
