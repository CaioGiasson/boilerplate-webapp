'use client'

import * as React from 'react'
import CookiesManager, { COOKIE_KEYS } from '@/managers/Cookies.manager'

type ThemeMode = 'light' | 'dark'

type ThemeContextValue = {
	theme: ThemeMode
	setTheme: (theme: ThemeMode) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

type ThemeProviderProps = {
	children: React.ReactNode
	defaultTheme?: ThemeMode
}

function resolveClientTheme(): ThemeMode {
	const cookieTheme = CookiesManager.get(COOKIE_KEYS.THEME)
	if (cookieTheme === 'light' || cookieTheme === 'dark') {
		return cookieTheme
	}

	if (document.documentElement.classList.contains('dark')) {
		return 'dark'
	}

	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children, defaultTheme = 'light' }: ThemeProviderProps) {
	const [theme, setThemeState] = React.useState<ThemeMode>(defaultTheme)

	React.useLayoutEffect(() => {
		const resolved = resolveClientTheme()
		setThemeState(resolved)
		document.documentElement.classList.toggle('dark', resolved === 'dark')
	}, [])

	const setTheme = React.useCallback((nextTheme: ThemeMode) => {
		CookiesManager.set(COOKIE_KEYS.THEME, nextTheme)
		document.documentElement.classList.toggle('dark', nextTheme === 'dark')
		setThemeState(nextTheme)
	}, [])

	const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme])

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
	const context = React.useContext(ThemeContext)
	if (!context) {
		throw new Error('useTheme must be used within ThemeProvider')
	}
	return context
}
