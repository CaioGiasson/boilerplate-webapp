import SettingsManager, { SETTINGS_KEYS, parseUserSetting } from '@/managers/Settings.manager'
import { ValidationError } from '@/errors'

describe('SettingsManager', () => {
	it('garante uma única entry por key ao fazer set', () => {
		const user = {
			settings: [
				{ key: SETTINGS_KEYS.DARK_MODE, value: false },
				{ key: SETTINGS_KEYS.LANGUAGE, value: 'pt' },
			],
		}

		const next = SettingsManager.set(user, SETTINGS_KEYS.DARK_MODE, true)
		const darkEntries = next.filter((item) => item.key === SETTINGS_KEYS.DARK_MODE)

		expect(darkEntries).toHaveLength(1)
		expect(darkEntries[0]?.value).toBe(true)
		expect(SettingsManager.get({ settings: next }, SETTINGS_KEYS.LANGUAGE)).toBe('pt')
	})

	it('lista settings normalizando duplicatas', () => {
		const user = {
			settings: [
				{ key: 'language', value: 'en' },
				{ key: 'language', value: 'pt' },
			],
		}

		const listed = SettingsManager.list(user)
		expect(listed).toHaveLength(1)
		expect(listed[0]?.value).toBe('pt')
	})

	it('ignora keys fora da allowlist na listagem', () => {
		const listed = SettingsManager.list({
			settings: [
				{ key: SETTINGS_KEYS.DARK_MODE, value: true },
				{ key: '__proto__', value: true },
				{ key: 'unknown', value: 1 },
			],
		})

		expect(listed).toEqual([{ key: SETTINGS_KEYS.DARK_MODE, value: true }])
	})

	it('rejeita keys inválidas no set', () => {
		const user = { settings: [] }

		expect(() => SettingsManager.set(user, '__proto__', true)).toThrow(ValidationError)
		expect(() => SettingsManager.set(user, 'constructor', true)).toThrow(ValidationError)
		expect(() => SettingsManager.set(user, 'a'.repeat(10_000), true)).toThrow(ValidationError)
		expect(() => SettingsManager.set(user, 'notARealKey', true)).toThrow(ValidationError)
	})
})

describe('parseUserSetting', () => {
	it('aceita tipos válidos', () => {
		expect(parseUserSetting(SETTINGS_KEYS.DARK_MODE, true)).toEqual({
			key: SETTINGS_KEYS.DARK_MODE,
			value: true,
		})
		expect(parseUserSetting(SETTINGS_KEYS.LANGUAGE, 'es')).toEqual({
			key: SETTINGS_KEYS.LANGUAGE,
			value: 'es',
		})
	})

	it('rejeita tipos inválidos', () => {
		expect(() => parseUserSetting(SETTINGS_KEYS.DARK_MODE, 'yes')).toThrow(ValidationError)
		expect(() => parseUserSetting(SETTINGS_KEYS.DARK_MODE, null)).toThrow(ValidationError)
		expect(() => parseUserSetting(SETTINGS_KEYS.LANGUAGE, 'fr')).toThrow(ValidationError)
		expect(() => parseUserSetting('unknown', true)).toThrow(ValidationError)
	})
})
