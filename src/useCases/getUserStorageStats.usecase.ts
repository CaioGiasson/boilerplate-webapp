import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import FileRepository from '@/repositories/File.repository'
import { ValidationError } from '@/errors'

type Input = {
	userId: string
}

type Output = {
	fileCount: number
	usedBytes: number
}

export default class GetUserStorageStats extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) {
			throw new ValidationError('User id is required')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const fileRepository = new FileRepository(injectables.prisma)

		const [fileCount, usedBytes] = await Promise.all([
			fileRepository.countPublishedByOwner(input.userId),
			fileRepository.sumPublishedBytesByOwner(input.userId),
		])

		return { fileCount, usedBytes }
	}
}
