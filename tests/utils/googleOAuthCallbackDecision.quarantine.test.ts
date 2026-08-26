import { decideGoogleOAuthCallback } from '@/utils/googleOAuthCallbackDecision'
import { buildUser } from '../factories/user.factory'

describe('decideGoogleOAuthCallback — quarentena', () => {
	it('conta com deletedAt → deletion_decision', () => {
		const user = buildUser({ deletedAt: new Date('2026-08-01T00:00:00.000Z') })
		const { decision } = decideGoogleOAuthCallback({
			user,
			google: { emailVerified: true },
			matchedBy: 'email',
		})
		expect(decision.action).toBe('deletion_decision')
	})
})
