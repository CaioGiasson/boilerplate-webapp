import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { documentTitleForPage } from '@/lib/document-title'

export type DocumentTitleKey = 'profile' | 'settings' | 'dsComponents' | 'privacy' | 'terms'

export async function buildDocumentMetadata(locale: string, key?: DocumentTitleKey): Promise<Metadata> {
	if (!key) {
		return { title: documentTitleForPage() }
	}
	const t = await getTranslations({ locale, namespace: 'documentTitle' })
	return { title: documentTitleForPage(t(key)) }
}
