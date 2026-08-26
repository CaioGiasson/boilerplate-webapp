import { Prisma } from '@prisma/client'
import { NotFoundError, RepositoryError } from '@/errors'
import type { SettingEntry } from '@/managers/Settings.manager'
import { canonicalizeNickname } from '@/utils/nickname'
import { mapUser, type UserEntity } from '@/repositories/User.dto'
import { activeWhere, isUniqueConstraintError } from '@/repositories/User.helpers'

export type { UserEntity, PublicUser } from '@/repositories/User.dto'
export { toPublicUser } from '@/repositories/User.dto'
export { isUniqueConstraintError } from '@/repositories/User.helpers'

export default class UserRepository {
	private prisma: Prisma.TransactionClient

	constructor(prisma: Prisma.TransactionClient) {
		this.prisma = prisma
	}

	async create(input: {
		nickname: string
		email: string
		passwordHash?: string | null
		name?: string | null
		photoUrl?: string | null
		googleLinkedAt?: Date | null
		emailVerifiedAt?: Date | null
		settings?: SettingEntry[]
		acceptedTermsAt?: Date | null
		acceptedPrivacyAt?: Date | null
		termsVersion?: string | null
		privacyVersion?: string | null
		dateOfBirth?: Date | null
		ageVerifiedAt?: Date | null
	}): Promise<UserEntity> {
		try {
			const settings = (input.settings ?? []).map((entry) => ({
				key: entry.key,
				value: entry.value as Prisma.InputJsonValue,
			}))

			const user = await this.prisma.user.create({
				data: {
					nickname: input.nickname,
					email: input.email.toLowerCase(),
					passwordHash: input.passwordHash ?? null,
					name: input.name ?? null,
					photoUrl: input.photoUrl ?? null,
					googleLinkedAt: input.googleLinkedAt ?? null,
					emailVerifiedAt: input.emailVerifiedAt ?? null,
					deletedAt: null,
					settings,
					acceptedTermsAt: input.acceptedTermsAt ?? null,
					acceptedPrivacyAt: input.acceptedPrivacyAt ?? null,
					termsVersion: input.termsVersion ?? null,
					privacyVersion: input.privacyVersion ?? null,
					dateOfBirth: input.dateOfBirth ?? null,
					ageVerifiedAt: input.ageVerifiedAt ?? null,
				},
			})
			return mapUser(user)
		} catch (error: unknown) {
			if (isUniqueConstraintError(error)) {
				throw error
			}
			throw new RepositoryError('Failed to create user', error)
		}
	}

	async findByEmail(email: string): Promise<UserEntity | null> {
		try {
			const user = await this.prisma.user.findFirst({
				where: activeWhere({ email: email.toLowerCase() }),
			})
			return user ? mapUser(user) : null
		} catch (error: unknown) {
			throw new RepositoryError('Failed to find user by email', error)
		}
	}

	async findByPendingEmail(email: string): Promise<UserEntity | null> {
		try {
			const user = await this.prisma.user.findFirst({
				where: activeWhere({ pendingEmail: email.toLowerCase() }),
			})
			return user ? mapUser(user) : null
		} catch (error: unknown) {
			throw new RepositoryError('Failed to find user by pending email', error)
		}
	}

	async findByNickname(nickname: string): Promise<UserEntity | null> {
		try {
			const user = await this.prisma.user.findFirst({
				where: activeWhere({ nickname: canonicalizeNickname(nickname) }),
			})
			return user ? mapUser(user) : null
		} catch (error: unknown) {
			throw new RepositoryError('Failed to find user by nickname', error)
		}
	}

	async findById(id: string): Promise<UserEntity | null> {
		try {
			const user = await this.prisma.user.findFirst({
				where: activeWhere({ id }),
			})
			return user ? mapUser(user) : null
		} catch (error: unknown) {
			throw new RepositoryError('Failed to find user by id', error)
		}
	}

