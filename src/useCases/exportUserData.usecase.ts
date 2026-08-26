import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import UserRepository, { toPublicUser } from '@/repositories/User.repository'
import FileRepository from '@/repositories/File.repository'
import { NotFoundError, ValidationError } from '@/errors'

type Input = {
	userId: string
}

type Output = {
	exportedAt: string
	user: ReturnType<typeof toPublicUser>
	files: Array<{
		id: string
		key: string
		url: string
		category: string
		mimeType: string
		sizeBytes: number
		createdAt: string
	}>
}

export default class ExportUserData extends UseCaseMasterPort<Input, Output> {
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

		const fileRepository = new FileRepository(injectables.prisma)
		const files = await fileRepository.listPublishedByOwner(user.id)

		return {
			exportedAt: new Date().toISOString(),
			user: toPublicUser(user),
			files: files.map((file) => ({
				id: file.id,
				key: file.key,
				url: file.url,
				category: file.category,
				mimeType: file.mimeType,
				sizeBytes: file.sizeBytes,
				createdAt: file.createdAt.toISOString(),
			})),
		}
	}
}
