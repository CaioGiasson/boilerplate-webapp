/**
 * Política de senha para scripts de operador (CommonJS, sem TypeScript).
 * Espelha `src/utils/passwordPolicy.ts`; `tests/scripts/passwordPolicy.test.ts` compara os dois.
 */
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128
const PASSWORD_REQUIRED_CRITERIA = 3

/**
 * @param {string} password
 * @returns {'minLength' | 'maxLength' | 'complexity' | null}
 */
function passwordPolicyIssue(password) {
	if (password.length > PASSWORD_MAX_LENGTH) return 'maxLength'
	if (password.length < PASSWORD_MIN_LENGTH) return 'minLength'
	const criteriaMet = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length
	if (criteriaMet < PASSWORD_REQUIRED_CRITERIA) return 'complexity'
	return null
}

module.exports = { passwordPolicyIssue, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_REQUIRED_CRITERIA }
