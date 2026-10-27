import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { UnauthorizedError, ValidationError } from '@/errors'
import AuditEventRepository from '@/repositories/AuditEvent.repository'
import TwoFactorRepository from '@/repositories/TwoFactor.repository'
import UserRepository from '@/repositories/User.repository'
import { isWithinAccountDeletionQuarantine } from '@/constants/accountDeletion'
import { getEmailService } from '@/services/Email/Email.service'
import type { EmailPort } from '@/services/Email/email.port'
import { completeLogin, type CompletedLogin } from '@/useCases/shared/completeLogin'
import {
	requireTwoFactorKey,
	verifyAndConsumeSecondFactor,
	type SecondFactorInput,
} from '@/useCases/shared/secondFactor'
import { verifyTwoFactorChallenge } from '@/utils/twoFactorChallenge'

type Input = SecondFactorInput & {
	/** `challengeToken` devolvido por `POST /auth/login` quando a conta tem 2FA. */
	challengeToken: string
	/** UUID do cookie HttpOnly `app-device` (server-side). */
	deviceCookie?: string | null
}

const INVALID_CHALLENGE_MESSAGE = 'Invalid two-factor challenge'

/** Segundo passo do login: confere o código (ou um de recuperação) e só então abre a sessão. */
export default class VerifyTwoFactorLogin extends UseCaseMasterPort<Input, CompletedLogin> {
	constructor(private readonly emailService: EmailPort = getEmailService()) {
		super()
	}

	async validate(input: Input): Promise<void> {
		if (!input.challengeToken?.trim()) throw new ValidationError('Challenge token is required')
	}

	async execute(input: Input, injectables: Injectables): Promise<CompletedLogin> {
		requireTwoFactorKey()
		const userId = await verifyTwoFactorChallenge(input.challengeToken.trim())

		const user = await new UserRepository(injectables.prisma).findByIdIncludingDeleted(userId)
		if (!user?.twoFactorEnabledAt) throw new UnauthorizedError(INVALID_CHALLENGE_MESSAGE)
		if (user.deletedAt && !isWithinAccountDeletionQuarantine(user.deletedAt)) {
			throw new UnauthorizedError(INVALID_CHALLENGE_MESSAGE)
		}

		const repository = new TwoFactorRepository(injectables.prisma)
		const method = await verifyAndConsumeSecondFactor(
			repository,
			user.id,
			await repository.findState(user.id),
			input
		)

		if (method === 'recovery') {
			await new AuditEventRepository(injectables.prisma).record({
				action: 'user.two_factor_recovery_used',
				actorType: 'user',
				actorId: user.id,
				targetUserId: user.id,
				metadata: { remaining: await repository.countRecoveryCodesRemaining(user.id) },
			})
		}

		return completeLogin({ user, deviceCookie: input.deviceCookie, injectables, emailService: this.emailService })
	}
}
