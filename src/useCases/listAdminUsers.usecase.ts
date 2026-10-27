import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { ValidationError } from '@/errors'
import UserRepository from '@/repositories/User.repository'
import { assertAdmin } from '@/utils/adminAccess'
import { maskEmail } from '@/utils/maskEmail'
import {
	PAGE_DEFAULT_LIMIT,
	PAGE_MAX_LIMIT,
	toPage,
	type KeysetCursor,
	type Page,
	type PageOrder,
} from '@/utils/pagination'
import type { UserRoleName } from '@/constants/userRole'

type Input = {
	callerId: string
	/** Vem de `parsePageQuery` (já decodificado). */
	cursor?: KeysetCursor
	limit?: number
	/** Trecho do nickname. */
	q?: string
	order?: PageOrder
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

type Output = Page<AdminUserRow>

export default class ListAdminUsers extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		if (!input.callerId?.trim()) throw new ValidationError('User id is required')
		if (
			input.limit !== undefined &&
			(!Number.isInteger(input.limit) || input.limit < 1 || input.limit > PAGE_MAX_LIMIT)
		) {
			throw new ValidationError(`limit must be between 1 and ${PAGE_MAX_LIMIT}`)
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const users = new UserRepository(injectables.prisma)
		assertAdmin(await users.findById(input.callerId))

		const limit = input.limit ?? PAGE_DEFAULT_LIMIT
		const { rows, pageInfo } = toPage(
			await users.listActiveKeyset({
				cursor: input.cursor,
				limit: limit + 1,
				order: input.order ?? 'desc',
				q: input.q,
			}),
			limit
		)

		return {
			items: rows.map((row) => ({
				id: row.id,
				nickname: row.nickname,
				emailMasked: maskEmail(row.email),
				role: row.role,
				emailVerified: Boolean(row.emailVerifiedAt),
				createdAt: row.createdAt.toISOString(),
			})),
			pageInfo,
		}
	}
}
