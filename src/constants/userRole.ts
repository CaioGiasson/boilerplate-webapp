export const USER_ROLES = ['USER', 'ADMIN'] as const

export type UserRoleName = (typeof USER_ROLES)[number]

export const DEFAULT_USER_ROLE: UserRoleName = 'USER'

export function isUserRoleName(value: string): value is UserRoleName {
	return (USER_ROLES as readonly string[]).includes(value)
}

/** Conta anterior ao campo `role` (ausente/nulo) e valores desconhecidos contam como `USER`. */
export function normalizeUserRole(value: string | null | undefined): UserRoleName {
	return value && isUserRoleName(value) ? value : DEFAULT_USER_ROLE
}

export function isAdminRole(role: string | null | undefined): boolean {
	return normalizeUserRole(role) === 'ADMIN'
}
