import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { ValidationError } from '@/errors'
import AuditEventRepository from '@/repositories/AuditEvent.repository'
import UserRepository from '@/repositories/User.repository'
import { assertAdmin } from '@/utils/adminAccess'
import {
	PAGE_DEFAULT_LIMIT,
	PAGE_MAX_LIMIT,
	toPage,
	type KeysetCursor,
	type Page,
	type PageOrder,
} from '@/utils/pagination'
import type { AuditAction } from '@/constants/audit'

type Input = {
	callerId: string
	/** Vem de `parsePageQuery` (já decodificado). */
	cursor?: KeysetCursor
	limit?: number
	order?: PageOrder
	action?: AuditAction
}

export type AuditEventParty = {
	id: string
	/** `null` quando a conta não existe mais. */
	nickname: string | null
}

export type AuditEventRow = {
	id: string
	action: string
	actorType: string
	actor: AuditEventParty | null
	target: AuditEventParty | null
	createdAt: string
}

type Output = Page<AuditEventRow>

/**
 * Lista a trilha de auditoria (só ADMIN). O IP, o `requestId` e o `metadata` ficam de fora do DTO: quem investiga
 * a fundo consulta o banco; a tela não precisa expor dado pessoal além de quem fez o quê e quando.
 */
export default class ListAuditEvents extends UseCaseMasterPort<Input, Output> {
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
			await new AuditEventRepository(injectables.prisma).listPage({
				cursor: input.cursor,
				limit: limit + 1,
				order: input.order ?? 'desc',
				action: input.action,
			}),
			limit
		)

		const ids = [
			...new Set(
				rows.flatMap((row) => [row.actorId, row.targetUserId]).filter((id): id is string => Boolean(id))
			),
		]
		const nicknames = await users.findNicknamesByIds(ids)
		const party = (id: string | null): AuditEventParty | null =>
			id ? { id, nickname: nicknames.get(id) ?? null } : null

		return {
			items: rows.map((row) => ({
				id: row.id,
				action: row.action,
				actorType: row.actorType,
				actor: party(row.actorId),
				target: party(row.targetUserId),
				createdAt: row.createdAt.toISOString(),
			})),
			pageInfo,
		}
	}
}
