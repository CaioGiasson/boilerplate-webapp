export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
export const PASSWORD_REQUIRED_CRITERIA = 3

export type PasswordPolicyIssue = 'minLength' | 'maxLength' | 'complexity'

export type PasswordCriteriaStatus = {
	minLength: boolean
	maxLength: boolean
	lowercase: boolean
	uppercase: boolean
	number: boolean
	symbol: boolean
	/** True quando ao menos 3 critérios da lista estão cumpridos. */
	complexityMet: boolean
	/** True quando tamanho mínimo/máximo e complexidade estão ok. */
	valid: boolean
}

/**
 * Avalia cada critério da política de senha (seguro para o client).
 */
export function evaluatePasswordCriteria(password: string): PasswordCriteriaStatus {
	const lowercase = /[a-z]/.test(password)
	const uppercase = /[A-Z]/.test(password)
	const number = /[0-9]/.test(password)
	const symbol = /[^A-Za-z0-9]/.test(password)
	const metCount = [lowercase, uppercase, number, symbol].filter(Boolean).length
	const minLength = password.length >= PASSWORD_MIN_LENGTH
	const maxLength = password.length <= PASSWORD_MAX_LENGTH
	const complexityMet = metCount >= PASSWORD_REQUIRED_CRITERIA

	return {
		minLength,
		maxLength,
		lowercase,
		uppercase,
		number,
		symbol,
		complexityMet,
		valid: minLength && maxLength && complexityMet,
	}
}

/**
 * Avalia a política de senha sem dependências de Node (seguro para o client).
 */
export function getPasswordPolicyIssue(password: string): PasswordPolicyIssue | null {
	const status = evaluatePasswordCriteria(password)

	if (!status.maxLength) {
		return 'maxLength'
	}

	if (!status.minLength) {
		return 'minLength'
	}

	if (!status.complexityMet) {
		return 'complexity'
	}

	return null
}

export function isPasswordPolicyValid(password: string): boolean {
	return evaluatePasswordCriteria(password).valid
}
