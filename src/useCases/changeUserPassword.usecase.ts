import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import ActiveSessionRepository from '@/repositories/ActiveSession.repository'
import UserRepository from '@/repositories/User.repository'
import { NotFoundError, UnauthorizedError, ValidationError } from '@/errors'
import { getJwtTtlSeconds } from '@/config/env'
import { assertPasswordPolicy, hashPassword, verifyPassword } from '@/utils/password'
import { PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'
import { createSessionDeviceId, signSessionToken } from '@/utils/session'

type Input = {
	userId: string
	/** Empty string allowed only for Google-linked accounts without a password (type A). */
	currentPassword: string
	newPassword: string
	newPasswordConfirmation: string
}

type Output = {
	ok: true
	token: string
	ttlSeconds: number
}

export default class ChangeUserPassword extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) {
			throw new ValidationError('User id is required')
		}
		if (input.currentPassword.length > PASSWORD_MAX_LENGTH) {
			throw new ValidationError('Password must be at most 128 characters')
		}
		if (input.newPassword !== input.newPasswordConfirmation) {
			throw new ValidationError('Password confirmation does not match')
		}
		assertPasswordPolicy(input.newPassword)
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const userRepository = new UserRepository(injectables.prisma)
		const user = await userRepository.findById(input.userId)

		if (!user) {
			throw new NotFoundError('User not found')
		}

		const hasPassword = Boolean(user.passwordHash)
		const googleLinked = Boolean(user.googleLinkedAt)

		if (!hasPassword && !googleLinked) {
			throw new ValidationError(
				'This account cannot set a password. Contact support.',
				'ACCOUNT_SUPPORT_REQUIRED'
			)
		}

		if (!hasPassword && googleLinked) {
			// Type A: first password — current may be blank.
			if (input.currentPassword) {
				throw new ValidationError('Current password must be empty when setting the first password')
			}
		} else {
			// Type B: require current password.
			if (!input.currentPassword) {
				throw new ValidationError('Current password is required')
			}
			if (!user.passwordHash) {
				throw new UnauthorizedError('Current password is invalid')
			}
			const valid = await verifyPassword(user.passwordHash, input.currentPassword)
			if (!valid) {
				throw new UnauthorizedError('Current password is invalid')
			}
		}

		const passwordHash = await hashPassword(input.newPassword)
		await userRepository.updatePassword(input.userId, passwordHash)

		const device = createSessionDeviceId()
		const { token, jti, exp } = await signSessionToken({
			userId: input.userId,
			device,
		})

		const activeSessionRepository = new ActiveSessionRepository(injectables.prisma)
		await activeSessionRepository.create({
			userId: input.userId,
			jti,
			device,
			exp,
		})
		await activeSessionRepository.deleteAllForUserExceptJti(input.userId, jti)

		return { ok: true, token, ttlSeconds: getJwtTtlSeconds() }
	}
}
