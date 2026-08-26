import { z } from 'zod'
import { locales } from '@/constants/texts/types'
import { MAX_USER_SETTINGS, SETTINGS_KEYS } from '@/managers/Settings.manager'

export const userSettingEntrySchema = z.discriminatedUnion('key', [
	z.object({
		key: z.literal(SETTINGS_KEYS.DARK_MODE),
		value: z.boolean(),
	}),
	z.object({
		key: z.literal(SETTINGS_KEYS.LANGUAGE),
		value: z.enum(locales),
	}),
])

export const setSettingBodySchema = userSettingEntrySchema

export const registerSettingsSchema = z.array(userSettingEntrySchema).max(MAX_USER_SETTINGS)
