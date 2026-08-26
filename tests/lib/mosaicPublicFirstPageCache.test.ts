import {
	isPublicMosaicFirstPageCacheable,
	revivePublicMosaicImages,
	serializePublicMosaicImages,
} from '@/lib/mosaicPublicFirstPageCache'
import { Visibility } from '@/constants/visibility'

describe('mosaicPublicFirstPageCache', () => {
	it('is cacheable only for unfiltered public first page', () => {
		expect(
			isPublicMosaicFirstPageCacheable({
				scope: 'all',
			})
		).toBe(true)
		expect(
			isPublicMosaicFirstPageCacheable({
				scope: 'all',
				q: 'x',
			})
		).toBe(false)
		expect(
			isPublicMosaicFirstPageCacheable({
				scope: 'mine',
			})
		).toBe(false)
		expect(
			isPublicMosaicFirstPageCacheable({
				scope: 'all',
				cursor: '2026-01-01T00:00:00.000Z|abc',
			})
		).toBe(false)
	})

	it('round-trips image dates through serialize/revive', () => {
		const createdAt = new Date('2026-08-19T00:00:00.000Z')
		const serialized = serializePublicMosaicImages([
			{
				id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
				ownerId: 'owner-1',
				url: 'https://example.com/a.jpg',
				title: 't',
				description: null,
				tags: [],
				fileId: null,
				visibility: Visibility.PUBLIC,
				createdAt,
				updatedAt: createdAt,
				deletedAt: null,
			},
		])
		const revived = revivePublicMosaicImages(serialized)
		expect(revived[0]?.createdAt.toISOString()).toBe(createdAt.toISOString())
		expect(revived[0]?.ownerId).toBe('owner-1')
	})
})
