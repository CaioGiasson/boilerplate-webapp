import * as Db from '@/managers/Db.manager'
import CreateUserImage from '@/useCases/createUserImage.usecase'
import { ForbiddenError, ValidationError } from '@/errors'
import { Visibility } from '@/constants/visibility'
import { buildOwnerUser } from '../factories'
import type { UserEntity } from '@/repositories/User.repository'

const OWNER_ID = 'owner-1'

function createCommander(user: UserEntity | null) {
	const create = jest.fn()
	const rootClient = {
		user: { findFirst: jest.fn(async () => user) },
	}
	jest.spyOn(Db, 'getPrismaClient').mockReturnValue(rootClient as never)
	jest.spyOn(Db, 'runInTransaction').mockImplementation(async (callback) =>
		callback({
			user: { findFirst: jest.fn(async () => user) },
			image: { create },
		})
	)
	jest.spyOn(Db, 'runWithoutTransaction').mockImplementation(async (callback) => callback(rootClient))
	return { create }
}

const validInput = {
	ownerId: OWNER_ID,
	buffer: Buffer.from('fake-image'),
	mimeType: 'image/jpeg',
}

describe('CreateUserImage visibility', () => {
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('rejeita SECRET quando showSecretImages é false', async () => {
		const { create } = createCommander(buildOwnerUser(false))
		const useCase = new CreateUserImage()
		await expect(useCase.run({ ...validInput, visibility: Visibility.SECRET })).rejects.toBeInstanceOf(
			ForbiddenError
		)
		expect(create).not.toHaveBeenCalled()
	})

	it('rejeita PROTECTED na criação', async () => {
		const { create } = createCommander(buildOwnerUser(true))
		const useCase = new CreateUserImage()
		await expect(useCase.run({ ...validInput, visibility: Visibility.PROTECTED })).rejects.toBeInstanceOf(
			ValidationError
		)
		expect(create).not.toHaveBeenCalled()
	})
})

describe('CreateUserImage metadata limits', () => {
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('rejeita título acima do teto sem persistir', async () => {
		const { create } = createCommander(buildOwnerUser(true))
		const useCase = new CreateUserImage()
		await expect(useCase.run({ ...validInput, title: 'a'.repeat(201) })).rejects.toBeInstanceOf(ValidationError)
		expect(create).not.toHaveBeenCalled()
	})

	it('rejeita tags acima do teto sem persistir', async () => {
		const { create } = createCommander(buildOwnerUser(true))
		const useCase = new CreateUserImage()
		const tags = Array.from({ length: 21 }, (_, index) => `tag-${index}`)
		await expect(useCase.run({ ...validInput, tags })).rejects.toBeInstanceOf(ValidationError)
		expect(create).not.toHaveBeenCalled()
	})
})
