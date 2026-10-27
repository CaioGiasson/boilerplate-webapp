import { getRequestId } from '@/lib/requestContext'

export type ErrorReportContext = {
	requestId?: string
	/** Onde o erro foi capturado, ex.: `route` ou `render`. */
	source: string
	extra?: Record<string, string>
}

export type ErrorReporter = (error: Error, context: ErrorReportContext) => void

let reporter: ErrorReporter | undefined

/**
 * Liga um destino externo de erros (Sentry, OpenTelemetry, webhook…). Chame uma vez no boot, em
 * `registerNodeInstrumentation`. Sem registro, nada é enviado: o boilerplate não traz SDK de terceiros.
 * Ver `docs/operators/observability.md`.
 */
export function registerErrorReporter(next: ErrorReporter | undefined): void {
	reporter = next
}

/** Nunca lança: falha do reporter não pode derrubar a resposta nem esconder o erro original. */
export function reportError(
	error: Error,
	context: Omit<ErrorReportContext, 'requestId'> & { requestId?: string }
): void {
	if (!reporter) {
		return
	}
	try {
		reporter(error, { ...context, requestId: context.requestId ?? getRequestId() })
	} catch {
		// Silencioso de propósito: o erro original já foi logado.
	}
}
