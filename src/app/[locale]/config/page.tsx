import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { GeneralSettingsForm } from '@/components/settings/GeneralSettingsForm'
import { buildDocumentMetadata } from '@/lib/build-document-metadata'

type ConfigPageProps = {
	params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: ConfigPageProps): Promise<Metadata> {
	const { locale } = await params
	return buildDocumentMetadata(locale, 'settings')
}

export default async function ConfigPage({ params }: ConfigPageProps) {
	const { locale } = await params
	setRequestLocale(locale)

	return <GeneralSettingsForm />
}