	/** Includes soft-deleted / quarantined users (login restore + decision auth). */
	async findByIdIncludingDeleted(id: string): Promise<UserEntity | null> {
		try {
			const user = await this.prisma.user.findFirst({ where: { id } })
			return user ? mapUser(user) : null
		} catch (error: unknown) {
			throw new RepositoryError('Failed to find user by id', error)
		}
	}

	async findByEmailIncludingDeleted(email: string): Promise<UserEntity | null> {
		try {
			const user = await this.prisma.user.findFirst({
				where: { email: email.toLowerCase() },
			})
			return user ? mapUser(user) : null
		} catch (error: unknown) {
			throw new RepositoryError('Failed to find user by email', error)
		}
	}

	async findByNicknameIncludingDeleted(nickname: string): Promise<UserEntity | null> {
		try {
			const user = await this.prisma.user.findFirst({
				where: { nickname: canonicalizeNickname(nickname) },
			})
			return user ? mapUser(user) : null
		} catch (error: unknown) {
			throw new RepositoryError('Failed to find user by nickname', error)
		}
	}

	/**
	 * Garante que o id pertence a um usuário ativo antes de mutações.
	 * `update` do Prisma (Mongo) só aceita where único e ignora soft-delete.
	 */
	private async requireActiveUser(id: string): Promise<UserEntity> {
		const user = await this.findById(id)
		if (!user) {
			throw new NotFoundError('User not found')
		}
		return user
	}

	async updateProfile(
		id: string,
		data: {
			name?: string | null
			nickname?: string
			settings?: SettingEntry[]
			photoUrl?: string | null
		}
	): Promise<UserEntity> {
		try {
			await this.requireActiveUser(id)

			const user = await this.prisma.user.update({
				where: { id },
				data: {
					...(data.name !== undefined ? { name: data.name } : {}),
					...(data.nickname !== undefined ? { nickname: data.nickname } : {}),
					...(data.settings !== undefined
						? {
								settings: data.settings.map((entry) => ({
									key: entry.key,
									value: entry.value as Prisma.InputJsonValue,
								})),
							}
						: {}),
					...(data.photoUrl !== undefined ? { photoUrl: data.photoUrl } : {}),
				},
			})
			return mapUser(user)
		} catch (error: unknown) {
			if (error instanceof NotFoundError) {
				throw error
			}
			if (isUniqueConstraintError(error)) {
				throw error
			}
			throw new RepositoryError('Failed to update user profile', error)
		}
	}

	async updatePassword(id: string, passwordHash: string): Promise<void> {
		try {
			await this.requireActiveUser(id)

			await this.prisma.user.update({
				where: { id },
				data: { passwordHash, sessionsRevokedAt: new Date() },
			})
		} catch (error: unknown) {
			if (error instanceof NotFoundError) {
				throw error
			}
			throw new RepositoryError('Failed to update user password', error)
		}
	}

	async updateLastLoginDevice(id: string, device: string): Promise<void> {
		try {
			await this.requireActiveUser(id)
			await this.prisma.user.update({
				where: { id },
				data: { lastLoginDevice: device },
			})
		} catch (error: unknown) {
			if (error instanceof NotFoundError) {
				throw error
			}
			throw new RepositoryError('Failed to update last login device', error)
		}
	}

	/**
	 * Atualiza a senha, revoga sessões e consome o challenge de e-mail numa única escrita
	 * (fluxo forgot/reset — evita token reutilizável se o clear falhar depois).
	 */
	async updatePasswordClearingEmailChallenge(id: string, passwordHash: string): Promise<void> {
		try {
			await this.requireActiveUser(id)

			await this.prisma.user.update({
				where: { id },
				data: {
					passwordHash,
					sessionsRevokedAt: new Date(),
					emailTokenHash: null,
					emailTokenPurpose: null,
					emailTokenExpiresAt: null,
				},
			})
		} catch (error: unknown) {
			if (error instanceof NotFoundError) {
				throw error
			}
			throw new RepositoryError('Failed to update user password', error)
		}
	}

