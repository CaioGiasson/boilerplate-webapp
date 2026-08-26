import type { SessionClaims, VerifiedSession } from '@/utils/session'

export type SessionClaimsOverrides = Partial<SessionClaims>
export type VerifiedSessionOverrides = Partial<VerifiedSession>

export function buildSessionClaims(overrides: SessionClaimsOverrides = {}): SessionClaims {
	return {
		userId: 'user-1',
		device: '11111111-1111-4111-8111-111111111111',
		...overrides,
	}
}

export function buildVerifiedSession(overrides: VerifiedSessionOverrides = {}): VerifiedSession {
	const claims = buildSessionClaims(overrides)
	return {
		...claims,
		token: 'test.jwt.token',
		jti: 'jti-1',
		iat: 1_700_000_000,
		exp: 1_700_086_400,
		...overrides,
	}
}
