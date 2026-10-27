import { ServiceUnavailableError, UnauthorizedError, ValidationError } from '@/errors'
import LogManager from '@/managers/Log.manager'
import { getTwoFactorKey } from '@/config/env'
import type TwoFactorRepository from '@/repositories/TwoFactor.repository'
import type { TwoFactorState } from '@/repositories/TwoFactor.repository'
import { hashRecoveryCode, looksLikeRecoveryCode, verifyTotp } from '@/utils/totp'
import { decryptSecret } from '@/utils/twoFactorCrypto'

export const INVALID_TWO_FACTOR_MESSAGE = 'Invalid two-factor code'

export type SecondFactorInput = {
	/** Código de 6 dígitos do app autenticador. */
	code?: string
	/** Código de recuperação (`XXXXX-XXXXX`). */
	recoveryCode?: string
}

export type SecondFactorMethod = 'totp' | 'recovery'

/** Chave de cifra; sem ela o 2FA não funciona (nem para validar): 503, nunca "passa direto". */
export function requireTwoFactorKey(): Buffer {
	const key = getTwoFactorKey()
	if (!key) throw new ServiceUnavailableError('Two-factor authentication is unavailable')
	return key
}

/** Segredo ativo em claro. `null` se o 2FA não está ativo ou o segredo não decifra (chave trocada/dado corrompido). */
export function readActiveSecret(state: TwoFactorState | null): string | null {
	if (!state?.enabledAt || !state.secretEnc) return null
	return decryptSecret(state.secretEnc, requireTwoFactorKey())
}

/**
 * Confere o segundo fator e o **consome**: o passo TOTP não vale de novo e o código de recuperação é de uso único,
 * ambos de forma atômica no banco. Falha com `UnauthorizedError` genérico (não diz qual parte errou).
 */
export async function verifyAndConsumeSecondFactor(
	repository: TwoFactorRepository,
	userId: string,
	state: TwoFactorState | null,
	input: SecondFactorInput
): Promise<SecondFactorMethod> {
	const hasCode = Boolean(input.code?.trim())
	const hasRecovery = Boolean(input.recoveryCode?.trim())
	if (hasCode === hasRecovery) {
		throw new ValidationError('Send either a code or a recovery code')
	}

	const secret = readActiveSecret(state)
	if (secret === null) {
		LogManager.error('Two-factor secret is missing or cannot be decrypted', { userId })
		throw new UnauthorizedError(INVALID_TWO_FACTOR_MESSAGE)
	}

	if (hasCode) {
		const step = verifyTotp(secret, input.code!.trim())
		if (step === null || !(await repository.consumeStep(userId, step))) {
			throw new UnauthorizedError(INVALID_TWO_FACTOR_MESSAGE)
		}
		return 'totp'
	}

	const recoveryCode = input.recoveryCode!
	if (
		!looksLikeRecoveryCode(recoveryCode) ||
		!(await repository.consumeRecoveryCode(userId, hashRecoveryCode(recoveryCode)))
	) {
		throw new UnauthorizedError(INVALID_TWO_FACTOR_MESSAGE)
	}
	return 'recovery'
}
