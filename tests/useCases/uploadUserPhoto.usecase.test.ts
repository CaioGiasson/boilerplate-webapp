import * as Db from '@/managers/Db.manager'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import UploadUserPhoto from '@/useCases/uploadUserPhoto.usecase'
import UserRepository from '@/repositories/User.repository'
import { NotFoundError } from '@/errors'

const USER_ID = 'user-1'

const storeAvatar = jest.fn(async () => 'https://cdn.example.com/new.jpg')
const orphanByUrl = jest.fn(async () => undefined)
const updateProfile = jest.fn(async (_id: string, data: { photoUrl: string }) => ({
	id: USER_ID,
	name: 'Ada',
	nickname: 'ada',
	email: 'ada@example.com',
	photoUrl: data.photoUrl,
	settings: [],
	emailVerifiedAt: null,
	pendingEmail: null,
	emailChallenge: null,
}))

jest.mock('@/services/Storage/File.manager', () => ({
	__esModule: true,
	default: {
		create: jest.fn(() => ({
			storeAvatar,
			orphanByUrl,
		})),
	},
}))

jest.mock('@/utils/publicUserAccess', () => ({
	toPublicUserWithSignedPhoto: jest.fn(async (user: unknown) => user),
}))

jest.mock('@/repositories/User.repository', () => ({
	__esModule: true,
	default: jest.fn(),
}))

function activeUser(photoUrl: string | null = 'https://cdn.example.com/old.jpg') {
	return {
		id: USER_ID,
		name: 'Ada',
		nickname: 'ada',
		email: 'ada@example.com',
		photoUrl,
		passwordHash: 'hash',
		settings: [],
	}
}

describe('UploadUserPhoto phased storage', () => {
	beforeEach(() => {
		storeAvatar.mockClear()
		orphanByUrl.mockClear()
		updateProfile.mockClear()
		jest.mocked(UserRepository).mockImplementation(
			() =>
				({
					findById: jest.fn(async () => activeUser()),
					updateProfile,
				}) as unknown as UserRepository
		)
		jest.spyOn(Db, 'getPrismaClient').mockReturnValue({ user: { findFirst: jest.fn() } } as never)
	})

	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('orphans new upload when profile update fails', async () => {
		updateProfile.mockRejectedValueOnce(new Error('db down'))
		mockPrismaRuntime({ user: { findFirst: jest.fn() } })

		await expect(
			new UploadUserPhoto().run({
				userId: USER_ID,
				buffer: Buffer.from('x'),
				mimeType: 'image/jpeg',
			})
		).rejects.toThrow('db down')

		expect(storeAvatar).toHaveBeenCalledTimes(1)
		expect(orphanByUrl).toHaveBeenCalledWith('https://cdn.example.com/new.jpg')
	})

	it('rejects unknown user before storage upload', async () => {
		jest.mocked(UserRepository).mockImplementation(
			() =>
				({
					findById: jest.fn(async () => null),
					updateProfile,
				}) as unknown as UserRepository
		)

		mockPrismaRuntime({ user: { findFirst: jest.fn() } })

		await expect(
			new UploadUserPhoto().run({
				userId: USER_ID,
				buffer: Buffer.from('x'),
				mimeType: 'image/jpeg',
			})
		).rejects.toBeInstanceOf(NotFoundError)

		expect(storeAvatar).not.toHaveBeenCalled()
		expect(Db.runInTransaction).not.toHaveBeenCalled()
	})
})
