import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { NotificationsPageClient } from '@/components/notifications/NotificationsPageClient'
import { buildDocumentMetadata } from '@/lib/build-document-metadata'

type NotificationsPageProps = {
	params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: NotificationsPageProps): Promise<Metadata> {
	const { locale } = await params
	return buildDocumentMetadata(locale, 'notifications')
}

export default async function NotificationsPage({ params }: NotificationsPageProps) {
	const { locale } = await params
	setRequestLocale(locale)

	return <NotificationsPageClient />
}
