import { ForbiddenError } from '@/errors'
import { isAdminRole } from '@/constants/userRole'

/** Exige conta ativa com papel ADMIN. A checagem fica no use case: o cliente sozinho não é controle de acesso. */
export function assertAdmin(user: { role: string | null | undefined } | null): void {
	if (!user || !isAdminRole(user.role)) {
		throw new ForbiddenError('Admin role is required')
	}
}
