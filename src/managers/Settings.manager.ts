import type { Prisma } from '@prisma/client'
import { BOARD_ZOOM_DESKTOP_MAX, BOARD_ZOOM_DESKTOP_MIN } from '@/constants/boardZoom'
import { locales } from '@/constants/texts/types'
import { ValidationError } from '@/errors'

export const SETTINGS_KEYS = {
	DARK_MODE: 'darkMode',
	LANGUAGE: 'language',
	HOME_ZOOM_LEVEL: 'homeZoomLevel',
	IMAGES_ZOOM_LEVEL: 'imagesZoomLevel',
	SHOW_SECRET_IMAGES: 'showSecretImages',
	APPEAR_IN_GLOBAL_MOSAIC: 'appearInGlobalMosaic',
} as const

export type SettingKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS]

export const SETTING_KEY_VALUES = Object.values(SETTINGS_KEYS) as SettingKey[]

export const MAX_USER_SETTINGS = SETTING_KEY_VALUES.length

const ALLOWED_SETTING_KEYS = new Set<string>(SETTING_KEY_VALUES)

const BOOLEAN_SETTING_KEYS = new Set<string>([
	SETTINGS_KEYS.DARK_MODE,
	SETTINGS_KEYS.SHOW_SECRET_IMAGES,
	SETTINGS_KEYS.APPEAR_IN_GLOBAL_MOSAIC,
])

const ZOOM_SETTING_KEYS = new Set<string>([SETTINGS_KEYS.HOME_ZOOM_LEVEL, SETTINGS_KEYS.IMAGES_ZOOM_LEVEL])

const LOCALE_VALUES = new Set<string>(locales)

export type SettingsUser = {
	settings: Prisma.JsonArray | Array<{ key: string; value: Prisma.JsonValue }>
}

export type SettingEntry = {
	key: string
	value: Prisma.JsonValue
}

export function isAllowedSettingKey(key: string): key is SettingKey {
	return ALLOWED_SETTING_KEYS.has(key)
}

export function parseUserSetting(key: unknown, value: unknown): SettingEntry {
	if (typeof key !== 'string' || !isAllowedSettingKey(key)) {
		throw new ValidationError('Invalid setting key')
	}

	if (value === null || value === undefined) {
		throw new ValidationError('Setting value is required')
	}

	if (BOOLEAN_SETTING_KEYS.has(key)) {
		if (typeof value !== 'boolean') {
			throw new ValidationError(`Setting ${key} must be a boolean`)
		}
		return { key, value }
	}

	if (key === SETTINGS_KEYS.LANGUAGE) {
		if (typeof value !== 'string' || !LOCALE_VALUES.has(value)) {
			throw new ValidationError('Setting language must be pt, en or es')
		}
		return { key, value }
	}

	if (ZOOM_SETTING_KEYS.has(key)) {
		if (typeof value !== 'number' || !Number.isFinite(value)) {
			throw new ValidationError(`Setting ${key} must be a finite number`)
		}
		const rounded = Math.round(value)
		if (rounded < BOARD_ZOOM_DESKTOP_MIN || rounded > BOARD_ZOOM_DESKTOP_MAX) {
			throw new ValidationError(
				`Setting ${key} must be between ${BOARD_ZOOM_DESKTOP_MIN} and ${BOARD_ZOOM_DESKTOP_MAX}`
			)
		}
		return { key, value: rounded }
	}

	throw new ValidationError('Invalid setting key')
}

export function parseUserSettingsList(settings: unknown[] | undefined): SettingEntry[] {
	if (settings === undefined) {
		return []
	}

	if (settings.length > MAX_USER_SETTINGS) {
		throw new ValidationError('Too many settings')
	}

	return settings.map((item) => {
		if (!item || typeof item !== 'object' || Array.isArray(item)) {
			throw new ValidationError('Invalid setting entry')
		}
		const record = item as { key?: unknown; value?: unknown }
		return parseUserSetting(record.key, record.value)
	})
}

/**
 * Mantém consistência de User.settings: no máximo um objeto por key.
 */
export default class SettingsManager {
	static list(user: SettingsUser): SettingEntry[] {
		return normalizeSettings(user.settings).filter((item) => isAllowedSettingKey(item.key))
	}

	static get(user: SettingsUser, key: string): Prisma.JsonValue | undefined {
		const entry = SettingsManager.list(user).find((item) => item.key === key)
		return entry?.value
	}

	/**
	 * Retorna um novo array de settings com a key upsertada (sem duplicatas).
	 */
	static set(user: SettingsUser, key: string, value: Prisma.JsonValue): SettingEntry[] {
		const parsed = parseUserSetting(key, value)
		const current = SettingsManager.list(user).filter((item) => item.key !== parsed.key)
		current.push(parsed)
		return current
	}
}

function normalizeSettings(
	settings: Prisma.JsonArray | Array<{ key: string; value: Prisma.JsonValue }>
): SettingEntry[] {
	if (!Array.isArray(settings)) {
		return []
	}

	const byKey = new Map<string, SettingEntry>()

	for (const item of settings) {
		if (!item || typeof item !== 'object' || Array.isArray(item)) {
			continue
		}

		const record = item as Record<string, unknown>
		if (typeof record.key !== 'string') {
			continue
		}

		byKey.set(record.key, {
			key: record.key,
			value: record.value as Prisma.JsonValue,
		})
	}

	return Array.from(byKey.values())
}

export function showSecretImagesFromUser(user: SettingsUser): boolean {
	return SettingsManager.get(user, SETTINGS_KEYS.SHOW_SECRET_IMAGES) === true
}
