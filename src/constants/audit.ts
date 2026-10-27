/**
 * Ações registradas no audit log (`AuditEvent`). Nome estável: vira dado persistido e filtro da API.
 * Acrescentar uma ação = acrescentar aqui, nos três catálogos (`admin.auditAction.*`) e em `docs/operators/audit-log.md`.
 */
export const AUDIT_ACTIONS = [
	'admin.impersonation_token_created',
	'auth.impersonation_started',
	'user.password_changed',
	'user.password_reset',
	'user.email_changed',
	'user.sessions_revoked_others',
	'user.account_deletion_requested',
	'user.account_deletion_cancelled',
	'user.account_deletion_kept',
	'operator.role_changed',
	'operator.password_changed',
	'operator.feature_flag_toggled',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

/** Quem agiu: o próprio usuário, um admin, um operador via CLI ou o sistema (jobs). */
export const AUDIT_ACTOR_TYPES = ['user', 'admin', 'operator', 'system'] as const

export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number]

export const AUDIT_RETENTION_DAYS_DEFAULT = 365

export function isAuditAction(value: string): value is AuditAction {
	return (AUDIT_ACTIONS as readonly string[]).includes(value)
}
