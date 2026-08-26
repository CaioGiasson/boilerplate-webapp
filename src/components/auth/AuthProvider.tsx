'use client'

import * as React from 'react'
import { useLocale } from 'next-intl'
import { applyCloudSettingsToLocal, fetchCurrentUser, logoutRequest, type AuthUser } from '@/lib/auth-client'
import { useTheme } from '@/components/theme-provider'
import { usePathname, useRouter } from '@/i18n/navigation'

type AuthContextValue = {
	user: AuthUser | null
	loading: boolean
	refresh: () => Promise<void>
	setUser: (user: AuthUser | null) => void
	logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
	const context = React.useContext(AuthContext)
	if (!context) {
		throw new Error('useAuth must be used within AuthProvider')
	}
	return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUserState] = React.useState<AuthUser | null>(null)
	const [loading, setLoading] = React.useState(true)
	const { setTheme } = useTheme()
	const router = useRouter()
	const pathname = usePathname()
	const locale = useLocale()

	const setUser = React.useCallback(
		(next: AuthUser | null) => {
			setUserState(next)
			if (!next?.settings?.length) {
				return
			}

			const applied = applyCloudSettingsToLocal(next.settings)
			if (applied.theme) {
				setTheme(applied.theme)
			}
			if (applied.locale && applied.locale !== locale) {
				router.replace(pathname, { locale: applied.locale })
			}
		},
		[locale, pathname, router, setTheme]
	)

	const refresh = React.useCallback(async () => {
		try {
			const current = await fetchCurrentUser()
			setUser(current)
		} catch {
			setUser(null)
		} finally {
			setLoading(false)
		}
	}, [setUser])

	React.useEffect(() => {
		void refresh()
	}, [refresh])

	const logout = React.useCallback(async () => {
		await logoutRequest()
		setUserState(null)
		router.push('/')
	}, [router])

	const value = React.useMemo(
		() => ({
			user,
			loading,
			refresh,
			setUser,
			logout,
		}),
		[user, loading, refresh, setUser, logout]
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
