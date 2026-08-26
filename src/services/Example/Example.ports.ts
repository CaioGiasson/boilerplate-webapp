export type ExampleRawData = {
	id: string
	created_at: string
	value: string
}

export type ExampleEntity = {
	id: string
	identifier: string
	random: string
	createdAt: Date
	deletedAt: Date | null
}
