import {
	assertCreatableVisibility,
	assertSettableVisibility,
	canViewImage,
	listVisibilitiesForMine,
	nextVisibilityFromFlags,
	visibilityFromFlags,
} from '@/policies/imageVisibility'
import { Visibility } from '@/constants/visibility'
import { ForbiddenError, ValidationError } from '@/errors'

describe('imageVisibility policy', () => {
	it('resolve flags para o enum', () => {
		expect(visibilityFromFlags(false, false)).toBe(Visibility.PUBLIC)
		expect(visibilityFromFlags(true, false)).toBe(Visibility.PRIVATE)
		expect(visibilityFromFlags(true, true)).toBe(Visibility.SECRET)
	})

	it('downgrade de SECRET consulta isPrivate', () => {
		expect(nextVisibilityFromFlags(Visibility.SECRET, true, false)).toBe(Visibility.PRIVATE)
		expect(nextVisibilityFromFlags(Visibility.SECRET, false, false)).toBe(Visibility.PUBLIC)
		expect(nextVisibilityFromFlags(Visibility.PROTECTED, true, true)).toBe(Visibility.PROTECTED)
	})

	it('visitante só vê PUBLIC', () => {
		expect(
			canViewImage({
				visibility: Visibility.PUBLIC,
				ownerId: 'owner',
				showSecretImages: false,
			})
		).toBe(true)
		expect(
			canViewImage({
				visibility: Visibility.PRIVATE,
				ownerId: 'owner',
				showSecretImages: false,
			})
		).toBe(false)
		expect(
			canViewImage({
				visibility: Visibility.SECRET,
				ownerId: 'owner',
				showSecretImages: true,
			})
		).toBe(false)
	})

	it('dono vê PRIVATE e SECRET só com a setting', () => {
		expect(
			canViewImage({
				visibility: Visibility.PRIVATE,
				ownerId: 'owner',
				viewerUserId: 'owner',
				showSecretImages: false,
			})
		).toBe(true)
		expect(
			canViewImage({
				visibility: Visibility.SECRET,
				ownerId: 'owner',
				viewerUserId: 'owner',
				showSecretImages: false,
			})
		).toBe(false)
		expect(
			canViewImage({
				visibility: Visibility.SECRET,
				ownerId: 'owner',
				viewerUserId: 'owner',
				showSecretImages: true,
			})
		).toBe(true)
		expect(
			canViewImage({
				visibility: Visibility.PRIVATE,
				ownerId: 'owner',
				viewerUserId: 'other',
				showSecretImages: true,
			})
		).toBe(false)
		expect(
			canViewImage({
				visibility: Visibility.PROTECTED,
				ownerId: 'owner',
				viewerUserId: 'owner',
				showSecretImages: true,
			})
		).toBe(false)
	})

	it('listVisibilitiesForMine inclui SECRET só com a setting', () => {
		expect(listVisibilitiesForMine(false)).toEqual([Visibility.PUBLIC, Visibility.PRIVATE])
		expect(listVisibilitiesForMine(true)).toEqual([Visibility.PUBLIC, Visibility.PRIVATE, Visibility.SECRET])
	})

	it('rejeita SECRET sem setting e PROTECTED', () => {
		expect(() => assertCreatableVisibility(Visibility.SECRET, false)).toThrow(ForbiddenError)
		expect(() => assertCreatableVisibility(Visibility.PROTECTED, true)).toThrow(ValidationError)
		expect(() => assertSettableVisibility(Visibility.PROTECTED, Visibility.PUBLIC, true)).toThrow(ForbiddenError)
		expect(() => assertSettableVisibility(Visibility.PUBLIC, Visibility.PROTECTED, true)).toThrow(ValidationError)
	})
})
