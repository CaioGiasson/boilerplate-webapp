import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { LegalPageContent } from '@/components/legal/LegalPageContent'
import { documentTitleForPage } from '@/lib/document-title'

type TermsPageProps = {
	params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: TermsPageProps): Promise<Metadata> {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: 'legal' })
	return {
		title: documentTitleForPage(t('termsTitle')),
		description: t('termsMetaDescription'),
	}
}

export default async function TermsPage({ params }: TermsPageProps) {
	const { locale } = await params
	setRequestLocale(locale)

	return <LegalPageContent kind="terms" locale={locale} />
}
