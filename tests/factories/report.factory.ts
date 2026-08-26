import type { ReportEntity } from '@/repositories/Report.repository'

export type ReportFactoryOverrides = Partial<ReportEntity>

const DEFAULT_DATE = new Date('2026-08-19T00:00:00.000Z')

export function buildReport(overrides: ReportFactoryOverrides = {}): ReportEntity {
	return {
		id: 'report-1',
		imageId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
		reporterId: 'user-1',
		reason: 'spam',
		details: null,
		status: 'open',
		createdAt: DEFAULT_DATE,
		...overrides,
	}
}
