import { evaluatePasswordCriteria, getPasswordPolicyIssue } from '@/utils/passwordPolicy'
import { assertPasswordPolicy } from '@/utils/password'
import { ValidationError } from '@/errors'

describe('password policy', () => {
	it('aceita senha com 3 classes e 8+ chars', () => {
		expect(getPasswordPolicyIssue('Abcdef12')).toBeNull()
		expect(() => assertPasswordPolicy('Abcdef12')).not.toThrow()
	})

	it('rejeita senha curta', () => {
		expect(getPasswordPolicyIssue('Ab1!')).toBe('minLength')
		expect(() => assertPasswordPolicy('Ab1!')).toThrow(ValidationError)
	})

	it('rejeita senha com poucas classes', () => {
		expect(getPasswordPolicyIssue('abcdefgh')).toBe('complexity')
		expect(() => assertPasswordPolicy('abcdefgh')).toThrow(ValidationError)
	})

	it('marca complexityMet com 3 critérios', () => {
		expect(evaluatePasswordCriteria('Abcdef12').complexityMet).toBe(true)
		expect(evaluatePasswordCriteria('Abcdef12').valid).toBe(true)
		expect(evaluatePasswordCriteria('abcdef1!').complexityMet).toBe(true)
		expect(evaluatePasswordCriteria('abcdefg').complexityMet).toBe(false)
	})

	it('rejeita senha acima de 128 caracteres', () => {
		const tooLong = `${'A'.repeat(200)}b1!`
		expect(getPasswordPolicyIssue(tooLong)).toBe('maxLength')
		expect(() => assertPasswordPolicy(tooLong)).toThrow(ValidationError)
		expect(evaluatePasswordCriteria(tooLong).valid).toBe(false)
	})

	it('aceita senha de 128 caracteres válida', () => {
		const maxValid = `Ab1${'a'.repeat(125)}`
		expect(maxValid).toHaveLength(128)
		expect(getPasswordPolicyIssue(maxValid)).toBeNull()
		expect(() => assertPasswordPolicy(maxValid)).not.toThrow()
	})
})
