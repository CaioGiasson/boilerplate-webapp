import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { ConflictError, NotFoundError, ValidationError } from '@/errors'
import TwoFactorRepository from '@/repositories/TwoFactor.repository'
import UserRepository from '@/repositories/User.repository'
import { APP_NAME } from '@/constants/app'
import { requireTwoFactorKey } from '@/useCases/shared/secondFactor'
import { buildOtpauthUri, generateTotpSecret } from '@/utils/totp'
import { encryptSecret } from '@/utils/twoFactorCrypto'

type Input = {
	userId: string
}

type Output = {
	/** Segredo em base32 para digitar no app autenticador. Mostrado só aqui; depois só existe cifrado. */
	secret: string
	/** URI `otpauth://` (abre direto em apps no celular). */
	otpauthUri: string
}

/**
 * Passo 1 do setup: gera o segredo e o guarda **cifrado como pendente**. O 2FA só vale depois de
 * `EnableTwoFactor` (que prova que o app autenticador gera códigos certos). Refazer o setup troca o pendente.
 */
export default class BeginTwoFactorSetup extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const key = requireTwoFactorKey()
		const user = await new UserRepository(injectables.prisma).findById(input.userId)
		if (!user) throw new NotFoundError('User not found')
		// O 2FA protege o login por senha; conta só com Google não tem senha para proteger.
		if (!user.passwordHash)
			throw new ValidationError('Set a password before enabling two-factor', 'PASSWORD_REQUIRED')
		if (user.twoFactorEnabledAt) throw new ConflictError('Two-factor is already enabled')

		const secret = generateTotpSecret()
		await new TwoFactorRepository(injectables.prisma).savePendingSecret(user.id, encryptSecret(secret, key))

		return {
			secret,
			otpauthUri: buildOtpauthUri({ secret, accountName: user.email, issuer: APP_NAME }),
		}
	}
}
