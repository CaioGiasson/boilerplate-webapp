import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { ForbiddenError, NotFoundError, ValidationError } from '@/errors'
import LogManager from '@/managers/Log.manager'
import UserRepository from '@/repositories/User.repository'
import { isAdminRole } from '@/constants/userRole'
import { assertAdmin } from '@/utils/adminAccess'
import { IMPERSONATION_TTL_SECONDS, signImpersonationToken } from '@/utils/session'

type Input = {
	callerId: string
	targetUserId: string
}

type Output = {
	token: string
	expiresAt: string
}

export default class CreateImpersonationToken extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		if (!input.callerId?.trim()) throw new ValidationError('User id is required')
		if (!input.targetUserId?.trim()) throw new ValidationError('Target user id is required')
		if (input.callerId === input.targetUserId) throw new ValidationError('Cannot impersonate yourself')
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const users = new UserRepository(injectables.prisma)
		assertAdmin(await users.findById(input.callerId))

		const target = await users.findById(input.targetUserId)
		if (!target) throw new NotFoundError('User not found')
		if (isAdminRole(target.role)) throw new ForbiddenError('Cannot impersonate an admin')

		const { token, exp } = await signImpersonationToken({ userId: target.id, adminId: input.callerId })
		LogManager.info('Impersonation token issued', {
			adminId: input.callerId,
			targetUserId: target.id,
			ttlSeconds: IMPERSONATION_TTL_SECONDS,
		})

		return { token, expiresAt: new Date(exp * 1000).toISOString() }
	}
}
