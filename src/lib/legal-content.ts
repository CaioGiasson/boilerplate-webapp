import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { DEFAULT_LOCALE, locales, type AppLocale } from '@/constants/texts'

export type LegalDocumentKind = 'privacy' | 'terms'

function resolveLegalLocale(locale: string): AppLocale {
	return (locales as readonly string[]).includes(locale) ? (locale as AppLocale) : DEFAULT_LOCALE
}

export async function readLegalMarkdown(kind: LegalDocumentKind, locale: string): Promise<string> {
	const resolved = resolveLegalLocale(locale)
	const directory = path.join(process.cwd(), 'content', 'legal')
	const localizedPath = path.join(directory, `${kind}.${resolved}.md`)

	try {
		return await readFile(localizedPath, 'utf8')
	} catch {
		if (resolved === DEFAULT_LOCALE) {
			throw new Error(`Missing legal document: ${kind}.${DEFAULT_LOCALE}.md`)
		}
		return readFile(path.join(directory, `${kind}.${DEFAULT_LOCALE}.md`), 'utf8')
	}
}
