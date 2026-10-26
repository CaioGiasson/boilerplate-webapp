export async function register() {
	// O import fica dentro do ramo positivo para o bundler descartá-lo no runtime Edge (Prisma não roda lá).
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		const { registerNodeInstrumentation } = await import('./instrumentation-node')
		registerNodeInstrumentation()
	}
}
