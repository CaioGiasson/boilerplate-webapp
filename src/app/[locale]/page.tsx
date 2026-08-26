import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { HomePageClient } from '@/components/home/HomePageClient'
import { buildDocumentMetadata } from '@/lib/build-document-metadata'

type HomePageProps = {
	params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
	const { locale } = await params
	return buildDocumentMetadata(locale)
}

export default async function HomePage({ params }: HomePageProps) {
	const { locale } = await params
	setRequestLocale(locale)

	return <HomePageClient />
}
