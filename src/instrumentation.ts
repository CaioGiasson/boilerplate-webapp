import type { Instrumentation } from 'next'

export async function register() {
	// O import fica dentro do ramo positivo para o bundler descartá-lo no runtime Edge (Prisma não roda lá).
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		const { registerNodeInstrumentation } = await import('./instrumentation-node')
		registerNodeInstrumentation()
	}
}

/** Erros não tratados de renderização/servidor que não passaram por `handleRoute`. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		const { reportRequestError } = await import('./instrumentation-node')
		reportRequestError(error, request, context)
	}
}
