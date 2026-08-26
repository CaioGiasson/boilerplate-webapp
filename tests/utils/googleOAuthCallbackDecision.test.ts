import { buildUser } from '../factories'
import {
	appendCallbackFlags,
	decideGoogleOAuthCallback,
	hasPendingEmailChange,
} from '@/utils/googleOAuthCallbackDecision'

describe('decideGoogleOAuthCallback', () => {
	it('sem usuário → pending_register', () => {
		const { decision, flags } = decideGoogleOAuthCallback({
			user: null,
			google: { emailVerified: true },
		})
		expect(decision).toEqual({ action: 'pending_register' })
		expect(flags).toEqual({ emailChangeCancelled: false, googleEmailUnverified: false })
	})

	it('usuário com googleLinkedAt → session sem link', () => {
		const user = buildUser({ googleLinkedAt: new Date() })
		const { decision } = decideGoogleOAuthCallback({
			user,
			google: { emailVerified: true },
		})
		expect(decision).toEqual({
			action: 'session',
			linkGoogle: false,
			markVerified: true,
			clearVerified: false,
		})
	})

	it('usuário com senha sem Google → pending_link', () => {
		const user = buildUser({ passwordHash: 'hash', googleLinkedAt: null })
		const { decision } = decideGoogleOAuthCallback({
			user,
			google: { emailVerified: true },
		})
		expect(decision).toEqual({ action: 'pending_link' })
	})

	it('usuário sem senha → session com linkGoogle', () => {
		const user = buildUser({ passwordHash: null, googleLinkedAt: null })
		const { decision } = decideGoogleOAuthCallback({
			user,
			google: { emailVerified: false },
		})
		expect(decision).toEqual({
			action: 'session',
			linkGoogle: true,
			markVerified: false,
			clearVerified: false,
		})
	})

	it('cancela troca de e-mail pendente', () => {
		const user = buildUser({
			googleLinkedAt: new Date(),
			pendingEmail: 'new@example.com',
			emailTokenPurpose: 'change_new',
		})
		const { flags } = decideGoogleOAuthCallback({
			user,
			google: { emailVerified: true },
			matchedBy: 'email',
		})
		expect(flags.emailChangeCancelled).toBe(true)
		expect(hasPendingEmailChange(user)).toBe(true)
	})

	it('match só via pendingEmail + googleLinkedAt → pending_link (sem session)', () => {
		const user = buildUser({
			googleLinkedAt: new Date(),
			passwordHash: 'hash',
			pendingEmail: 'attacker@gmail.com',
			emailTokenPurpose: 'change_new',
		})
		const { decision, flags } = decideGoogleOAuthCallback({
			user,
			google: { emailVerified: true },
			matchedBy: 'pendingEmail',
		})
		expect(decision).toEqual({ action: 'pending_link' })
		expect(flags.emailChangeCancelled).toBe(true)
	})

	it('marca googleEmailUnverified e clearVerified quando Google não verificou', () => {
		const user = buildUser({
			googleLinkedAt: new Date(),
			emailVerifiedAt: new Date(),
		})
		const { decision, flags } = decideGoogleOAuthCallback({
			user,
			google: { emailVerified: false },
		})
		expect(flags.googleEmailUnverified).toBe(true)
		expect(decision).toMatchObject({ action: 'session', clearVerified: true, markVerified: false })
	})

	it('appendCallbackFlags adiciona query params', () => {
		expect(appendCallbackFlags('/perfil', { emailChangeCancelled: true, googleEmailUnverified: true })).toBe(
			'/perfil?emailChangeCancelled=1&googleEmailUnverified=1'
		)
		expect(appendCallbackFlags('/', { emailChangeCancelled: false, googleEmailUnverified: false })).toBe('/')
	})
})
