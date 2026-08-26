import { ForbiddenError, ValidationError } from '@/errors'
import { Visibility, type Visibility as VisibilityValue } from '@/constants/visibility'

export type ImageViewContext = {
	visibility: VisibilityValue
	ownerId: string
	viewerUserId?: string
	showSecretImages: boolean
}

export function visibilityFromFlags(isPrivate: boolean, isSecret: boolean): VisibilityValue {
	if (isSecret) return Visibility.SECRET
	if (isPrivate) return Visibility.PRIVATE
	return Visibility.PUBLIC
}

export function nextVisibilityFromFlags(
	current: VisibilityValue,
	isPrivate: boolean,
	isSecret: boolean
): VisibilityValue {
	if (current === Visibility.PROTECTED) {
		return Visibility.PROTECTED
	}
	if (current === Visibility.SECRET) {
		if (isSecret) return Visibility.SECRET
		return isPrivate ? Visibility.PRIVATE : Visibility.PUBLIC
	}
	if (isSecret) return Visibility.SECRET
	return isPrivate ? Visibility.PRIVATE : Visibility.PUBLIC
}

export function listVisibilitiesForMine(showSecretImages: boolean): VisibilityValue[] {
	const visibilities: VisibilityValue[] = [Visibility.PUBLIC, Visibility.PRIVATE]
	if (showSecretImages) {
		visibilities.push(Visibility.SECRET)
	}
	return visibilities
}

export function canViewImage(context: ImageViewContext): boolean {
	if (context.visibility === Visibility.PROTECTED) {
		return false
	}
	if (context.visibility === Visibility.PUBLIC) {
		return true
	}
	if (context.viewerUserId !== context.ownerId) {
		return false
	}
	if (context.visibility === Visibility.PRIVATE) {
		return true
	}
	if (context.visibility === Visibility.SECRET) {
		return context.showSecretImages
	}
	return false
}

export function assertCreatableVisibility(visibility: VisibilityValue, showSecretImages: boolean): void {
	if (visibility === Visibility.PROTECTED) {
		throw new ValidationError('Protected visibility cannot be set')
	}
	if (visibility === Visibility.SECRET && !showSecretImages) {
		throw new ForbiddenError('Secret images are disabled')
	}
}

export function assertSettableVisibility(
	current: VisibilityValue,
	target: VisibilityValue,
	showSecretImages: boolean
): void {
	if (current === Visibility.PROTECTED) {
		throw new ForbiddenError('Protected image visibility cannot be changed')
	}
	if (target === Visibility.PROTECTED) {
		throw new ValidationError('Protected visibility cannot be set')
	}
	if (target === Visibility.SECRET && !showSecretImages) {
		throw new ForbiddenError('Secret images are disabled')
	}
}
