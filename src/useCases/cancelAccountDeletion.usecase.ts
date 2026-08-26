import LogManager from '@/managers/Log.manager'
import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import UserRepository, { toPublicUser, type PublicUser } from '@/repositories/User.repository'
import { NotFoundError, UnauthorizedError, ValidationError } from '@/errors'
import { getAppBaseUrl } from '@/config/env'
import { isWithinAccountDeletionQuarantine } from '@/constants/accountDeletion'
import type { AppLocale } from '@/constants/texts'
import type { SettingEntry } from '@/managers/Settings.manager'
import SettingsManager from '@/managers/Settings.manager'
import { getEmailService } from '@/services/Email/Email.service'
import type { EmailPort } from '@/services/Email/email.port'
import { buildAccountDeletionCancelledMail } from '@/utils/emailMessages'

type Input = {
	userId: string
	locale?: AppLocale
}

type Output = {
	user: PublicUser
	settings: SettingEntry[]
}

/** CANCELAR exclusão do perfil — limpa `deletedAt` dentro da janela de 30 dias. */
export default class CancelAccountDeletion extends UseCaseMasterPort<Input, Output> {
	constructor(private readonly emailService: EmailPort = getEmailService()) {
		super()
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) {
			throw new ValidationError('User id is required')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const userRepository = new UserRepository(injectables.prisma)
		const user = await userRepository.findByIdIncludingDeleted(input.userId)

		if (!user?.deletedAt) {
			throw new NotFoundError('User not found')
		}

		if (!isWithinAccountDeletionQuarantine(user.deletedAt)) {
			throw new UnauthorizedError('Account deletion quarantine has expired', 'ACCOUNT_DELETION_EXPIRED')
		}

		const restored = await userRepository.clearDeletedAt(user.id)
		const cancelledAt = new Date()
		const locale = input.locale ?? 'en'

		try {
			const mail = buildAccountDeletionCancelledMail({
				locale,
				cancelledAt,
				appBaseUrl: getAppBaseUrl(),
			})
			await this.emailService.send({
				to: restored.email,
				subject: mail.subject,
				text: mail.text,
			})
		} catch (error: unknown) {
			LogManager.error('Failed to send account deletion cancelled email', error)
		}

		return {
			user: toPublicUser(restored),
			settings: SettingsManager.list(restored),
		}
	}
}
