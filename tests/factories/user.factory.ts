import type { UserEntity } from '@/repositories/User.repository'

export type UserFactoryOverrides = Partial<UserEntity>

const DEFAULT_DATE = new Date('2026-08-19T00:00:00.000Z')

/**
 * Minimal UserEntity for unit tests. Includes internal fields (passwordHash, tokens)
 * that must never appear in public API responses — use toPublicUser in production code.
 */
export function buildUser(overrides: UserFactoryOverrides = {}): UserEntity {
	return {
		id: 'user-1',
		name: null,
		nickname: 'alice',
		email: 'alice@example.com',
		passwordHash: 'hashed-password',
		photoUrl: null,
		googleLinkedAt: null,
		settings: [],
		acceptedTermsAt: null,
		acceptedPrivacyAt: null,
		termsVersion: null,
		privacyVersion: null,
		dateOfBirth: null,
		ageVerifiedAt: null,
		emailVerifiedAt: null,
		pendingEmail: null,
		emailTokenHash: null,
		emailTokenPurpose: null,
		emailTokenExpiresAt: null,
		lastLoginDevice: null,
		createdAt: DEFAULT_DATE,
		updatedAt: DEFAULT_DATE,
		deletedAt: null,
		sessionsRevokedAt: null,
		...overrides,
	}
}

export function buildOwnerUser(overrides: UserFactoryOverrides = {}): UserEntity {
	return buildUser({
		id: 'owner-1',
		name: 'Ada',
		nickname: 'ada',
		email: 'ada@example.com',
		...overrides,
	})
}
