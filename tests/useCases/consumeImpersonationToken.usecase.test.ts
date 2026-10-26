import ConsumeImpersonationToken from '@/useCases/consumeImpersonationToken.usecase'
import { UnauthorizedError, ValidationError } from '@/errors'
import { signImpersonationToken, signSessionToken } from '@/utils/session'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'

const STRONG_SECRET = 'test-jwt-secret-must-be-32-chars!'

type Row = Record<string, unknown>

function userRow(overrides: Row): Row {
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

function mockDb(options: { users: Record<string, Row>; revoked?: boolean }) {
	mockPrismaRuntime({
		user: {
			findFirst: jest.fn(async (args: { where: { AND: Array<{ id?: string }> } }) => {
				const id = args.where.AND.find((clause) => clause.id)?.id
				return id ? (options.users[id] ?? null) : null
			}),
		},
		sessionEvent: {
			deleteMany: jest.fn(async () => ({ count: 0 })),
			findFirst: jest.fn(async () => (options.revoked ? { id: 'event-1' } : null)),
		},
	})
}

const USERS = {
	'admin-1': userRow({ id: 'admin-1', nickname: 'root', role: 'ADMIN' }),
	'target-1': userRow({ id: 'target-1' }),
}

describe('ConsumeImpersonationToken', () => {
	const originalSecret = process.env.JWT_SECRET

	beforeEach(() => {
		process.env.JWT_SECRET = STRONG_SECRET
	})

	afterAll(() => {
		process.env.JWT_SECRET = originalSecret
	})

	it('aceita um token de impersonamento válido e devolve o mesmo JWT e a expiração', async () => {
		mockDb({ users: USERS })
		const signed = await signImpersonationToken({ userId: 'target-1', adminId: 'admin-1' })

		const result = await new ConsumeImpersonationToken().run({ token: signed.token })

		expect(result).toEqual({ token: signed.token, exp: signed.exp })
	})

	it('recusa token de sessão comum', async () => {
		mockDb({ users: USERS })
		const normal = await signSessionToken({ userId: 'target-1', device: 'web' })

		await expect(new ConsumeImpersonationToken().run({ token: normal.token })).rejects.toBeInstanceOf(
			UnauthorizedError
		)
	})

	it('recusa token adulterado ou lixo', async () => {
		mockDb({ users: USERS })
		const signed = await signImpersonationToken({ userId: 'target-1', adminId: 'admin-1' })

		await expect(new ConsumeImpersonationToken().run({ token: `${signed.token}x` })).rejects.toBeInstanceOf(
			UnauthorizedError
		)
		await expect(new ConsumeImpersonationToken().run({ token: 'not-a-jwt' })).rejects.toBeInstanceOf(
			UnauthorizedError
		)
	})

	it('recusa quando o jti foi revogado', async () => {
		mockDb({ users: USERS, revoked: true })
		const signed = await signImpersonationToken({ userId: 'target-1', adminId: 'admin-1' })

		await expect(new ConsumeImpersonationToken().run({ token: signed.token })).rejects.toBeInstanceOf(
			UnauthorizedError
		)
	})

	it('recusa quando o alvo trocou a senha depois da emissão (sessionsRevokedAt)', async () => {
		const signed = await signImpersonationToken({ userId: 'target-1', adminId: 'admin-1' })
		mockDb({
			users: {
				...USERS,
				'target-1': userRow({ id: 'target-1', sessionsRevokedAt: new Date(Date.now() + 60_000) }),
			},
		})

		await expect(new ConsumeImpersonationToken().run({ token: signed.token })).rejects.toBeInstanceOf(
			UnauthorizedError
		)
	})

	it('recusa quando o alvo não existe mais', async () => {
		mockDb({ users: { 'admin-1': USERS['admin-1'] } })
		const signed = await signImpersonationToken({ userId: 'target-1', adminId: 'admin-1' })

		await expect(new ConsumeImpersonationToken().run({ token: signed.token })).rejects.toBeInstanceOf(
			UnauthorizedError
		)
	})

	it('recusa quando quem emitiu deixou de ser admin', async () => {
		const signed = await signImpersonationToken({ userId: 'target-1', adminId: 'admin-1' })
		mockDb({ users: { ...USERS, 'admin-1': userRow({ id: 'admin-1', nickname: 'root', role: 'USER' }) } })

		await expect(new ConsumeImpersonationToken().run({ token: signed.token })).rejects.toBeInstanceOf(
			UnauthorizedError
		)
	})

	it('exige token', async () => {
		mockDb({ users: USERS })

		await expect(new ConsumeImpersonationToken().run({ token: '  ' })).rejects.toBeInstanceOf(ValidationError)
	})
})
