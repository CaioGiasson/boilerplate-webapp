import ExportUserData from '@/useCases/exportUserData.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { Visibility } from '@/constants/visibility'
import { NotFoundError } from '@/errors'

describe('ExportUserData', () => {
	it('exporta perfil público e imagens do titular', async () => {
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
		const image = {
			id: 'img-1',
			ownerId: 'user-1',
			url: 'https://cdn.example.com/a.jpg',
			title: 'Glass',
			description: null,
			tags: ['x'],
			fileId: 'file-1',
			visibility: Visibility.PUBLIC,
			createdAt: new Date('2026-08-19T00:00:00.000Z'),
			updatedAt: new Date('2026-08-19T00:00:00.000Z'),
			deletedAt: null,
		}

		mockPrismaRuntime({
			user: {
				findFirst: jest.fn(async () => user),
			},
			image: {
				findMany: jest.fn(async () => [image]),
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
		expect(result.images).toEqual([
			{
				id: 'img-1',
				url: 'https://cdn.example.com/a.jpg',
				title: 'Glass',
				description: null,
				tags: ['x'],
				visibility: Visibility.PUBLIC,
				createdAt: '2026-08-19T00:00:00.000Z',
			},
		])
	})

	it('falha se o usuário não existe', async () => {
		mockPrismaRuntime({
			user: { findFirst: jest.fn(async () => null) },
			image: { findMany: jest.fn() },
		})

		await expect(new ExportUserData().run({ userId: 'missing' })).rejects.toBeInstanceOf(NotFoundError)
	})
})
