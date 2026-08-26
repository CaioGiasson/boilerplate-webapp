import { getPrismaClient } from '@/managers/Db.manager'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import UpdateUserProfile from '@/useCases/updateUserProfile.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'

type Dependencies = {
	updateUserProfileUseCase: UpdateUserProfile
}

const bodySchema = z.object({
	name: z.string().nullable().optional(),
	nickname: z.string().min(1).optional(),
	photoUrl: z.null().optional(),
})

export default async function updateProfileRoute(
	request: NextRequest,
	dependencies: Dependencies,
	userId: string
): Promise<NextResponse> {
	return handleRoute(async () => {
		await requireAuth(request, getPrismaClient(), { userIdParam: userId })

		const body = await request.json()
		const parsed = bodySchema.safeParse(body)
		if (!parsed.success) {
			throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
		}

		const result = await dependencies.updateUserProfileUseCase.run({
			userId,
			...parsed.data,
		})

		return NextResponse.json(ApiPresenter.success('Profile updated', { user: result.user }), {
			status: 200,
		})
	})
}
