import CreateImpersonationToken from '@/useCases/createImpersonationToken.usecase'
import { ForbiddenError, NotFoundError, ValidationError } from '@/errors'
import { isImpersonationSession, verifySessionToken } from '@/utils/session'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'

const STRONG_SECRET = 'test-jwt-secret-must-be-32-chars!'

function userRow(overrides: Record<string, unknown>) {
	return {
		id: 'user-1',
		name: null,
		nickname: 'alice',
		email: 'alice@example.com',
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
		role: 'USER',
		...overrides,
	}
}

function mockUsers(rows: Record<string, ReturnType<typeof userRow>>) {
	const findFirst = jest.fn(async (args: { where: { AND: Array<{ id?: string }> } }) => {
		const id = args.where.AND.find((clause) => clause.id)?.id
		return id ? (rows[id] ?? null) : null
	})
	mockPrismaRuntime({ user: { findFirst } })
	return findFirst
}

describe('CreateImpersonationToken', () => {
	const originalSecret = process.env.JWT_SECRET

	beforeEach(() => {
		process.env.JWT_SECRET = STRONG_SECRET
	})

	afterAll(() => {
		process.env.JWT_SECRET = originalSecret
	})

	it('admin emite token de impersonamento do alvo', async () => {
		mockUsers({
			'admin-1': userRow({ id: 'admin-1', nickname: 'root', role: 'ADMIN' }),
			'target-1': userRow({ id: 'target-1' }),
		})

		const result = await new CreateImpersonationToken().run({ callerId: 'admin-1', targetUserId: 'target-1' })

		const session = await verifySessionToken(result.token)
		expect(isImpersonationSession(session)).toBe(true)
		expect(session.userId).toBe('target-1')
		expect(session.impersonatedBy).toBe('admin-1')
		expect(new Date(result.expiresAt).getTime()).toBe(session.exp * 1000)
	})

	it('recusa quem não é admin', async () => {
		mockUsers({ 'user-1': userRow({ id: 'user-1' }), 'target-1': userRow({ id: 'target-1' }) })

		await expect(
			new CreateImpersonationToken().run({ callerId: 'user-1', targetUserId: 'target-1' })
		).rejects.toBeInstanceOf(ForbiddenError)
	})

	it('trata conta sem o campo role como USER', async () => {
		mockUsers({ 'legacy-1': userRow({ id: 'legacy-1', role: undefined }), 'target-1': userRow({ id: 'target-1' }) })

		await expect(
			new CreateImpersonationToken().run({ callerId: 'legacy-1', targetUserId: 'target-1' })
		).rejects.toBeInstanceOf(ForbiddenError)
	})

	it('recusa alvo inexistente', async () => {
		mockUsers({ 'admin-1': userRow({ id: 'admin-1', role: 'ADMIN' }) })

		await expect(
			new CreateImpersonationToken().run({ callerId: 'admin-1', targetUserId: 'missing' })
		).rejects.toBeInstanceOf(NotFoundError)
	})

	it('recusa impersonar outro admin', async () => {
		mockUsers({
			'admin-1': userRow({ id: 'admin-1', role: 'ADMIN' }),
			'admin-2': userRow({ id: 'admin-2', nickname: 'root2', role: 'ADMIN' }),
		})

		await expect(
			new CreateImpersonationToken().run({ callerId: 'admin-1', targetUserId: 'admin-2' })
		).rejects.toBeInstanceOf(ForbiddenError)
	})

	it('recusa impersonar a si mesmo e ids vazios', async () => {
		mockUsers({})
		const useCase = new CreateImpersonationToken()

		await expect(useCase.run({ callerId: 'a', targetUserId: 'a' })).rejects.toBeInstanceOf(ValidationError)
		await expect(useCase.run({ callerId: ' ', targetUserId: 'b' })).rejects.toBeInstanceOf(ValidationError)
		await expect(useCase.run({ callerId: 'a', targetUserId: ' ' })).rejects.toBeInstanceOf(ValidationError)
	})
})
