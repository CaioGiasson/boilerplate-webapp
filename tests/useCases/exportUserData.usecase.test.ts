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

		const aiLog = {
			id: 'log-1',
			userId: 'user-1',
			contextId: null,
			query: 'summarize',
			model: 'gpt-5.4-mini',
			prompt: 'texto',
			response: 'resumo',
			tokenCost: 42,
			createdAt: new Date('2026-08-20T00:00:00.000Z'),
		}

		const notification = {
			id: 'n1',
			userId: 'user-1',
			type: 'TEST',
			title: 'Título',
			text: 'Texto',
			link: '/notifications',
			readAt: null,
			createdAt: new Date('2026-08-21T00:00:00.000Z'),
		}
		const pushSubscription = {
			id: 'sub-1',
			userId: 'user-1',
			endpoint: 'https://push.example.com/secret-endpoint',
			p256dh: 'secret-p256dh',
			auth: 'secret-auth',
			createdAt: new Date('2026-08-22T00:00:00.000Z'),
		}

		const auditEvent = {
			id: 'a1',
			action: 'user.password_changed',
			actorType: 'user',
			actorId: 'user-1',
			targetUserId: 'user-1',
			metadata: null,
			ip: '203.0.113.7',
			requestId: 'req-12345678',
			createdAt: new Date('2026-08-23T00:00:00.000Z'),
		}
		const adminActed = { ...auditEvent, id: 'a2', actorType: 'admin', actorId: 'admin-9', ip: null }

		mockPrismaRuntime({
			user: {
				findFirst: jest.fn(async () => user),
			},
			auditEvent: {
				findMany: jest.fn(async () => [auditEvent, adminActed]),
			},
			file: {
				findMany: jest.fn(async () => [file]),
			},
			aiLog: {
				findMany: jest.fn(async () => [aiLog]),
			},
			notification: {
				findMany: jest.fn(async () => [notification]),
			},
			pushSubscription: {
				findMany: jest.fn(async () => [pushSubscription]),
			},
		})

		const result = await new ExportUserData().run({ userId: 'user-1' })

		expect(result.user).toEqual({
			id: 'user-1',
			name: 'Ada',
			nickname: 'ada',
			email: 'ada@example.com',
			photoUrl: null,
			photoThumbnailUrl: null,
			settings: [],
			emailVerifiedAt: null,
			pendingEmail: null,
			emailChallenge: 'none',
			hasPassword: true,
			googleLinked: false,
			role: 'USER',
		})
		expect(result.files).toEqual([
			{
				id: 'file-1',
				key: 'avatars/user-1/photo.jpg',
				url: 'https://cdn.example.com/photo.jpg',
				thumbnailUrl: null,
				category: 'avatar',
				mimeType: 'image/jpeg',
				sizeBytes: 1024,
				createdAt: '2026-08-19T00:00:00.000Z',
			},
		])
		expect(result.auditEvents).toEqual([
			{
				id: 'a1',
				action: 'user.password_changed',
				asActor: true,
				asTarget: true,
				ip: '203.0.113.7',
				createdAt: '2026-08-23T00:00:00.000Z',
			},
			{
				id: 'a2',
				action: 'user.password_changed',
				asActor: false,
				asTarget: true,
				ip: null,
				createdAt: '2026-08-23T00:00:00.000Z',
			},
		])
		expect(JSON.stringify(result.auditEvents)).not.toContain('admin-9')
		expect(result.notifications).toEqual([
			{
				id: 'n1',
				type: 'TEST',
				title: 'Título',
				text: 'Texto',
				link: '/notifications',
				read: false,
				createdAt: '2026-08-21T00:00:00.000Z',
			},
		])
		expect(result.pushSubscriptions).toEqual([{ id: 'sub-1', createdAt: '2026-08-22T00:00:00.000Z' }])
		// Endpoint e chaves do aparelho nunca saem na exportação.
		expect(JSON.stringify(result)).not.toMatch(/secret-endpoint|secret-p256dh|secret-auth/)
		expect(result.aiLogs).toEqual([
			{
				id: 'log-1',
				query: 'summarize',
				model: 'gpt-5.4-mini',
				prompt: 'texto',
				response: 'resumo',
				tokenCost: 42,
				createdAt: '2026-08-20T00:00:00.000Z',
			},
		])
	})

	it('falha se o usuário não existe', async () => {
		mockPrismaRuntime({
			user: { findFirst: jest.fn(async () => null) },
			file: { findMany: jest.fn() },
			aiLog: { findMany: jest.fn() },
			notification: { findMany: jest.fn() },
			pushSubscription: { findMany: jest.fn() },
		})

		await expect(new ExportUserData().run({ userId: 'missing' })).rejects.toThrow(NotFoundError)
	})
})
