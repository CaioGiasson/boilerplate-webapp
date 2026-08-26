import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import UserRepository, { isUniqueConstraintError, type PublicUser } from '@/repositories/User.repository'
import { ConflictError, NotFoundError, ValidationError } from '@/errors'
import { toPublicUserWithSignedPhoto } from '@/utils/publicUserAccess'
import { normalizeNickname } from '@/utils/nickname'

type Input = {
	userId: string
	name?: string | null
	nickname?: string
	photoUrl?: null
}

type Output = {
	user: PublicUser
}

export default class UpdateUserProfile extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) {
			throw new ValidationError('User id is required')
		}
		if (input.nickname !== undefined) {
			normalizeNickname(input.nickname)
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const userRepository = new UserRepository(injectables.prisma)
		const current = await userRepository.findById(input.userId)

		if (!current) {
			throw new NotFoundError('User not found')
		}

		const nickname = input.nickname !== undefined ? normalizeNickname(input.nickname) : undefined

		if (nickname !== undefined && nickname !== current.nickname) {
			const taken = await userRepository.findByNickname(nickname)
			if (taken && taken.id !== current.id) {
				throw new ConflictError('Nickname already in use')
			}
		}

		try {
			const user = await userRepository.updateProfile(input.userId, {
				name: input.name,
				nickname,
				photoUrl: input.photoUrl,
			})
			return { user: await toPublicUserWithSignedPhoto(user) }
		} catch (error: unknown) {
			if (isUniqueConstraintError(error)) {
				throw new ConflictError('Nickname already in use')
			}
			throw error
		}
	}
}
