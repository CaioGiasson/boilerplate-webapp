import { getTranslations } from 'next-intl/server'
import { LEGAL_VERSIONS } from '@/constants/legal'
import { LegalMarkdown } from '@/components/legal/LegalMarkdown'
import { readLegalMarkdown, type LegalDocumentKind } from '@/lib/legal-content'

type LegalPageContentProps = {
	kind: LegalDocumentKind
	locale: string
}

export async function LegalPageContent({ kind, locale }: LegalPageContentProps) {
	const t = await getTranslations({ locale, namespace: 'legal' })
	const markdown = await readLegalMarkdown(kind, locale)
	const version = kind === 'privacy' ? LEGAL_VERSIONS.privacy : LEGAL_VERSIONS.terms

	return (
		<div className="mx-auto w-full max-w-2xl space-y-4 p-4 sm:p-6" data-testid={`${kind}-page`}>
			<p className="text-xs text-muted-foreground">{t('versionLabel', { version })}</p>
			<LegalMarkdown source={markdown} />
		</div>
	)
}
