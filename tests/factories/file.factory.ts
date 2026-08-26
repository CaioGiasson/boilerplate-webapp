import { FileStatus } from '@prisma/client'

export type FileFactoryRecord = {
	id: string
	key: string
	url: string
	category: string
	mimeType: string
	sizeBytes: number
	status: FileStatus
	ownerId: string | null
	createdAt: Date
	updatedAt: Date
}

export type FileFactoryOverrides = Partial<FileFactoryRecord>

const DEFAULT_DATE = new Date('2026-08-19T00:00:00.000Z')

/**
 * Minimal File row for unit tests (Prisma shape used by FileRepository / mocks).
 */
export function buildFile(overrides: FileFactoryOverrides = {}): FileFactoryRecord {
	const ownerId = overrides.ownerId === undefined ? 'owner-1' : overrides.ownerId
	const key = overrides.key ?? `${ownerId ?? 'anon'}/images/abc.jpg`
	return {
		id: 'file-1',
		key,
		url: `https://app.nyc3.digitaloceanspaces.com/${key}`,
		category: 'images',
		mimeType: 'image/jpeg',
		sizeBytes: 1024,
		status: FileStatus.published,
		ownerId,
		createdAt: DEFAULT_DATE,
		updatedAt: DEFAULT_DATE,
		...overrides,
	}
}
