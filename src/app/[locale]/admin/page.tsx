import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { AdminPageClient } from '@/components/admin/AdminPageClient'
import { buildDocumentMetadata } from '@/lib/build-document-metadata'

type AdminPageProps = {
	params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: AdminPageProps): Promise<Metadata> {
	const { locale } = await params
	return buildDocumentMetadata(locale, 'admin')
}

export default async function AdminPage({ params }: AdminPageProps) {
	const { locale } = await params
	setRequestLocale(locale)

	return <AdminPageClient />
}
