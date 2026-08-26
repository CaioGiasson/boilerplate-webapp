import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import UserRepository, { type PublicUser } from '@/repositories/User.repository'
import { NotFoundError, ValidationError } from '@/errors'
import { toPublicUserWithSignedPhoto } from '@/utils/publicUserAccess'

type Input = {
	userId: string
}

type Output = {
	user: PublicUser
}

export default class GetUserProfile extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) {
			throw new ValidationError('User id is required')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const userRepository = new UserRepository(injectables.prisma)
		const user = await userRepository.findById(input.userId)

		if (!user) {
			throw new NotFoundError('User not found')
		}

		return { user: await toPublicUserWithSignedPhoto(user) }
	}
}
