import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import RecoverOrGenerateExample from '@/useCases/recoverOrGenerateExample.usecase'
import GeneralPresenter from '@/utils/General.presenter'
import ApiPresenter from '@/utils/Api.presenter'
import ErrorManager from '@/managers/Error.manager'
import { AppError, NotFoundError, ValidationError } from '@/errors'
import { isExampleEndpointEnabled } from '@/utils/exampleEndpoint'

type Dependencies = {
	recoverOrGenerateExampleUseCase: RecoverOrGenerateExample
}

const querySchema = z.object({
	identifier: z.string().min(1, 'Identifier is required'),
})

/**
 * Recupera um Example do cache ou gera um novo via ExampleService.
 * Nunca propaga o Request/Response para camadas internas.
 */
export default async function recoverOrGenerateExampleRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	try {
		if (!isExampleEndpointEnabled()) {
			const notFound = new NotFoundError('Not found')
			return NextResponse.json(ApiPresenter.error(notFound), { status: notFound.statusCode })
		}

		const identifierParam = request.nextUrl.searchParams.get('identifier') ?? ''
		const parsed = querySchema.safeParse({
			identifier: GeneralPresenter.numberAsString(identifierParam),
		})

		if (!parsed.success) {
			const message = parsed.error.issues[0]?.message ?? 'Invalid query parameters'
			const validationError = new ValidationError(message)
			return NextResponse.json(ApiPresenter.error(validationError), {
				status: validationError.statusCode,
			})
		}

		const result = await dependencies.recoverOrGenerateExampleUseCase.run({
			identifier: parsed.data.identifier,
		})

		return NextResponse.json(ApiPresenter.success('Resource found', { example: result }), { status: 200 })
	} catch (error: unknown) {
		if (error instanceof AppError) {
			ErrorManager.log(error)
			return NextResponse.json(ApiPresenter.error(error), { status: error.statusCode })
		}

		ErrorManager.log(error as Error)
		return NextResponse.json(ApiPresenter.unknownError(), { status: 500 })
	}
}
