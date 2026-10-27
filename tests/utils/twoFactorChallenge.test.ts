import { SignJWT } from 'jose'
import { UnauthorizedError } from '@/errors'
import { signSessionToken, verifySessionToken } from '@/utils/session'
import { signTwoFactorChallenge, verifyTwoFactorChallenge } from '@/utils/twoFactorChallenge'

const SECRET = 'test-jwt-secret-must-be-32-chars!'
const originalEnv = { ...process.env }

beforeEach(() => {
	process.env.JWT_SECRET = SECRET
	delete process.env.JWT_ISSUER
	delete process.env.JWT_AUDIENCE
})

afterAll(() => {
	process.env = originalEnv
})

describe('desafio do 2FA', () => {
	it('ida e volta devolve o userId', async () => {
		const token = await signTwoFactorChallenge('user-1')

		await expect(verifyTwoFactorChallenge(token)).resolves.toBe('user-1')
	})

	it('o desafio nunca vale como token de sessão (audiência própria)', async () => {
		const challenge = await signTwoFactorChallenge('user-1')

		await expect(verifySessionToken(challenge)).rejects.toBeInstanceOf(UnauthorizedError)
	})

	it('um token de sessão nunca vale como desafio', async () => {
		const { token } = await signSessionToken({ userId: 'user-1', device: 'dev' })

		await expect(verifyTwoFactorChallenge(token)).rejects.toBeInstanceOf(UnauthorizedError)
	})

	it('recusa token adulterado, expirado, de outra finalidade ou assinado com outra chave', async () => {
		const valid = await signTwoFactorChallenge('user-1')
		const key = new TextEncoder().encode(SECRET)
		const sign = (payload: Record<string, unknown>, options: { exp: number; secret?: Uint8Array }) =>
			new SignJWT(payload)
				.setProtectedHeader({ alg: 'HS256' })
				.setIssuer('boilerplate-webapp')
				.setAudience('boilerplate-webapp-web:2fa')
				.setIssuedAt()
				.setExpirationTime(options.exp)
				.sign(options.secret ?? key)
		const future = Math.floor(Date.now() / 1000) + 300

		const bad = [
			`${valid}x`,
			'lixo',
			await sign({ userId: 'user-1', purpose: '2fa-login' }, { exp: Math.floor(Date.now() / 1000) - 10 }),
			await sign({ userId: 'user-1', purpose: 'outra-coisa' }, { exp: future }),
			await sign({ purpose: '2fa-login' }, { exp: future }),
			await sign(
				{ userId: 'user-1', purpose: '2fa-login' },
				{ exp: future, secret: new TextEncoder().encode('outra-chave-com-32-caracteres!!!!') }
			),
		]

		for (const token of bad) {
			await expect(verifyTwoFactorChallenge(token)).rejects.toBeInstanceOf(UnauthorizedError)
		}
	})
})
