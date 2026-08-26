import { SessionEventType } from '@prisma/client'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import RevokeUserSession from '@/useCases/revokeUserSession.usecase'
import RevokeOtherUserSessions from '@/useCases/revokeOtherUserSessions.usecase'
import { ForbiddenError, NotFoundError } from '@/errors'
import { hashSessionJti } from '@/utils/session'

jest.mock('@/repositories/ActiveSession.repository', () => {
	return jest.fn().mockImplementation(() => ({
		findByIdForUser: jest.fn(),
		deleteById: jest.fn(),
		listByUserId: jest.fn(),
		deleteAllForUserExceptJti: jest.fn(),
	}))
})

jest.mock('@/repositories/SessionEvent.repository', () => {
	return jest.fn().mockImplementation(() => ({
		createFromJtiHash: jest.fn(),
	}))
})

import ActiveSessionRepository from '@/repositories/ActiveSession.repository'
import SessionEventRepository from '@/repositories/SessionEvent.repository'

describe('RevokeUserSession', () => {
	mockPrismaRuntime({})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('revoga sessão de outro dispositivo', async () => {
		const findByIdForUser = jest.fn().mockResolvedValue({
			id: 's2',
			userId: 'user-1',
			jtiHash: hashSessionJti('other-jti'),
			device: 'device-b',
			createdAt: new Date('2026-01-02T00:00:00.000Z'),
			exp: new Date('2026-01-09T00:00:00.000Z'),
		})
		const deleteById = jest.fn().mockResolvedValue(undefined)
		const createFromJtiHash = jest.fn().mockResolvedValue(undefined)

		jest.mocked(ActiveSessionRepository).mockImplementationOnce(
			() =>
				({
					findByIdForUser,
					deleteById,
				}) as never
		)
		jest.mocked(SessionEventRepository).mockImplementationOnce(
			() =>
				({
					createFromJtiHash,
				}) as never
		)

		const useCase = new RevokeUserSession()
		await useCase.run({
			userId: 'user-1',
			sessionId: 's2',
			currentJti: 'current-jti',
		})

		expect(createFromJtiHash).toHaveBeenCalledWith({
			jtiHash: hashSessionJti('other-jti'),
			event: SessionEventType.REVOKE,
			device: 'device-b',
			exp: expect.any(Number),
		})
		expect(deleteById).toHaveBeenCalledWith('s2')
	})

	it('não revoga a sessão atual', async () => {
		const currentJti = 'current-jti'
		jest.mocked(ActiveSessionRepository).mockImplementationOnce(
			() =>
				({
					findByIdForUser: jest.fn().mockResolvedValue({
						id: 's1',
						userId: 'user-1',
						jtiHash: hashSessionJti(currentJti),
						device: 'device-a',
						createdAt: new Date(),
						exp: new Date(),
					}),
					deleteById: jest.fn(),
				}) as never
		)
		jest.mocked(SessionEventRepository).mockImplementationOnce(
			() =>
				({
					createFromJtiHash: jest.fn(),
				}) as never
		)

		const useCase = new RevokeUserSession()
		await expect(
			useCase.run({
				userId: 'user-1',
				sessionId: 's1',
				currentJti,
			})
		).rejects.toBeInstanceOf(ForbiddenError)
	})

	it('retorna 404 para sessão de outro usuário', async () => {
		jest.mocked(ActiveSessionRepository).mockImplementationOnce(
			() =>
				({
					findByIdForUser: jest.fn().mockResolvedValue(null),
					deleteById: jest.fn(),
				}) as never
		)
		jest.mocked(SessionEventRepository).mockImplementationOnce(
			() =>
				({
					createFromJtiHash: jest.fn(),
				}) as never
		)

		const useCase = new RevokeUserSession()
		await expect(
			useCase.run({
				userId: 'user-1',
				sessionId: 'foreign-id',
				currentJti: 'current-jti',
			})
		).rejects.toBeInstanceOf(NotFoundError)
	})
})

describe('RevokeOtherUserSessions', () => {
	mockPrismaRuntime({})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('revoga todas exceto a atual', async () => {
		const currentJti = 'current-jti'
		const listByUserId = jest.fn().mockResolvedValue([
			{
				id: 's1',
				userId: 'user-1',
				jtiHash: hashSessionJti(currentJti),
				device: 'device-a',
				createdAt: new Date(),
				exp: new Date('2026-01-08T00:00:00.000Z'),
			},
			{
				id: 's2',
				userId: 'user-1',
				jtiHash: hashSessionJti('other-jti'),
				device: 'device-b',
				createdAt: new Date(),
				exp: new Date('2026-01-09T00:00:00.000Z'),
			},
		])
		const deleteAllForUserExceptJti = jest.fn().mockResolvedValue(undefined)
		const createFromJtiHash = jest.fn().mockResolvedValue(undefined)

		jest.mocked(ActiveSessionRepository).mockImplementationOnce(
			() =>
				({
					listByUserId,
					deleteAllForUserExceptJti,
				}) as never
		)
		jest.mocked(SessionEventRepository).mockImplementationOnce(
			() =>
				({
					createFromJtiHash,
				}) as never
		)

		const useCase = new RevokeOtherUserSessions()
		const result = await useCase.run({ userId: 'user-1', currentJti })

		expect(createFromJtiHash).toHaveBeenCalledTimes(1)
		expect(createFromJtiHash).toHaveBeenCalledWith(
			expect.objectContaining({
				jtiHash: hashSessionJti('other-jti'),
				event: SessionEventType.REVOKE,
			})
		)
		expect(deleteAllForUserExceptJti).toHaveBeenCalledWith('user-1', currentJti)
		expect(result.revokedCount).toBe(1)
	})
})
