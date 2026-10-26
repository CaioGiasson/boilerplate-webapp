import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { headers } from 'next/headers'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import '../globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { ErrorGuardScript } from '@/components/errors/ErrorGuardScript'
import { ThemeScript } from '@/components/theme-script'
import { AppShell } from '@/components/layout'
import { resolveServerTheme } from '@/utils/theme'
import { routing } from '@/i18n/routing'
import { PWA_THEME_COLOR } from '@/lib/pwa/webManifest'

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
	display: 'swap',
})

import { APP_NAME } from '@/constants/app'

export const metadata: Metadata = {
	title: APP_NAME,
	description: `${APP_NAME} — starter webapp Next.js`,
	icons: { apple: '/apple-touch-icon.png' },
	appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
	themeColor: PWA_THEME_COLOR,
}

type LocaleLayoutProps = {
	children: React.ReactNode
	params: Promise<{ locale: string }>
}

export function generateStaticParams() {
	return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
	const { locale } = await params

	if (!hasLocale(routing.locales, locale)) {
		notFound()
	}

	setRequestLocale(locale)
	const messages = await getMessages()
	const headerStore = await headers()
	const preferHeader = headerStore.get('sec-ch-prefers-color-scheme')
	const preferDark = preferHeader === 'dark' ? true : preferHeader === 'light' ? false : null
	const serverTheme = await resolveServerTheme(preferDark)

	return (
		<html lang={locale} suppressHydrationWarning>
			<head>
				<ThemeScript />
				<ErrorGuardScript />
			</head>
			<body className={`${geistSans.variable} antialiased`}>
				{/*
				  Não aplicar className de tema no <html> via React — isso sobrescreve o ThemeScript na hidratação.
				*/}
				<ThemeProvider defaultTheme={serverTheme ?? 'light'}>
					<NextIntlClientProvider messages={messages}>
						<AppShell>{children}</AppShell>
					</NextIntlClientProvider>
				</ThemeProvider>
			</body>
		</html>
	)
}
