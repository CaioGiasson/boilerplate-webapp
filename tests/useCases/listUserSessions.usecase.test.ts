import ListUserSessions from '@/useCases/listUserSessions.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { hashSessionJti } from '@/utils/session'

jest.mock('@/repositories/ActiveSession.repository', () => {
	return jest.fn().mockImplementation(() => ({
		listByUserId: jest.fn(),
	}))
})

import ActiveSessionRepository from '@/repositories/ActiveSession.repository'

describe('ListUserSessions', () => {
	mockPrismaRuntime({})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('lista só sessões do usuário e marca a atual via jti', async () => {
		const currentJti = 'current-jti'
		const listByUserId = jest.fn().mockResolvedValue([
			{
				id: 's1',
				userId: 'user-1',
				jtiHash: hashSessionJti(currentJti),
				device: 'device-a',
				createdAt: new Date('2026-01-01T00:00:00.000Z'),
				exp: new Date('2026-01-08T00:00:00.000Z'),
			},
			{
				id: 's2',
				userId: 'user-1',
				jtiHash: hashSessionJti('other-jti'),
				device: 'device-b',
				createdAt: new Date('2026-01-02T00:00:00.000Z'),
				exp: new Date('2026-01-09T00:00:00.000Z'),
			},
		])
		jest.mocked(ActiveSessionRepository).mockImplementationOnce(
			() =>
				({
					listByUserId,
				}) as never
		)

		const useCase = new ListUserSessions()
		const result = await useCase.run({ userId: 'user-1', currentJti })

		expect(listByUserId).toHaveBeenCalledWith('user-1')
		expect(result.sessions).toEqual([
			expect.objectContaining({ id: 's1', device: 'device-a', current: true }),
			expect.objectContaining({ id: 's2', device: 'device-b', current: false }),
		])
	})
})
