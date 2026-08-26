import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import UserRepository from '@/repositories/User.repository'
import { NotFoundError } from '@/errors'
import { normalizeNickname } from '@/utils/nickname'

type Input = {
	nickname: string
}

type Output = {
	exists: true
}

export default class CheckNicknameAvailability extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		normalizeNickname(input.nickname ?? '')
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const nickname = normalizeNickname(input.nickname)
		const userRepository = new UserRepository(injectables.prisma)
		const user = await userRepository.findByNickname(nickname)

		if (!user) {
			throw new NotFoundError('Nickname not found')
		}

		return { exists: true }
	}
}
