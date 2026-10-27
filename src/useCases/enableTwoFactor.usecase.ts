import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { ConflictError, NotFoundError, ValidationError } from '@/errors'
import AuditEventRepository from '@/repositories/AuditEvent.repository'
import TwoFactorRepository from '@/repositories/TwoFactor.repository'
import { requireTwoFactorKey } from '@/useCases/shared/secondFactor'
import { generateRecoveryCodes, hashRecoveryCode, verifyTotp } from '@/utils/totp'
import { decryptSecret } from '@/utils/twoFactorCrypto'

type Input = {
	userId: string
	/** Código de 6 dígitos que o app autenticador mostra agora. */
	code: string
}

type Output = {
	/** Mostrados **uma única vez**: só o hash fica no banco. */
	recoveryCodes: string[]
}

/** Passo 2 do setup: confirma o app com um código, ativa o 2FA e gera os códigos de recuperação. */
export default class EnableTwoFactor extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
		if (!input.code?.trim()) throw new ValidationError('Code is required')
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const key = requireTwoFactorKey()
		const repository = new TwoFactorRepository(injectables.prisma)
		const state = await repository.findState(input.userId)
		if (!state) throw new NotFoundError('User not found')
		if (state.enabledAt) throw new ConflictError('Two-factor is already enabled')
		if (!state.pendingSecretEnc) throw new ValidationError('Start the two-factor setup first', 'SETUP_REQUIRED')

		const secret = decryptSecret(state.pendingSecretEnc, key)
		const step = secret ? verifyTotp(secret, input.code.trim()) : null
		if (step === null) throw new ValidationError('Invalid two-factor code', 'INVALID_TWO_FACTOR_CODE')

		const recoveryCodes = generateRecoveryCodes()
		await repository.activate(input.userId, state.pendingSecretEnc, step)
		await repository.replaceRecoveryCodes(input.userId, recoveryCodes.map(hashRecoveryCode))
		await new AuditEventRepository(injectables.prisma).record({
			action: 'user.two_factor_enabled',
			actorType: 'user',
			actorId: input.userId,
			targetUserId: input.userId,
		})

		return { recoveryCodes }
	}
}
