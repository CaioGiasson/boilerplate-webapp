import { NextRequest, NextResponse } from 'next/server'
import ExampleController from '@/controllers/Example/Example.controller'
import { getDependencies } from '@/container/dependencies'
import { validateEnv } from '@/config/env'
import { NotFoundError } from '@/errors'
import ApiPresenter from '@/utils/Api.presenter'
import { isExampleEndpointEnabled } from '@/utils/exampleEndpoint'

export async function GET(request: NextRequest) {
	if (!isExampleEndpointEnabled()) {
		return NextResponse.json(ApiPresenter.error(new NotFoundError('Not found')), { status: 404 })
	}

	validateEnv()
	const dependencies = getDependencies()
	return ExampleController.recoverOrGenerate(request, dependencies)
}
