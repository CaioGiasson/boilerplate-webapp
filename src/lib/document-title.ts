const APP_NAME = 'Vitraux'

export function defaultDocumentTitle(): string {
	return APP_NAME
}

export function documentTitleForPage(section?: string | null): string {
	const trimmed = section?.trim()
	return trimmed ? `${APP_NAME} - ${trimmed}` : APP_NAME
}

/** Same format as page titles: `Vitraux - {image title}` when present. */
export function documentTitleForImage(imageTitle: string | null | undefined): string {
	return documentTitleForPage(imageTitle)
}
