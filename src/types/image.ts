import type { Visibility } from '@/constants/visibility'

export type ImageVisibility = Visibility

export type Image = {
	id: string
	url: string
	title: string
	description: string
	tags: string[]
	isOwner?: boolean
	visibility?: Visibility
}
