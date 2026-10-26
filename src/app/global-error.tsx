'use client'

import * as React from 'react'
import { Geist } from 'next/font/google'
import './globals.css'
import { AppErrorScreen } from '@/components/errors/AppErrorScreen'
import { ErrorGuardScript } from '@/components/errors/ErrorGuardScript'
import { ThemeScript } from '@/components/theme-script'
import { DEFAULT_LOCALE, messagesByLocale, type AppLocale } from '@/constants/texts'
import { appErrorMessageForLocale, resolveAppErrorLocale } from '@/lib/errors/appErrorCopy'
import CookiesManager, { COOKIE_KEYS } from '@/managers/Cookies.manager'

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
	display: 'swap',
})

type GlobalErrorProps = {
	error: Error & { digest?: string }
	reset: () => void
}

/**
 * Substitui a tela padrão do Next.js quando o layout raiz falha (ele é pass-through, sem html/body).
 * Fora do `NextIntlClientProvider`: o texto vem direto dos catálogos.
 */
export default function GlobalError({ reset }: GlobalErrorProps) {
	const [locale, setLocale] = React.useState<AppLocale>(DEFAULT_LOCALE)

	React.useLayoutEffect(() => {
		setLocale(
			resolveAppErrorLocale({
				cookieLocale: CookiesManager.get(COOKIE_KEYS.LOCALE),
				pathname: window.location.pathname,
			})
		)
	}, [])

	return (
		<html lang={locale} suppressHydrationWarning>
			<head>
				<ThemeScript />
				<ErrorGuardScript />
			</head>
			<body className={`${geistSans.variable} antialiased`}>
				<AppErrorScreen
					message={appErrorMessageForLocale(locale)}
					retryLabel={messagesByLocale[locale].error.retry}
					onRetry={reset}
				/>
			</body>
		</html>
	)
}
