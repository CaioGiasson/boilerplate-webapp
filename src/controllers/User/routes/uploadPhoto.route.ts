import { getPrismaClient } from '@/managers/Db.manager'
import { NextRequest, NextResponse } from 'next/server'
import UploadUserPhoto, { PROFILE_PHOTO_MAX_BYTES } from '@/useCases/uploadUserPhoto.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'
import { readJsonBodyCapped, assertImageDataUrlStringNotTooLarge, parseImageDataUrl } from '@/utils/dataUrl'
import { withIdempotencyKey } from '@/utils/idempotency'
import { uploadPhotoBodySchema } from '@/schemas/uploadPhoto.schema'

type Dependencies = {
	uploadUserPhotoUseCase: UploadUserPhoto
}

export default async function uploadPhotoRoute(
	request: NextRequest,
	dependencies: Dependencies,
	userId: string
): Promise<NextResponse> {
	return handleRoute(async () => {
		await requireAuth(request, getPrismaClient(), { userIdParam: userId })

		return withIdempotencyKey(request, `upload-photo:${userId}`, async () => {
			const rawBody = await readJsonBodyCapped(request)
			const parsedBody = uploadPhotoBodySchema.safeParse(rawBody)
			if (!parsedBody.success) {
				throw new ValidationError(parsedBody.error.issues[0]?.message ?? 'Invalid body')
			}
			assertImageDataUrlStringNotTooLarge(parsedBody.data.image)

			const parsed = parseImageDataUrl(parsedBody.data.image, PROFILE_PHOTO_MAX_BYTES)
			const result = await dependencies.uploadUserPhotoUseCase.run({
				userId,
				buffer: parsed.buffer,
				mimeType: parsed.mimeType,
			})

			return NextResponse.json(ApiPresenter.success('Photo updated', { user: result.user }), {
				status: 200,
			})
		})
	})
}
