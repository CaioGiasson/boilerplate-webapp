import { DEFAULT_USER_ROLE, isAdminRole, isUserRoleName, normalizeUserRole } from '@/constants/userRole'

describe('userRole', () => {
	it.each([
		['ADMIN', 'ADMIN'],
		['USER', 'USER'],
		[null, 'USER'],
		[undefined, 'USER'],
		['', 'USER'],
		['SUPERUSER', 'USER'],
		['admin', 'USER'],
	])('normaliza %p para %p', (input, expected) => {
		expect(normalizeUserRole(input)).toBe(expected)
	})

	it('identifica apenas ADMIN como admin', () => {
		expect(isAdminRole('ADMIN')).toBe(true)
		expect(isAdminRole('USER')).toBe(false)
		expect(isAdminRole(undefined)).toBe(false)
		expect(isAdminRole('admin')).toBe(false)
	})

	it('reconhece nomes válidos de papel e usa USER como padrão', () => {
		expect(isUserRoleName('ADMIN')).toBe(true)
		expect(isUserRoleName('ROOT')).toBe(false)
		expect(DEFAULT_USER_ROLE).toBe('USER')
	})
})
