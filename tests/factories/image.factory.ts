import type { ImageEntity } from '@/repositories/Image.repository'
import { Visibility } from '@/constants/visibility'

export type ImageFactoryOverrides = Partial<ImageEntity>

const DEFAULT_DATE = new Date('2026-08-19T00:00:00.000Z')
export const DEFAULT_IMAGE_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa'
export const DEFAULT_CANONICAL_URL = 'https://vitraux.nyc3.digitaloceanspaces.com/owner-1/images/abc.jpg'

export function buildImage(overrides: ImageFactoryOverrides = {}): ImageEntity {
	return {
		id: DEFAULT_IMAGE_ID,
		ownerId: 'owner-1',
		url: DEFAULT_CANONICAL_URL,
		title: 'Title',
		description: 'Desc',
		tags: ['tag'],
		fileId: null,
		visibility: Visibility.PUBLIC,
		createdAt: DEFAULT_DATE,
		updatedAt: DEFAULT_DATE,
		deletedAt: null,
		...overrides,
	}
}