	async setEmailChallenge(
		id: string,
		data: {
			tokenHash: string
			purpose: string
			expiresAt: Date
			pendingEmail?: string | null
		}
	): Promise<UserEntity> {
		try {
			await this.requireActiveUser(id)
			const user = await this.prisma.user.update({
				where: { id },
				data: {
					emailTokenHash: data.tokenHash,
					emailTokenPurpose: data.purpose,
					emailTokenExpiresAt: data.expiresAt,
					...(data.pendingEmail !== undefined ? { pendingEmail: data.pendingEmail } : {}),
				},
			})
			return mapUser(user)
		} catch (error: unknown) {
			if (error instanceof NotFoundError) {
				throw error
			}
			throw new RepositoryError('Failed to set email challenge', error)
		}
	}

	async clearEmailChallenge(id: string, extra?: { pendingEmail?: null }): Promise<UserEntity> {
		try {
			await this.requireActiveUser(id)
			const user = await this.prisma.user.update({
				where: { id },
				data: {
					emailTokenHash: null,
					emailTokenPurpose: null,
					emailTokenExpiresAt: null,
					...(extra?.pendingEmail === null ? { pendingEmail: null } : {}),
				},
			})
			return mapUser(user)
		} catch (error: unknown) {
			if (error instanceof NotFoundError) {
				throw error
			}
			throw new RepositoryError('Failed to clear email challenge', error)
		}
	}

	async markEmailVerified(id: string): Promise<UserEntity> {
		try {
			await this.requireActiveUser(id)
			const user = await this.prisma.user.update({
				where: { id },
				data: {
					emailVerifiedAt: new Date(),
					emailTokenHash: null,
					emailTokenPurpose: null,
					emailTokenExpiresAt: null,
				},
			})
			return mapUser(user)
		} catch (error: unknown) {
			if (error instanceof NotFoundError) {
				throw error
			}
			throw new RepositoryError('Failed to mark email verified', error)
		}
	}

	async clearEmailVerified(id: string): Promise<UserEntity> {
		try {
			await this.requireActiveUser(id)
			const user = await this.prisma.user.update({
				where: { id },
				data: { emailVerifiedAt: null },
			})
			return mapUser(user)
		} catch (error: unknown) {
			if (error instanceof NotFoundError) {
				throw error
			}
			throw new RepositoryError('Failed to clear email verified', error)
		}
	}

	/** Clears pending email change tokens and pendingEmail. */
	async clearEmailChangeChallenge(id: string): Promise<UserEntity> {
		return this.clearEmailChallenge(id, { pendingEmail: null })
	}

	async linkGoogle(id: string): Promise<UserEntity> {
		try {
			await this.requireActiveUser(id)
			const user = await this.prisma.user.update({
				where: { id },
				data: { googleLinkedAt: new Date() },
			})
			return mapUser(user)
		} catch (error: unknown) {
			if (error instanceof NotFoundError) {
				throw error
			}
			throw new RepositoryError('Failed to link Google account', error)
		}
	}

	async unlinkGoogle(id: string): Promise<UserEntity> {
		try {
			await this.requireActiveUser(id)
			const user = await this.prisma.user.update({
				where: { id },
				data: { googleLinkedAt: null },
			})
			return mapUser(user)
		} catch (error: unknown) {
			if (error instanceof NotFoundError) {
				throw error
			}
			throw new RepositoryError('Failed to unlink Google account', error)
		}
	}

	async applyPendingEmail(id: string, newEmail: string): Promise<UserEntity> {
		try {
			await this.requireActiveUser(id)
			const user = await this.prisma.user.update({
				where: { id },
				data: {
					email: newEmail.toLowerCase(),
					emailVerifiedAt: new Date(),
					pendingEmail: null,
					emailTokenHash: null,
					emailTokenPurpose: null,
					emailTokenExpiresAt: null,
					/** Email change breaks Google match-by-email — always clear link. */
					googleLinkedAt: null,
				},
			})
			return mapUser(user)
		} catch (error: unknown) {
			if (error instanceof NotFoundError) {
				throw error
			}
			if (isUniqueConstraintError(error)) {
				throw error
			}
			throw new RepositoryError('Failed to apply pending email', error)
		}
	}

