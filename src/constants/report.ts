export const REPORT_REASONS = ['spam', 'nudes_nonconsensual', 'csam', 'impersonation', 'other'] as const

export type ReportReason = (typeof REPORT_REASONS)[number]

export const REPORT_STATUSES = ['open', 'reviewing', 'closed'] as const

export type ReportStatus = (typeof REPORT_STATUSES)[number]

export const REPORT_DETAILS_MAX_LENGTH = 1000
