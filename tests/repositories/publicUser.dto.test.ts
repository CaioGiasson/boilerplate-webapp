import { toPublicUser, type PublicUser } from '@/repositories/User.repository'
import { buildUser } from '../factories'

const SENSITIVE_USER_KEYS = [
	'passwordHash',
	'googleLinkedAt',
	'emailTokenHash',
	'emailTokenPurpose',
	'emailTokenExpiresAt',
	'dateOfBirth',
	'ageVerifiedAt',
	'deletedAt',
	'sessionsRevokedAt',
	'lastLoginDevice',
	'acceptedTermsAt',
	'acceptedPrivacyAt',
	'termsVersion',
	'privacyVersion',
	'createdAt',
	'updatedAt',
] as const

const ALLOWED_PUBLIC_KEYS: (keyof PublicUser)[] = [
	'id',
	'name',
	'nickname',
	'email',
	'photoUrl',
	'settings',
	'emailVerifiedAt',
	'pendingEmail',
	'emailChallenge',
	'hasPassword',
	'googleLinked',
]

describe('toPublicUser DTO', () => {
	it('omits sensitive and internal UserEntity fields', () => {
		const entity = buildUser({
			passwordHash: 'super-secret-hash',
			emailTokenHash: 'token-hash',
			emailTokenPurpose: 'verify',
			dateOfBirth: new Date('1990-01-15T00:00:00.000Z'),
			deletedAt: null,
		})

		const dto = toPublicUser(entity)
		const keys = Object.keys(dto)

		for (const sensitive of SENSITIVE_USER_KEYS) {
			expect(keys).not.toContain(sensitive)
			expect(dto).not.toHaveProperty(sensitive)
		}
	})

	it('exposes only the PublicUser allowlist', () => {
		const dto = toPublicUser(buildUser())
		expect(Object.keys(dto).sort()).toEqual([...ALLOWED_PUBLIC_KEYS].sort())
		expect(dto.emailChallenge).toBe('none')
	})

	it('maps email challenge purpose to emailChallenge', () => {
		const dto = toPublicUser(buildUser({ emailTokenPurpose: 'verify' }))
		expect(dto.emailChallenge).toBe('verify')
	})

	it('exposes hasPassword and googleLinked without raw internals', () => {
		const withPassword = toPublicUser(buildUser({ passwordHash: 'hash', googleLinkedAt: null }))
		expect(withPassword.hasPassword).toBe(true)
		expect(withPassword.googleLinked).toBe(false)

		const googleOnly = toPublicUser(
			buildUser({ passwordHash: null, googleLinkedAt: new Date('2026-08-26T00:00:00.000Z') })
		)
		expect(googleOnly.hasPassword).toBe(false)
		expect(googleOnly.googleLinked).toBe(true)
	})
})
