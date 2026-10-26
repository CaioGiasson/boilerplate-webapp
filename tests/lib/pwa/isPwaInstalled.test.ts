import {
	PWA_INSTALLED_STORAGE_KEY,
	isPwaInstalled,
	isStandaloneDisplay,
	markPwaInstalled,
	readPwaInstalledFlag,
} from '@/lib/pwa/isPwaInstalled'

function fakeWindow(options: { matches?: string[]; standalone?: boolean; referrer?: string } = {}) {
	return {
		matchMedia: (query: string) => ({ matches: (options.matches ?? []).includes(query) }),
		navigator: { standalone: options.standalone },
		document: { referrer: options.referrer ?? '' },
	} as unknown as Window
}

describe('isStandaloneDisplay', () => {
	it('detecta display-mode standalone', () => {
		expect(isStandaloneDisplay(fakeWindow({ matches: ['(display-mode: standalone)'] }))).toBe(true)
	})

	it('detecta navigator.standalone (iOS) e referrer de app Android', () => {
		expect(isStandaloneDisplay(fakeWindow({ standalone: true }))).toBe(true)
		expect(isStandaloneDisplay(fakeWindow({ referrer: 'android-app://com.example' }))).toBe(true)
	})

	it('aba comum não é standalone', () => {
		expect(isStandaloneDisplay(fakeWindow())).toBe(false)
	})
})

describe('flag de instalado', () => {
	it('grava e lê a flag', () => {
		const data = new Map<string, string>()
		const storage = {
			getItem: (key: string) => data.get(key) ?? null,
			setItem: (key: string, value: string) => void data.set(key, value),
		}

		expect(readPwaInstalledFlag(storage)).toBe(false)
		markPwaInstalled(storage)
		expect(data.get(PWA_INSTALLED_STORAGE_KEY)).toBe('1')
		expect(readPwaInstalledFlag(storage)).toBe(true)
		expect(isPwaInstalled(storage, fakeWindow())).toBe(true)
	})

	it('trata armazenamento indisponível como não instalado, sem lançar', () => {
		const broken = {
			getItem: () => {
				throw new Error('blocked')
			},
			setItem: () => {
				throw new Error('blocked')
			},
		}

		expect(readPwaInstalledFlag(broken)).toBe(false)
		expect(() => markPwaInstalled(broken)).not.toThrow()
		expect(isPwaInstalled(broken, fakeWindow({ matches: ['(display-mode: standalone)'] }))).toBe(true)
	})
})
