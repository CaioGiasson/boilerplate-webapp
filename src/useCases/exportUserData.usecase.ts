import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import UserRepository, { toPublicUser } from '@/repositories/User.repository'
import FileRepository from '@/repositories/File.repository'
import AiLogRepository from '@/repositories/AiLog.repository'
import NotificationRepository from '@/repositories/Notification.repository'
import PushSubscriptionRepository from '@/repositories/PushSubscription.repository'
import AuditEventRepository from '@/repositories/AuditEvent.repository'
import { NotFoundError, ValidationError } from '@/errors'

type Input = {
	userId: string
}

type Output = {
	exportedAt: string
	user: ReturnType<typeof toPublicUser>
	files: Array<{
		id: string
		key: string
		url: string
		thumbnailUrl: string | null
		category: string
		mimeType: string
		sizeBytes: number
		createdAt: string
	}>
	/** Ações em que o titular agiu ou foi alvo. Sem o id da outra parte (pode ser terceiro). */
	auditEvents: Array<{
		id: string
		action: string
		asActor: boolean
		asTarget: boolean
		ip: string | null
		createdAt: string
	}>
	notifications: Array<{
		id: string
		type: string
		title: string
		text: string
		link: string | null
		read: boolean
		createdAt: string
	}>
	/** Só a data de cada aparelho inscrito: endpoint e chaves identificam/permitem enviar ao aparelho e não saem. */
	pushSubscriptions: Array<{ id: string; createdAt: string }>
	aiLogs: Array<{
		id: string
		query: string
		model: string
		prompt: string
		response: string
		tokenCost: number
		createdAt: string
	}>
}

export default class ExportUserData extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) {
			throw new ValidationError('User id is required')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const userRepository = new UserRepository(injectables.prisma)
		const user = await userRepository.findById(input.userId)
		if (!user) {
			throw new NotFoundError('User not found')
		}

		const fileRepository = new FileRepository(injectables.prisma)
		const files = await fileRepository.listPublishedByOwner(user.id)
		const aiLogs = await new AiLogRepository(injectables.prisma).listByUser(user.id)
		const notifications = await new NotificationRepository(injectables.prisma).listAllByUser(user.id)
		const pushSubscriptions = await new PushSubscriptionRepository(injectables.prisma).listByUser(user.id)
		const auditEvents = await new AuditEventRepository(injectables.prisma).listByUser(user.id)

		return {
			exportedAt: new Date().toISOString(),
			user: toPublicUser(user),
			files: files.map((file) => ({
				id: file.id,
				key: file.key,
				url: file.url,
				thumbnailUrl: file.thumbnailUrl ?? null,
				category: file.category,
				mimeType: file.mimeType,
				sizeBytes: file.sizeBytes,
				createdAt: file.createdAt.toISOString(),
			})),
			auditEvents: auditEvents.map((event) => ({
				id: event.id,
				action: event.action,
				asActor: event.actorId === user.id,
				asTarget: event.targetUserId === user.id,
				ip: event.ip,
				createdAt: event.createdAt.toISOString(),
			})),
			notifications: notifications.map((item) => ({
				id: item.id,
				type: item.type,
				title: item.title,
				text: item.text,
				link: item.link,
				read: item.readAt !== null,
				createdAt: item.createdAt.toISOString(),
			})),
			pushSubscriptions: pushSubscriptions.map((item) => ({
				id: item.id,
				createdAt: item.createdAt.toISOString(),
			})),
			aiLogs: aiLogs.map((log) => ({
				id: log.id,
				query: log.query,
				model: log.model,
				prompt: log.prompt,
				response: log.response,
				tokenCost: log.tokenCost,
				createdAt: log.createdAt.toISOString(),
			})),
		}
	}
}
