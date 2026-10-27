import type { Prisma } from '@prisma/client'
import { RepositoryError } from '@/errors'

export type TwoFactorState = {
	enabledAt: Date | null
	/** Segredo ativo, cifrado. */
	secretEnc: string | null
	/** Segredo do setup em andamento (ainda não confirmado), cifrado. */
	pendingSecretEnc: string | null
	lastStep: number | null
}

/** Ausente e `null` contam igual no Mongo, mas o Prisma só casa um dos dois por vez. */
const NOT_USED = { OR: [{ usedAt: null }, { usedAt: { isSet: false } }] }

/**
 * Estado do 2FA (campos de `User`) e códigos de recuperação. Os segredos entram e saem **cifrados**: quem cifra
 * e decifra é o use case (`twoFactorCrypto`); este repository nunca vê o segredo em claro.
 */
export default class TwoFactorRepository {
	private prisma: Prisma.TransactionClient

	constructor(prisma: Prisma.TransactionClient) {
		this.prisma = prisma
	}

	async findState(userId: string): Promise<TwoFactorState | null> {
		try {
			const user = await this.prisma.user.findFirst({
				where: { id: userId },
				select: {
					twoFactorEnabledAt: true,
					twoFactorSecretEnc: true,
					twoFactorPendingSecretEnc: true,
					twoFactorLastStep: true,
				},
			})
			if (!user) return null
			return {
				enabledAt: user.twoFactorEnabledAt ?? null,
				secretEnc: user.twoFactorSecretEnc ?? null,
				pendingSecretEnc: user.twoFactorPendingSecretEnc ?? null,
				lastStep: user.twoFactorLastStep ?? null,
			}
		} catch (error: unknown) {
			throw new RepositoryError('Failed to read two-factor state', error)
		}
	}

	async savePendingSecret(userId: string, secretEnc: string): Promise<void> {
		try {
			await this.prisma.user.update({ where: { id: userId }, data: { twoFactorPendingSecretEnc: secretEnc } })
		} catch (error: unknown) {
			throw new RepositoryError('Failed to save pending two-factor secret', error)
		}
	}

	/** Promove o segredo pendente a ativo. `step` é o passo do código usado na confirmação (não vale de novo). */
	async activate(userId: string, secretEnc: string, step: number): Promise<void> {
		try {
			await this.prisma.user.update({
				where: { id: userId },
				data: {
					twoFactorSecretEnc: secretEnc,
					twoFactorPendingSecretEnc: null,
					twoFactorEnabledAt: new Date(),
					twoFactorLastStep: step,
				},
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to enable two-factor', error)
		}
	}

	/** Apaga segredo, estado e todos os códigos de recuperação. */
	async disable(userId: string): Promise<void> {
		try {
			await this.prisma.user.update({
				where: { id: userId },
				data: {
					twoFactorEnabledAt: null,
					twoFactorSecretEnc: null,
					twoFactorPendingSecretEnc: null,
					twoFactorLastStep: null,
				},
			})
			await this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } })
		} catch (error: unknown) {
			throw new RepositoryError('Failed to disable two-factor', error)
		}
	}

	/**
	 * Registra `step` como usado **só se for maior que o último**. Atômico (`updateMany` condicional): dois pedidos
	 * simultâneos com o mesmo código não passam os dois. `false` = código já usado (replay).
	 */
	async consumeStep(userId: string, step: number): Promise<boolean> {
		try {
			const { count } = await this.prisma.user.updateMany({
				where: { id: userId, NOT: { twoFactorLastStep: { gte: step } } },
				data: { twoFactorLastStep: step },
			})
			return count === 1
		} catch (error: unknown) {
			throw new RepositoryError('Failed to consume two-factor step', error)
		}
	}

	/** Troca todos os códigos por um conjunto novo (hashes). */
	async replaceRecoveryCodes(userId: string, hashes: string[]): Promise<void> {
		try {
			await this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } })
			await this.prisma.twoFactorRecoveryCode.createMany({
				data: hashes.map((codeHash) => ({ userId, codeHash })),
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to replace recovery codes', error)
		}
	}

	/** Marca o código como usado. Atômico: `false` se não existe, é de outro usuário ou já foi usado. */
	async consumeRecoveryCode(userId: string, codeHash: string): Promise<boolean> {
		try {
			const { count } = await this.prisma.twoFactorRecoveryCode.updateMany({
				where: { userId, codeHash, ...NOT_USED },
				data: { usedAt: new Date() },
			})
			return count === 1
		} catch (error: unknown) {
			throw new RepositoryError('Failed to consume recovery code', error)
		}
	}

	async countRecoveryCodesRemaining(userId: string): Promise<number> {
		try {
			return await this.prisma.twoFactorRecoveryCode.count({ where: { userId, ...NOT_USED } })
		} catch (error: unknown) {
			throw new RepositoryError('Failed to count recovery codes', error)
		}
	}
}
