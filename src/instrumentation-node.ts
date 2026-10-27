import { validateEnv } from '@/config/env'
import { registerGracefulShutdown, registerShutdownHook } from '@/lib/gracefulShutdown'
import { isJobWorkerEnabled, startJobWorker } from '@/jobs/worker'
import ErrorManager from '@/managers/Error.manager'
import LogManager from '@/managers/Log.manager'

/** Inicialização que só roda no runtime Node (Prisma e handlers de processo não existem na Edge). */
export function registerNodeInstrumentation(): void {
	validateEnv()
	registerGracefulShutdown()
	startJobWorkerOnce()
	// Para ligar Sentry/OpenTelemetry: registerErrorReporter(...) aqui (docs/operators/observability.md).
}

let jobWorkerStarted = false

/** Worker de jobs no mesmo processo (`JOBS_WORKER=off` desliga). Uma vez por processo, mesmo se `register` repetir. */
function startJobWorkerOnce(): void {
	if (jobWorkerStarted || !isJobWorkerEnabled()) return
	jobWorkerStarted = true
	const worker = startJobWorker()
	registerShutdownHook(() => worker.stop())
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