	async findByEmailTokenHash(tokenHash: string): Promise<UserEntity | null> {
		try {
			const user = await this.prisma.user.findFirst({
				where: activeWhere({ emailTokenHash: tokenHash }),
			})
			return user ? mapUser(user) : null
		} catch (error: unknown) {
			throw new RepositoryError('Failed to find user by email token', error)
		}
	}

	/**
	 * Quarentena reversível: marca `deletedAt` (primeira solicitação) e revoga sessões.
	 * Não anonimiza nem altera senha/Google.
	 */
	async softDeleteQuarantine(id: string): Promise<UserEntity> {
		try {
			await this.requireActiveUser(id)
			const now = new Date()
			const user = await this.prisma.user.update({
				where: { id },
				data: {
					deletedAt: now,
					sessionsRevokedAt: now,
				},
			})
			return mapUser(user)
		} catch (error: unknown) {
			if (error instanceof NotFoundError) {
				throw error
			}
			throw new RepositoryError('Failed to quarantine user', error)
		}
	}

	/** Cancela quarentena (CANCELAR exclusão). */
	async clearDeletedAt(id: string): Promise<UserEntity> {
		try {
			const existing = await this.findByIdIncludingDeleted(id)
			if (!existing?.deletedAt) {
				throw new NotFoundError('User not found')
			}
			const user = await this.prisma.user.update({
				where: { id },
				data: { deletedAt: null },
			})
			return mapUser(user)
		} catch (error: unknown) {
			if (error instanceof NotFoundError) {
				throw error
			}
			throw new RepositoryError('Failed to restore user from quarantine', error)
		}
	}

	/**
	 * Soft-delete com anonimização (PRIV-M06): libera unique de email/nickname.
	 * Usado no hard delete após quarentena (cron) — aceita usuário já soft-deleted.
	 */
	async anonymizeAndSoftDelete(id: string, passwordHash: string): Promise<UserEntity> {
		try {
			const existing = await this.findByIdIncludingDeleted(id)
			if (!existing) {
				throw new NotFoundError('User not found')
			}
			const now = new Date()
			const user = await this.prisma.user.update({
				where: { id },
				data: {
					email: `deleted_${id}@invalid.local`,
					nickname: `deleted_${id}`,
					name: null,
					photoUrl: null,
					passwordHash,
					googleLinkedAt: null,
					settings: [],
					dateOfBirth: null,
					ageVerifiedAt: null,
					lastLoginDevice: null,
					deletedAt: existing.deletedAt ?? now,
					sessionsRevokedAt: now,
				},
			})
			return mapUser(user)
		} catch (error: unknown) {
			if (error instanceof NotFoundError) {
				throw error
			}
			if (isUniqueConstraintError(error)) {
				throw error
			}
			throw new RepositoryError('Failed to anonymize and delete user', error)
		}
	}

	/** Owners em quarentena ou hard-deleted (qualquer `deletedAt` set) — ocultar conteúdo. */
	async listIdsWithDeletedAt(): Promise<string[]> {
		try {
			const users = await this.prisma.user.findMany({
				where: { deletedAt: { not: null } },
				select: { id: true },
			})
			return users.map((user) => user.id)
		} catch (error: unknown) {
			throw new RepositoryError('Failed to list quarantined users', error)
		}
	}

	/** Contas em quarentena elegíveis a hard purge (`deletedAt` anterior ao cutoff). */
	async listIdsDeletedBefore(cutoff: Date): Promise<string[]> {
		try {
			const users = await this.prisma.user.findMany({
				where: { deletedAt: { not: null, lt: cutoff } },
				select: { id: true },
				orderBy: { deletedAt: 'asc' },
			})
			return users.map((user) => user.id)
		} catch (error: unknown) {
			throw new RepositoryError('Failed to list users for hard purge', error)
		}
	}
}
