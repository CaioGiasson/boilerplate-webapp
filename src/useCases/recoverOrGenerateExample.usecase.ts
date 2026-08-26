import ExampleRepository from '@/repositories/Example.repository'
import ExampleService from '@/services/Example/Example.service'
import type { ExampleEntity } from '@/services/Example/Example.ports'
import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { NotFoundError, ValidationError } from '@/errors'

type Input = {
	identifier: string
}

type Output = ExampleEntity

export default class RecoverOrGenerateExample extends UseCaseMasterPort<Input, Output> {
	private exampleService: ExampleService

	constructor(exampleService: ExampleService) {
		super()
		this.exampleService = exampleService
	}

	async validate(input: Input): Promise<void> {
		if (!input.identifier) {
			throw new ValidationError('Identifier is required')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const { identifier } = input
		const { prisma } = injectables
		const exampleRepository = new ExampleRepository(prisma)

		const cached = await exampleRepository.recoverFromCache(identifier)
		if (cached !== null) {
			return cached
		}

		const externalData = await this.exampleService.generate()
		const random = externalData.value
		const date = new Date(externalData.created_at)
		const generatedIdentifier = date.getTime().toString()

		const created = await exampleRepository.create(generatedIdentifier, random)
		if (created === null) {
			throw new NotFoundError('Example could not be created')
		}

		return created
	}
}
