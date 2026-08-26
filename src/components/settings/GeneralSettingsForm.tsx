'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { AppSelect, SettingsSection, Toggle, Title } from '@/design-system'
import { useTheme } from '@/components/theme-provider'
import { usePathname, useRouter } from '@/i18n/navigation'
import CookiesManager, { COOKIE_KEYS } from '@/managers/Cookies.manager'
import { SETTINGS_KEYS } from '@/managers/Settings.manager'
import type { AppLocale } from '@/constants/texts'
import { locales } from '@/constants/texts'
import { useAuth } from '@/components/auth/AuthProvider'
import { setUserSettingRequest } from '@/lib/auth-client'

export function GeneralSettingsForm() {
	const t = useTranslations('settings')
	const { theme, setTheme } = useTheme()
	const locale = useLocale()
	const router = useRouter()
	const pathname = usePathname()
	const { user, setUser } = useAuth()

	const languageOptions = locales.map((code) => ({
		value: code,
		label: t(`languages.${code}`),
	}))

	const persistSetting = async (key: string, value: string | boolean) => {
		if (!user) {
			return
		}
		try {
			const updated = await setUserSettingRequest(user.id, key, value)
			setUser(updated)
		} catch {
			// Preferência local já foi aplicada; sync em nuvem é best-effort na UI.
		}
	}

	const handleLanguageChange = (nextLocale: string) => {
		CookiesManager.set(COOKIE_KEYS.LOCALE, nextLocale)
		void persistSetting(SETTINGS_KEYS.LANGUAGE, nextLocale)
		router.replace(pathname, { locale: nextLocale as AppLocale })
	}

	const handleThemeChange = (checked: boolean) => {
		setTheme(checked ? 'dark' : 'light')
		void persistSetting(SETTINGS_KEYS.DARK_MODE, checked)
	}

	const showSecretImages = user?.settings?.some(
		(entry) => entry.key === SETTINGS_KEYS.SHOW_SECRET_IMAGES && entry.value === true
	)

	const handleShowSecretImagesChange = (checked: boolean) => {
		void persistSetting(SETTINGS_KEYS.SHOW_SECRET_IMAGES, checked)
	}

	const appearInGlobalMosaic = user?.settings?.every(
		(entry) => entry.key !== SETTINGS_KEYS.APPEAR_IN_GLOBAL_MOSAIC || entry.value !== false
	)

	const handleAppearInGlobalMosaicChange = (checked: boolean) => {
		void persistSetting(SETTINGS_KEYS.APPEAR_IN_GLOBAL_MOSAIC, checked)
	}

	return (
		<div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6" data-testid="settings-page">
			<Title as="h1">{t('title')}</Title>

			<SettingsSection title={t('general.title')} description={t('general.description')}>
				<div className="flex items-center justify-between gap-4">
					<Label htmlFor="dark-mode-toggle">{t('general.darkMode')}</Label>
					<Toggle
						id="dark-mode-toggle"
						checked={theme === 'dark'}
						onCheckedChange={handleThemeChange}
						data-testid="dark-mode-toggle"
					/>
				</div>

				{user ? (
					<div className="flex items-center justify-between gap-4">
						<div className="min-w-0 flex-1">
							<Label htmlFor="show-secret-images-toggle">{t('general.showSecretImages')}</Label>
							<p className="text-sm text-muted-foreground">{t('general.showSecretImagesDescription')}</p>
						</div>
						<Toggle
							id="show-secret-images-toggle"
							checked={Boolean(showSecretImages)}
							onCheckedChange={handleShowSecretImagesChange}
							data-testid="show-secret-images-toggle"
						/>
					</div>
				) : null}

				{user ? (
					<div className="flex items-center justify-between gap-4">
						<div className="min-w-0 flex-1">
							<Label htmlFor="appear-in-mosaic-toggle">{t('general.appearInGlobalMosaic')}</Label>
							<p className="text-sm text-muted-foreground">
								{t('general.appearInGlobalMosaicDescription')}
							</p>
						</div>
						<Toggle
							id="appear-in-mosaic-toggle"
							checked={Boolean(appearInGlobalMosaic)}
							onCheckedChange={handleAppearInGlobalMosaicChange}
						/>
					</div>
				) : null}

				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<Label htmlFor="language-select">{t('general.language')}</Label>
					<div className="w-full sm:w-56">
						<AppSelect
							aria-label={t('general.language')}
							value={locale}
							options={languageOptions}
							onValueChange={handleLanguageChange}
						/>
					</div>
				</div>
			</SettingsSection>
		</div>
	)
}
