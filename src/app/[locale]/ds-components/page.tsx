import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { DsComponentsPageClient } from '@/components/ds-catalog/DsComponentsPageClient'
import { buildDocumentMetadata } from '@/lib/build-document-metadata'

type DsComponentsPageProps = {
	params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: DsComponentsPageProps): Promise<Metadata> {
	const { locale } = await params
	return buildDocumentMetadata(locale, 'dsComponents')
}

export default async function DsComponentsPage({ params }: DsComponentsPageProps) {
	const { locale } = await params
	setRequestLocale(locale)

	return <DsComponentsPageClient />
}
