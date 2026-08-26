import { getPrismaClient } from '@/managers/Db.manager'
import { NextRequest, NextResponse } from 'next/server'
import SetUserSetting from '@/useCases/setUserSetting.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'
import { setSettingBodySchema } from '@/schemas/userSetting.schema'

type Dependencies = {
	setUserSettingUseCase: SetUserSetting
}

export default async function setSettingRoute(
	request: NextRequest,
	dependencies: Dependencies,
	userId: string
): Promise<NextResponse> {
	return handleRoute(async () => {
		await requireAuth(request, getPrismaClient(), { userIdParam: userId })

		const body = await request.json()
		const parsed = setSettingBodySchema.safeParse(body)
		if (!parsed.success) {
			throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
		}

		const result = await dependencies.setUserSettingUseCase.run({
			userId,
			key: parsed.data.key,
			value: parsed.data.value,
		})

		return NextResponse.json(
			ApiPresenter.success('Setting updated', {
				user: result.user,
				settings: result.settings,
			}),
			{ status: 200 }
		)
	})
}
