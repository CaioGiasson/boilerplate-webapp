import { z } from 'zod'
import { BOARD_ZOOM_DESKTOP_MAX, BOARD_ZOOM_DESKTOP_MIN } from '@/constants/boardZoom'
import { locales } from '@/constants/texts/types'
import { MAX_USER_SETTINGS, SETTINGS_KEYS } from '@/managers/Settings.manager'

const zoomValueSchema = z
	.number({ invalid_type_error: 'Zoom must be a number' })
	.finite()
	.transform((value) => Math.round(value))
	.refine((value) => value >= BOARD_ZOOM_DESKTOP_MIN && value <= BOARD_ZOOM_DESKTOP_MAX, {
		message: `Zoom must be between ${BOARD_ZOOM_DESKTOP_MIN} and ${BOARD_ZOOM_DESKTOP_MAX}`,
	})

export const userSettingEntrySchema = z.discriminatedUnion('key', [
	z.object({
		key: z.literal(SETTINGS_KEYS.DARK_MODE),
		value: z.boolean(),
	}),
	z.object({
		key: z.literal(SETTINGS_KEYS.SHOW_SECRET_IMAGES),
		value: z.boolean(),
	}),
	z.object({
		key: z.literal(SETTINGS_KEYS.APPEAR_IN_GLOBAL_MOSAIC),
		value: z.boolean(),
	}),
	z.object({
		key: z.literal(SETTINGS_KEYS.LANGUAGE),
		value: z.enum(locales),
	}),
	z.object({
		key: z.literal(SETTINGS_KEYS.HOME_ZOOM_LEVEL),
		value: zoomValueSchema,
	}),
	z.object({
		key: z.literal(SETTINGS_KEYS.IMAGES_ZOOM_LEVEL),
		value: zoomValueSchema,
	}),
])

export const setSettingBodySchema = userSettingEntrySchema

export const registerSettingsSchema = z.array(userSettingEntrySchema).max(MAX_USER_SETTINGS)
