import { registerSettingsSchema, setSettingBodySchema } from '@/schemas/userSetting.schema'
import { MAX_USER_SETTINGS, SETTINGS_KEYS } from '@/managers/Settings.manager'

describe('userSetting schemas', () => {
	it('aceita PATCH com key da allowlist', () => {
		expect(setSettingBodySchema.parse({ key: SETTINGS_KEYS.SHOW_SECRET_IMAGES, value: false })).toEqual({
			key: SETTINGS_KEYS.SHOW_SECRET_IMAGES,
			value: false,
		})
	})

	it('rejeita keys e tipos inválidos no PATCH', () => {
		expect(setSettingBodySchema.safeParse({ key: '__proto__', value: true }).success).toBe(false)
		expect(setSettingBodySchema.safeParse({ key: 'constructor', value: true }).success).toBe(false)
		expect(setSettingBodySchema.safeParse({ key: SETTINGS_KEYS.DARK_MODE, value: 'true' }).success).toBe(false)
		expect(setSettingBodySchema.safeParse({ key: SETTINGS_KEYS.LANGUAGE, value: 'fr' }).success).toBe(false)
		expect(setSettingBodySchema.safeParse({ key: SETTINGS_KEYS.HOME_ZOOM_LEVEL, value: 999 }).success).toBe(false)
		expect(setSettingBodySchema.safeParse({ key: SETTINGS_KEYS.DARK_MODE, value: null }).success).toBe(false)
	})

	it('rejeita array de register maior que a allowlist', () => {
		const extra = Array.from({ length: MAX_USER_SETTINGS + 1 }, () => ({
			key: SETTINGS_KEYS.DARK_MODE,
			value: true,
		}))
		expect(registerSettingsSchema.safeParse(extra).success).toBe(false)
	})
})
