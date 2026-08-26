export type ValidityMessageMap = {
	valueMissing?: string
	typeMismatch?: string
	patternMismatch?: string
	tooShort?: string
	tooLong?: string
	rangeUnderflow?: string
	rangeOverflow?: string
	stepMismatch?: string
	badInput?: string
}

/**
 * Resolve mensagem i18n para o estado de ValidityState do input.
 * Retorna string vazia quando não há mismatch conhecido (mantém default só se nada for mapeado).
 */
export function resolveCustomValidity(validity: ValidityState, messages: ValidityMessageMap): string {
	if (validity.valueMissing && messages.valueMissing) {
		return messages.valueMissing
	}
	if (validity.typeMismatch && messages.typeMismatch) {
		return messages.typeMismatch
	}
	if (validity.patternMismatch && messages.patternMismatch) {
		return messages.patternMismatch
	}
	if (validity.tooShort && messages.tooShort) {
		return messages.tooShort
	}
	if (validity.tooLong && messages.tooLong) {
		return messages.tooLong
	}
	if (validity.rangeUnderflow && messages.rangeUnderflow) {
		return messages.rangeUnderflow
	}
	if (validity.rangeOverflow && messages.rangeOverflow) {
		return messages.rangeOverflow
	}
	if (validity.stepMismatch && messages.stepMismatch) {
		return messages.stepMismatch
	}
	if (validity.badInput && messages.badInput) {
		return messages.badInput
	}

	return messages.valueMissing ?? messages.typeMismatch ?? ''
}

export function applyCustomValidity(
	input: HTMLInputElement | HTMLTextAreaElement,
	messages: ValidityMessageMap | undefined
): void {
	if (!messages) {
		input.setCustomValidity('')
		return
	}

	input.setCustomValidity(resolveCustomValidity(input.validity, messages))
}
