import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { LegalPageContent } from '@/components/legal/LegalPageContent'
import { documentTitleForPage } from '@/lib/document-title'

type PrivacyPageProps = {
	params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: 'legal' })
	return {
		title: documentTitleForPage(t('privacyTitle')),
		description: t('privacyMetaDescription'),
	}
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
	const { locale } = await params
	setRequestLocale(locale)

	return <LegalPageContent kind="privacy" locale={locale} />
}
