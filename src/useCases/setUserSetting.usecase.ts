import type { Prisma } from '@prisma/client'
import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import SettingsManager, { parseUserSetting, SETTINGS_KEYS, type SettingEntry } from '@/managers/Settings.manager'
import UserRepository, { type PublicUser } from '@/repositories/User.repository'
import { NotFoundError, ValidationError } from '@/errors'
import { toPublicUserWithSignedPhoto } from '@/utils/publicUserAccess'

type Input = {
	userId: string
	key: string
	value: Prisma.JsonValue
}

type Output = {
	user: PublicUser
	settings: SettingEntry[]
}

export default class SetUserSetting extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) {
			throw new ValidationError('User id is required')
		}
		parseUserSetting(input.key, input.value)
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const userRepository = new UserRepository(injectables.prisma)
		const user = await userRepository.findById(input.userId)

		if (!user) {
			throw new NotFoundError('User not found')
		}

		const settings = SettingsManager.set(user, input.key, input.value)
		const profileUpdate: {
			settings: SettingEntry[]
			hideFromGlobalMosaic?: boolean
		} = { settings }

		if (input.key === SETTINGS_KEYS.APPEAR_IN_GLOBAL_MOSAIC) {
			profileUpdate.hideFromGlobalMosaic = input.value === false
		}

		const updated = await userRepository.updateProfile(user.id, profileUpdate)

		return {
			user: await toPublicUserWithSignedPhoto(updated),
			settings: SettingsManager.list(updated),
		}
	}
}
