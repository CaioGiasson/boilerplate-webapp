export const PWA_INSTALLED_STORAGE_KEY = 'app-pwa-installed'

export const STANDALONE_DISPLAY_MODES = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'] as const

type StandaloneNavigator = Navigator & { standalone?: boolean }

export function isStandaloneDisplay(win: Window = window): boolean {
	const matchesStandaloneMode = STANDALONE_DISPLAY_MODES.some(
		(mode) => win.matchMedia(`(display-mode: ${mode})`).matches
	)
	if (matchesStandaloneMode) return true

	if ((win.navigator as StandaloneNavigator).standalone === true) return true
	return win.document.referrer.startsWith('android-app://')
}

/** `localStorage` pode lançar (modo privado, dados bloqueados): tratamos como "não instalado". */
export function readPwaInstalledFlag(storage: Pick<Storage, 'getItem'> = window.localStorage): boolean {
	try {
		return storage.getItem(PWA_INSTALLED_STORAGE_KEY) === '1'
	} catch {
		return false
	}
}

export function markPwaInstalled(storage: Pick<Storage, 'setItem'> = window.localStorage): void {
	try {
		storage.setItem(PWA_INSTALLED_STORAGE_KEY, '1')
	} catch {
		// Sem armazenamento: o banner some pela detecção de display-mode.
	}
}

export function isPwaInstalled(storage: Pick<Storage, 'getItem'> = window.localStorage, win: Window = window): boolean {
	return readPwaInstalledFlag(storage) || isStandaloneDisplay(win)
}
