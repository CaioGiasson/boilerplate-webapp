import { hash, verify } from 'argon2'
import { ValidationError } from '@/errors'
import { getPasswordPolicyIssue } from '@/utils/passwordPolicy'

/**
 * Valida regras de senha: 8–128 caracteres e ao menos 3 classes
 * (minúsculas, maiúsculas, números, símbolos).
 */
export function assertPasswordPolicy(password: string): void {
	const issue = getPasswordPolicyIssue(password)

	if (issue === 'maxLength') {
		throw new ValidationError('Password must be at most 128 characters')
	}

	if (issue === 'minLength') {
		throw new ValidationError('Password must be at least 8 characters')
	}

	if (issue === 'complexity') {
		throw new ValidationError('Password must include at least 3 of: lowercase, uppercase, numbers, symbols')
	}
}

export async function hashPassword(password: string): Promise<string> {
	return hash(password)
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
	return verify(passwordHash, password)
}

/** Argon2id of a constant unused secret — equalize login timing when the account is missing. */
export const DUMMY_PASSWORD_HASH =
	'$argon2id$v=19$m=65536,t=3,p=4$z92gofAoKZ2eKtruqkXCRQ$ozVs+uhKvUK40Hoh5T9z3f+A9NtE2K9msdDpQxyH5Lo'

export async function verifyPasswordOrDummy(passwordHash: string | null, password: string): Promise<boolean> {
	return verifyPassword(passwordHash ?? DUMMY_PASSWORD_HASH, password)
}
