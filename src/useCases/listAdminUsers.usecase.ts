import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { ValidationError } from '@/errors'
import UserRepository from '@/repositories/User.repository'
import { assertAdmin } from '@/utils/adminAccess'
import { maskEmail } from '@/utils/maskEmail'
import type { UserRoleName } from '@/constants/userRole'

export const ADMIN_USERS_PAGE_SIZE = 20

type Input = {
	callerId: string
	page?: number
}

export type AdminUserRow = {
	id: string
	nickname: string
	/** Mascarado: o admin identifica a conta sem receber o e-mail completo. */
	emailMasked: string
	role: UserRoleName
	emailVerified: boolean
	createdAt: string
}

type Output = {
	items: AdminUserRow[]
	page: number
	pageSize: number
	total: number
	hasMore: boolean
}

export default class ListAdminUsers extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		if (!input.callerId?.trim()) throw new ValidationError('User id is required')
		if (input.page !== undefined && (!Number.isInteger(input.page) || input.page < 1)) {
			throw new ValidationError('page must be a positive integer')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const users = new UserRepository(injectables.prisma)
		assertAdmin(await users.findById(input.callerId))

		const page = input.page ?? 1
		const { rows, total } = await users.listActivePage({
			skip: (page - 1) * ADMIN_USERS_PAGE_SIZE,
			take: ADMIN_USERS_PAGE_SIZE,
		})

		return {
			items: rows.map((row) => ({
				id: row.id,
				nickname: row.nickname,
				emailMasked: maskEmail(row.email),
				role: row.role,
				emailVerified: Boolean(row.emailVerifiedAt),
				createdAt: row.createdAt.toISOString(),
			})),
			page,
			pageSize: ADMIN_USERS_PAGE_SIZE,
			total,
			hasMore: page * ADMIN_USERS_PAGE_SIZE < total,
		}
	}
}
