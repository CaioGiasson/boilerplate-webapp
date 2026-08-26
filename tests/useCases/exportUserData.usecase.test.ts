import ExportUserData from '@/useCases/exportUserData.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { NotFoundError } from '@/errors'

describe('ExportUserData', () => {
	it('exporta perfil público e arquivos do titular', async () => {
		const user = {
			id: 'user-1',
			name: 'Ada',
			nickname: 'ada',
			email: 'ada@example.com',
			passwordHash: 'hash',
			photoUrl: null,
			settings: [],
			acceptedTermsAt: null,
			acceptedPrivacyAt: null,
			termsVersion: null,
			privacyVersion: null,
			createdAt: new Date('2026-08-19T00:00:00.000Z'),
			updatedAt: new Date('2026-08-19T00:00:00.000Z'),
			deletedAt: null,
			sessionsRevokedAt: null,
		}
		const file = {
			id: 'file-1',
			key: 'avatars/user-1/photo.jpg',
			url: 'https://cdn.example.com/photo.jpg',
			category: 'avatar',
			mimeType: 'image/jpeg',
			sizeBytes: 1024,
			createdAt: new Date('2026-08-19T00:00:00.000Z'),
		}

		mockPrismaRuntime({
			user: {
				findFirst: jest.fn(async () => user),
			},
			file: {
				findMany: jest.fn(async () => [file]),
			},
		})

		const result = await new ExportUserData().run({ userId: 'user-1' })

		expect(result.user).toEqual({
			id: 'user-1',
			name: 'Ada',
			nickname: 'ada',
			email: 'ada@example.com',
			photoUrl: null,
			settings: [],
			emailVerifiedAt: null,
			pendingEmail: null,
			emailChallenge: 'none',
			hasPassword: true,
			googleLinked: false,
		})
		expect(result.files).toEqual([
			{
				id: 'file-1',
				key: 'avatars/user-1/photo.jpg',
				url: 'https://cdn.example.com/photo.jpg',
				category: 'avatar',
				mimeType: 'image/jpeg',
				sizeBytes: 1024,
				createdAt: '2026-08-19T00:00:00.000Z',
			},
		])
	})

	it('falha se o usuário não existe', async () => {
		mockPrismaRuntime({
			user: { findFirst: jest.fn(async () => null) },
			file: { findMany: jest.fn() },
		})

		await expect(new ExportUserData().run({ userId: 'missing' })).rejects.toThrow(NotFoundError)
	})
})
