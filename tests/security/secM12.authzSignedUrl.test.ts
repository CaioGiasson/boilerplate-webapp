/**
 * SEC-M12 — regression lock for authz-before-presign and visibility matrix.
 * Full coverage lives in getImageById / listImages / imageVisibility / StorageUrl suites;
 * this file asserts the cross-cutting contract that must not regress after SEC-C01.
 */
import { canViewImage, listVisibilitiesForMine } from '@/policies/imageVisibility'
import { Visibility } from '@/constants/visibility'
import { STORAGE_PRESIGN_TTL_PRIVATE_SECONDS, STORAGE_PRESIGN_TTL_PUBLIC_SECONDS } from '@/constants/storageAccess'

describe('SEC-M12 authz / signed URL contract', () => {
	it('visibility matrix: owner PRIVATE/SECRET; stranger and anonymous denied', () => {
		const owner = 'owner-a'
		const stranger = 'user-b'

		expect(
			canViewImage({
				visibility: Visibility.PRIVATE,
				ownerId: owner,
				viewerUserId: owner,
				showSecretImages: false,
			})
		).toBe(true)
		expect(
			canViewImage({
				visibility: Visibility.SECRET,
				ownerId: owner,
				viewerUserId: owner,
				showSecretImages: true,
			})
		).toBe(true)
		expect(
			canViewImage({
				visibility: Visibility.PRIVATE,
				ownerId: owner,
				viewerUserId: stranger,
				showSecretImages: true,
			})
		).toBe(false)
		expect(
			canViewImage({
				visibility: Visibility.SECRET,
				ownerId: owner,
				viewerUserId: stranger,
				showSecretImages: true,
			})
		).toBe(false)
		expect(
			canViewImage({
				visibility: Visibility.PRIVATE,
				ownerId: owner,
				showSecretImages: false,
			})
		).toBe(false)
		expect(
			canViewImage({
				visibility: Visibility.PUBLIC,
				ownerId: owner,
				showSecretImages: false,
			})
		).toBe(true)
	})

	it('listVisibilitiesForMine never exposes SECRET without the setting; public scope is PUBLIC-only', () => {
		expect(listVisibilitiesForMine(false)).toEqual([Visibility.PUBLIC, Visibility.PRIVATE])
		expect(listVisibilitiesForMine(true)).toEqual([Visibility.PUBLIC, Visibility.PRIVATE, Visibility.SECRET])
		expect(listVisibilitiesForMine(false)).not.toContain(Visibility.SECRET)
		expect(listVisibilitiesForMine(true)).not.toContain(Visibility.PROTECTED)
	})

	it('private TTL is shorter than public TTL (limits signed URL leakage window)', () => {
		expect(STORAGE_PRESIGN_TTL_PRIVATE_SECONDS).toBeLessThan(STORAGE_PRESIGN_TTL_PUBLIC_SECONDS)
		expect(STORAGE_PRESIGN_TTL_PRIVATE_SECONDS).toBe(15 * 60)
		expect(STORAGE_PRESIGN_TTL_PUBLIC_SECONDS).toBe(60 * 60)
	})
})
