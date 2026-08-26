/**
 * @jest-environment jsdom
 */
import { resolveCustomValidity } from '@/utils/inputValidity'

function makeValidity(partial: Partial<ValidityState>): ValidityState {
	return {
		valueMissing: false,
		typeMismatch: false,
		patternMismatch: false,
		tooShort: false,
		tooLong: false,
		rangeUnderflow: false,
		rangeOverflow: false,
		stepMismatch: false,
		badInput: false,
		customError: false,
		valid: true,
		...partial,
	}
}

describe('resolveCustomValidity', () => {
	it('prioriza valueMissing e typeMismatch com mensagens i18n', () => {
		expect(
			resolveCustomValidity(makeValidity({ valueMissing: true, valid: false }), {
				valueMissing: 'Informe o e-mail',
				typeMismatch: 'Informe um e-mail válido',
			})
		).toBe('Informe o e-mail')

		expect(
			resolveCustomValidity(makeValidity({ typeMismatch: true, valid: false }), {
				valueMissing: 'Informe o e-mail',
				typeMismatch: 'Informe um e-mail válido',
			})
		).toBe('Informe um e-mail válido')
	})
})
