import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import UserRepository from '@/repositories/User.repository'
import { ServiceUnavailableError, UnauthorizedError, ValidationError } from '@/errors'
import LogManager from '@/managers/Log.manager'
import { isTwoFactorAvailable } from '@/config/env'
import { isWithinAccountDeletionQuarantine } from '@/constants/accountDeletion'
import { getEmailService } from '@/services/Email/Email.service'
import type { EmailPort } from '@/services/Email/email.port'
import { verifyPasswordOrDummy } from '@/utils/password'
import { PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'
import { signTwoFactorChallenge } from '@/utils/twoFactorChallenge'
import { completeLogin, type CompletedLogin } from '@/useCases/shared/completeLogin'

type Input = {
	identifier: string
	password: string
	/** UUID do cookie HttpOnly `app-device` (server-side). Ignorar body do cliente. */
	deviceCookie?: string | null
}

/** Senha correta em conta com 2FA: ainda não há sessão; o cliente envia o código a `POST /auth/2fa/verify`. */
type TwoFactorRequiredOutput = {
	kind: 'two_factor_required'
	challengeToken: string
}

type Output = CompletedLogin | TwoFactorRequiredOutput

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Senha → (segundo fator, se a conta tem) → sessão. A abertura da sessão (alerta de novo dispositivo, decisão de
 * exclusão de conta) está em `completeLogin`, compartilhada com `VerifyTwoFactorLogin`.
 */
export default class LoginUser extends UseCaseMasterPort<Input, Output> {
	constructor(private readonly emailService: EmailPort = getEmailService()) {
		super()
	}

	async validate(input: Input): Promise<void> {
		if (!input.identifier?.trim() || !input.password) {
			throw new ValidationError('Identifier and password are required')
		}
		if (input.password.length > PASSWORD_MAX_LENGTH) {
			throw new ValidationError('Password must be at most 128 characters')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const userRepository = new UserRepository(injectables.prisma)
		const identifier = input.identifier.trim()
		const user = EMAIL_PATTERN.test(identifier)
			? await userRepository.findByEmailIncludingDeleted(identifier)
			: await userRepository.findByNicknameIncludingDeleted(identifier)

		const valid = await verifyPasswordOrDummy(user?.passwordHash ?? null, input.password)
		if (!user || !valid) {
			if (user && !user.deletedAt && !user.passwordHash && user.googleLinkedAt) {
				throw new UnauthorizedError('Sign in with Google for this account', 'GOOGLE_LOGIN_REQUIRED')
			}
			throw new UnauthorizedError('Invalid credentials')
		}

		if (user.deletedAt) {
			if (!isWithinAccountDeletionQuarantine(user.deletedAt)) {
				throw new UnauthorizedError('Invalid credentials')
			}
		} else if (!user.passwordHash && user.googleLinkedAt) {
			throw new UnauthorizedError('Sign in with Google for this account', 'GOOGLE_LOGIN_REQUIRED')
		}

		if (user.twoFactorEnabledAt) {
			// Falha fechada: sem a chave não dá para validar o código, e pular o 2FA seria rebaixar a segurança da conta.
			if (!isTwoFactorAvailable()) {
				LogManager.error('Two-factor login blocked: TWO_FACTOR_ENCRYPTION_KEY is not configured', {
					userId: user.id,
				})
				throw new ServiceUnavailableError('Two-factor authentication is unavailable')
			}
			return { kind: 'two_factor_required', challengeToken: await signTwoFactorChallenge(user.id) }
		}

		return completeLogin({ user, deviceCookie: input.deviceCookie, injectables, emailService: this.emailService })
	}
}
