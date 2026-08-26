import { ValidationError } from '@/errors'
import { isVisibility, type Visibility } from '@/constants/visibility'
import { nextVisibilityFromFlags, visibilityFromFlags } from '@/policies/imageVisibility'

export function parseVisibilityValue(value: unknown): Visibility {
	if (!isVisibility(value)) {
		throw new ValidationError('Invalid visibility')
	}
	return value
}

export function parseCreateVisibility(body: {
	visibility?: unknown
	isPrivate?: unknown
	isSecret?: unknown
}): Visibility | undefined {
	if (body.visibility !== undefined && body.visibility !== null) {
		return parseVisibilityValue(body.visibility)
	}
	if (typeof body.isPrivate === 'boolean' || typeof body.isSecret === 'boolean') {
		return visibilityFromFlags(Boolean(body.isPrivate), Boolean(body.isSecret))
	}
	return undefined
}

export function parseSetVisibilityFromFlags(
	current: Visibility,
	body: {
		isPrivate?: unknown
		isSecret?: unknown
	}
): Visibility {
	return nextVisibilityFromFlags(current, Boolean(body.isPrivate), Boolean(body.isSecret))
}
