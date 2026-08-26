import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import UserRepository, { type PublicUser } from '@/repositories/User.repository'
import FileManager from '@/services/Storage/File.manager'
import { NotFoundError, ValidationError } from '@/errors'
import { toPublicUserWithSignedPhoto } from '@/utils/publicUserAccess'
import { getRootPrismaClient, runStorageUploadThenTransaction } from '@/utils/workUnitPhases'

export const PROFILE_PHOTO_MAX_BYTES = 3 * 1024 * 1024
export const PROFILE_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

type Input = {
	userId: string
	buffer: Buffer
	mimeType: string
}

type Output = {
	user: PublicUser
}

export default class UploadUserPhoto extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) {
			throw new ValidationError('User id is required')
		}
		if (!PROFILE_PHOTO_MIME_TYPES.includes(input.mimeType as (typeof PROFILE_PHOTO_MIME_TYPES)[number])) {
			throw new ValidationError('Unsupported image type')
		}
		if (!input.buffer?.byteLength) {
			throw new ValidationError('Image is required')
		}
		if (input.buffer.byteLength > PROFILE_PHOTO_MAX_BYTES) {
			throw new ValidationError('Image must be at most 3MB')
		}
	}

	async execute(input: Input, _injectables: Injectables): Promise<Output> {
		const root = getRootPrismaClient()
		const userRepository = new UserRepository(root)
		const user = await userRepository.findById(input.userId)

		if (!user) {
			throw new NotFoundError('User not found')
		}

		const previousUrl = user.photoUrl

		return runStorageUploadThenTransaction({
			storageUpload: async (storageRoot) => {
				const fileManager = FileManager.create(storageRoot)
				const photoUrl = await fileManager.storeAvatar({
					buffer: input.buffer,
					mimeType: input.mimeType,
					ownerId: user.id,
				})
				return { photoUrl, previousUrl }
			},
			transactionPhase: async (injectables, stored) => {
				const txUserRepository = new UserRepository(injectables.prisma)
				const updated = await txUserRepository.updateProfile(user.id, { photoUrl: stored.photoUrl })
				return { user: await toPublicUserWithSignedPhoto(updated) }
			},
			compensateStorage: async (storageRoot, stored) => {
				const fileManager = FileManager.create(storageRoot)
				await fileManager.orphanByUrl(stored.photoUrl)
			},
			afterTransaction: async (storageRoot, stored) => {
				if (stored.previousUrl) {
					const fileManager = FileManager.create(storageRoot)
					await fileManager.orphanByUrl(stored.previousUrl)
				}
			},
		})
	}
}
