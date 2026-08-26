import { APP_NAME } from '@/constants/app'

export function defaultDocumentTitle(): string {
	return APP_NAME
}

export function documentTitleForPage(section?: string | null): string {
	const trimmed = section?.trim()
	return trimmed ? `${APP_NAME} - ${trimmed}` : APP_NAME
}

export function documentTitleForImage(imageTitle: string | null | undefined): string {
	return documentTitleForPage(imageTitle)
}
