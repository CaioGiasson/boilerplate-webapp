import RecoverOrGenerateExample from '@/useCases/recoverOrGenerateExample.usecase'
import recoverOrGenerateExampleRoute from './routes/recoverOrGenerateExample.route'
import { NextRequest, NextResponse } from 'next/server'

type Dependencies = {
	recoverOrGenerateExampleUseCase: RecoverOrGenerateExample
}

/**
 * Controller da fatia Example.
 * Mantém handlers HTTP finos e despacha para as rotas de ação.
 */
export default class ExampleController {
	static recoverOrGenerate(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return recoverOrGenerateExampleRoute(request, dependencies)
	}
}
