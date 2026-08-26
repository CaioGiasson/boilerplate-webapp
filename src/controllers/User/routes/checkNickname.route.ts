import { getPrismaClient } from '@/managers/Db.manager'
import CheckNicknameAvailability from '@/useCases/checkNicknameAvailability.usecase'
import { NextRequest, NextResponse } from 'next/server'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'

type Dependencies = {
	checkNicknameAvailabilityUseCase: CheckNicknameAvailability
}

export default async function checkNicknameRoute(
	request: NextRequest,
	dependencies: Dependencies,
	nickname: string
): Promise<NextResponse> {
	return handleRoute(async () => {
		await requireAuth(request, getPrismaClient())
		assertAuthRateLimit(request, nickname ?? '')
		if (!nickname?.trim()) {
			throw new ValidationError('Nickname is required')
		}

		await dependencies.checkNicknameAvailabilityUseCase.run({ nickname })
		return NextResponse.json(ApiPresenter.success('Nickname exists', { exists: true }), {
			status: 200,
		})
	})
}
