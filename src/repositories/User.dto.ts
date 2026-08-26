import SettingsManager, { type SettingEntry } from '@/managers/Settings.manager'

export type UserEntity = {
	id: string
	name: string | null
	nickname: string
	email: string
	passwordHash: string | null
	photoUrl: string | null
	googleLinkedAt: Date | null
	settings: SettingEntry[]
	acceptedTermsAt: Date | null
	acceptedPrivacyAt: Date | null
	termsVersion: string | null
	privacyVersion: string | null
	dateOfBirth: Date | null
	ageVerifiedAt: Date | null
	emailVerifiedAt: Date | null
	pendingEmail: string | null
	emailTokenHash: string | null
	emailTokenPurpose: string | null
	emailTokenExpiresAt: Date | null
	lastLoginDevice: string | null
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
	sessionsRevokedAt: Date | null
	hideFromGlobalMosaic: boolean
}

export type PublicUser = Pick<
	UserEntity,
	'id' | 'name' | 'nickname' | 'email' | 'photoUrl' | 'settings' | 'emailVerifiedAt' | 'pendingEmail'
> & {
	emailChallenge: 'none' | 'verify' | 'change_old' | 'change_new'
	hasPassword: boolean
	googleLinked: boolean
}

export function mapUser(user: {
	id: string
	name: string | null
	nickname: string
	email: string
	passwordHash: string | null
	photoUrl: string | null
	googleLinkedAt?: Date | null
	settings: unknown
	acceptedTermsAt: Date | null
	acceptedPrivacyAt: Date | null
	termsVersion: string | null
	privacyVersion: string | null
	dateOfBirth?: Date | null
	ageVerifiedAt?: Date | null
	emailVerifiedAt?: Date | null
	pendingEmail?: string | null
	emailTokenHash?: string | null
	emailTokenPurpose?: string | null
	emailTokenExpiresAt?: Date | null
	lastLoginDevice?: string | null
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
	sessionsRevokedAt: Date | null
	hideFromGlobalMosaic?: boolean
}): UserEntity {
	const settings = SettingsManager.list({
		settings: Array.isArray(user.settings) ? user.settings : [],
	})

	return {
		id: user.id,
		name: user.name,
		nickname: user.nickname,
		email: user.email,
		passwordHash: user.passwordHash ?? null,
		photoUrl: user.photoUrl,
		googleLinkedAt: user.googleLinkedAt ?? null,
		settings,
		acceptedTermsAt: user.acceptedTermsAt ?? null,
		acceptedPrivacyAt: user.acceptedPrivacyAt ?? null,
		termsVersion: user.termsVersion ?? null,
		privacyVersion: user.privacyVersion ?? null,
		dateOfBirth: user.dateOfBirth ?? null,
		ageVerifiedAt: user.ageVerifiedAt ?? null,
		emailVerifiedAt: user.emailVerifiedAt ?? null,
		pendingEmail: user.pendingEmail ?? null,
		emailTokenHash: user.emailTokenHash ?? null,
		emailTokenPurpose: user.emailTokenPurpose ?? null,
		emailTokenExpiresAt: user.emailTokenExpiresAt ?? null,
		lastLoginDevice: user.lastLoginDevice ?? null,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
		deletedAt: user.deletedAt,
		sessionsRevokedAt: user.sessionsRevokedAt ?? null,
		hideFromGlobalMosaic: user.hideFromGlobalMosaic ?? false,
	}
}

export function toPublicUser(user: UserEntity): PublicUser {
	const purpose = user.emailTokenPurpose
	const challenge = purpose === 'verify' || purpose === 'change_old' || purpose === 'change_new' ? purpose : 'none'

	return {
		id: user.id,
		name: user.name,
		nickname: user.nickname,
		email: user.email,
		photoUrl: user.photoUrl,
		settings: user.settings,
		emailVerifiedAt: user.emailVerifiedAt,
		pendingEmail: user.pendingEmail,
		emailChallenge: challenge,
		hasPassword: Boolean(user.passwordHash),
		googleLinked: Boolean(user.googleLinkedAt),
	}
}
