import { z } from 'zod'
import { Visibility } from '@/constants/visibility'

const visibilityEnum = z.enum([Visibility.PUBLIC, Visibility.PRIVATE, Visibility.SECRET, Visibility.PROTECTED])

/** Shared flags / visibility for create & import. */
export const imageVisibilityBodySchema = z
	.object({
		visibility: visibilityEnum.optional().nullable(),
		isPrivate: z.boolean().optional(),
		isSecret: z.boolean().optional(),
	})
	.passthrough()

export const createImageBodySchema = z
	.object({
		image: z.string().min(1),
		title: z.string().nullable().optional(),
		description: z.string().nullable().optional(),
		tags: z.union([z.array(z.string()), z.string()]).optional(),
	})
	.merge(imageVisibilityBodySchema)

export const importImageFromUrlBodySchema = z
	.object({
		url: z.string().min(1),
		title: z.string().nullable().optional(),
		description: z.string().nullable().optional(),
		tags: z.array(z.string()).optional(),
	})
	.merge(imageVisibilityBodySchema)

export const updateImageBodySchema = z
	.object({
		title: z.string().nullable().optional(),
		description: z.string().nullable().optional(),
		tags: z.array(z.string()).optional(),
	})
	.refine((data) => data.title !== undefined || data.description !== undefined || data.tags !== undefined, {
		message: 'Title, description or tags is required',
	})

export const setImageVisibilityBodySchema = z
	.object({
		visibility: visibilityEnum.optional().nullable(),
		isPrivate: z.boolean().optional(),
		isSecret: z.boolean().optional(),
	})
	.refine(
		(data) =>
			(data.visibility !== undefined && data.visibility !== null) ||
			typeof data.isPrivate === 'boolean' ||
			typeof data.isSecret === 'boolean',
		{ message: 'Visibility is required' }
	)

export const uploadPhotoBodySchema = z.object({
	image: z.string().min(1),
})

export function normalizeTagsInput(tags: string[] | string | undefined): string[] {
	if (tags === undefined) return []
	if (Array.isArray(tags)) return tags
	return tags
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean)
}
