import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import UserRepository from '@/repositories/User.repository'
import { ValidationError } from '@/errors'
import { assertPasswordPolicy, hashPassword } from '@/utils/password'
import { PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'
import { EMAIL_CODE_LENGTH, hashEmailToken, normalizeEmailToken } from '@/utils/emailToken'

type Input = {
	token: string
	newPassword: string
	newPasswordConfirmation: string
}

type Output = {
	ok: true
}

/**
 * Consumes a `password_reset` challenge and sets a new password, revoking sessions.
 */
export default class ResetPassword extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		const code = normalizeEmailToken(input.token ?? '')
		if (code.length !== EMAIL_CODE_LENGTH) {
			throw new ValidationError(`A valid ${EMAIL_CODE_LENGTH}-character code is required`)
		}
		if (!input.newPassword) {
			throw new ValidationError('New password is required')
		}
		if (input.newPassword.length > PASSWORD_MAX_LENGTH) {
			throw new ValidationError('Password must be at most 128 characters')
		}
		if (input.newPassword !== input.newPasswordConfirmation) {
			throw new ValidationError('Password confirmation does not match')
		}
		assertPasswordPolicy(input.newPassword)
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const userRepository = new UserRepository(injectables.prisma)
		const hash = hashEmailToken(input.token)
		const user = await userRepository.findByEmailTokenHash(hash)

		if (!user || user.emailTokenPurpose !== 'password_reset' || !user.emailTokenExpiresAt) {
			throw new ValidationError('Invalid or expired token')
		}

		if (user.emailTokenExpiresAt.getTime() < Date.now()) {
			await userRepository.clearEmailChallenge(user.id)
			throw new ValidationError('Invalid or expired token')
		}

		if (!user.emailVerifiedAt) {
			await userRepository.clearEmailChallenge(user.id)
			throw new ValidationError('Invalid or expired token')
		}

		const passwordHash = await hashPassword(input.newPassword)
		await userRepository.updatePasswordClearingEmailChallenge(user.id, passwordHash)

		return { ok: true }
	}
}
