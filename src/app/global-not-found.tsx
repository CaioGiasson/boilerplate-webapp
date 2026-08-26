import { Geist } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { ThemeScript } from '@/components/theme-script'
import { DEFAULT_LOCALE } from '@/constants/texts'
import pt from '@/constants/texts/pt'

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
	display: 'swap',
})

/**
 * 404 global com documento HTML completo.
 * Necessário porque o root layout é pass-through (sem html/body).
 */
export default function GlobalNotFound() {
	const t = pt.notFound

	return (
		<html lang={DEFAULT_LOCALE} suppressHydrationWarning>
			<head>
				<ThemeScript />
			</head>
			<body className={`${geistSans.variable} antialiased`}>
				<main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-foreground">
					<h1 className="text-3xl font-semibold">{t.title}</h1>
					<p className="text-muted-foreground">{t.description}</p>
					<Link href={`/${DEFAULT_LOCALE}`} className="text-primary underline-offset-4 hover:underline">
						{t.backHome}
					</Link>
				</main>
			</body>
		</html>
	)
}
