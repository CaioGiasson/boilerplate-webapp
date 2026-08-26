import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Title } from '@/design-system'

/**
 * 404 dentro de um locale válido (compõe com o layout de `[locale]`).
 */
export default async function LocaleNotFound() {
	const locale = await getLocale()
	setRequestLocale(locale)
	const t = await getTranslations('notFound')

	return (
		<main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
			<Title as="h1">{t('title')}</Title>
			<p className="text-muted-foreground">{t('description')}</p>
			<Link href="/" className="text-primary underline-offset-4 hover:underline">
				{t('backHome')}
			</Link>
		</main>
	)
}
