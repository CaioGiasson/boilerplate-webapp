import type { Image } from '@/types/image'
import type { Visibility } from '@/constants/visibility'
import { ApiClientError, fetchApi, parseApiResponse } from '@/lib/api-error'
import type { ReportReason } from '@/constants/report'

export { ApiClientError } from '@/lib/api-error'

async function parseApi<T>(response: Response): Promise<T> {
	return parseApiResponse<T>(response)
}

export type ImageListScope = 'all' | 'mine'

export type ImageRecord = {
	id: string
	ownerId: string
	url: string
	title: string | null
	description: string | null
	tags: string[]
	fileId: string | null
	visibility?: Visibility
	createdAt: string
	updatedAt: string
	deletedAt: string | null
}

export async function listImagesRequest(
	params?: {
		scope?: ImageListScope
		q?: string
		tags?: string[]
		cursor?: string
	},
	signal?: AbortSignal
): Promise<{ images?: ImageRecord[]; mosaic: Image[]; nextCursor?: string | null }> {
	const search = new URLSearchParams()
	if (params?.scope) search.set('scope', params.scope)
	if (params?.q?.trim()) search.set('q', params.q.trim())
	if (params?.tags?.length) search.set('tags', params.tags.join(','))
	if (params?.cursor) search.set('cursor', params.cursor)
	const query = search.toString()
	const response = await fetchApi(`/api/v1/images${query ? `?${query}` : ''}`, {
		credentials: 'include',
		signal,
	})
	return parseApi(response)
}

export async function getImageByIdRequest(imageId: string, signal?: AbortSignal): Promise<Image> {
	const response = await fetchApi(`/api/v1/images/${encodeURIComponent(imageId)}`, {
		credentials: 'include',
		signal,
	})
	const data = await parseApi<{ mosaic: Image }>(response)
	return data.mosaic
}

export async function listImageTagsRequest(params?: { scope?: ImageListScope }): Promise<string[]> {
	const search = new URLSearchParams()
	if (params?.scope) search.set('scope', params.scope)
	const query = search.toString()
	const response = await fetchApi(`/api/v1/images/tags${query ? `?${query}` : ''}`, {
		credentials: 'include',
	})
	const data = await parseApi<{ tags: string[] }>(response)
	return data.tags
}

export async function createImageRequest(input: {
	image: string
	title?: string
	description?: string
	tags?: string[]
	visibility?: Exclude<Visibility, 'PROTECTED'>
	isPrivate?: boolean
	isSecret?: boolean
}): Promise<{ image: ImageRecord; mosaic: Image }> {
	const response = await fetchApi('/api/v1/images', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	return parseApi(response)
}

export async function createImageFromUrlRequest(input: {
	url: string
	title?: string
	description?: string
	tags?: string[]
	visibility?: Exclude<Visibility, 'PROTECTED'>
	isPrivate?: boolean
	isSecret?: boolean
}): Promise<{ image: ImageRecord; mosaic: Image }> {
	const response = await fetchApi('/api/v1/images/from-url', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	return parseApi(response)
}

export async function updateImageRequest(
	imageId: string,
	input: { title?: string | null; description?: string | null; tags?: string[] }
): Promise<{ mosaic: Image }> {
	const response = await fetchApi(`/api/v1/images/${encodeURIComponent(imageId)}`, {
		method: 'PATCH',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	return parseApi(response)
}

export async function setImageVisibilityRequest(
	imageId: string,
	visibility: Exclude<Visibility, 'PROTECTED'>
): Promise<{ mosaic: Image }> {
	const response = await fetchApi(`/api/v1/images/${encodeURIComponent(imageId)}/visibility`, {
		method: 'PATCH',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ visibility }),
	})
	return parseApi(response)
}

export async function deleteImageRequest(imageId: string): Promise<{ ok: true }> {
	const response = await fetchApi(`/api/v1/images/${encodeURIComponent(imageId)}`, {
		method: 'DELETE',
		credentials: 'include',
	})
	return parseApi(response)
}

export async function reportImageRequest(
	imageId: string,
	input: { reason: ReportReason; details?: string }
): Promise<{
	report: {
		id: string
		imageId: string
		reason: ReportReason
		status: string
		createdAt: string
	}
}> {
	const response = await fetchApi(`/api/v1/images/${encodeURIComponent(imageId)}/report`, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	return parseApi(response)
}
