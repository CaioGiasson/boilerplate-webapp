'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { EMAIL_CODE_LENGTH, normalizeEmailToken } from '@/utils/emailCode'

export type CodeInputProps = {
	length?: number
	value: string
	onChange: (value: string) => void
	label?: string
	disabled?: boolean
	autoFocus?: boolean
	'data-testid'?: string
}

/**
 * Caixas individuais para código alfanumérico; COLAR preenche todas de uma vez.
 */
export function CodeInput({
	length = EMAIL_CODE_LENGTH,
	value,
	onChange,
	label,
	disabled,
	autoFocus,
	'data-testid': testId,
}: CodeInputProps) {
	const inputsRef = React.useRef<Array<HTMLInputElement | null>>([])
	const chars = React.useMemo(() => {
		const normalized = normalizeEmailToken(value).padEnd(length, ' ').slice(0, length)
		return normalized.split('').map((char) => (char === ' ' ? '' : char))
	}, [length, value])

	const setCharAt = (index: number, nextChars: string[]) => {
		onChange(
			nextChars
				.join('')
				.toUpperCase()
				.replace(/[^A-Z0-9]/g, '')
				.slice(0, length)
		)
	}

	const focusAt = (index: number) => {
		const el = inputsRef.current[index]
		el?.focus()
		el?.select()
	}

	const onPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
		event.preventDefault()
		const pasted = normalizeEmailToken(event.clipboardData.getData('text'))
		if (!pasted) {
			return
		}
		onChange(pasted)
		focusAt(Math.min(pasted.length, length) - 1)
	}

	return (
		<div className="flex w-full flex-col gap-1.5" data-testid={testId}>
			{label ? <span className="text-sm font-medium text-foreground">{label}</span> : null}
			<div className="flex flex-wrap gap-1.5 sm:gap-2" role="group" aria-label={label}>
				{Array.from({ length }, (_, index) => (
					<input
						key={index}
						ref={(el) => {
							inputsRef.current[index] = el
						}}
						type="text"
						inputMode="text"
						autoComplete={index === 0 ? 'one-time-code' : 'off'}
						autoCapitalize="characters"
						spellCheck={false}
						maxLength={1}
						disabled={disabled}
						autoFocus={autoFocus && index === 0}
						aria-label={label ? `${label} ${index + 1}` : `Code digit ${index + 1}`}
						value={chars[index] ?? ''}
						className={cn(
							'h-10 w-9 rounded-md border border-input bg-background text-center font-mono text-sm font-semibold uppercase tracking-wider text-foreground shadow-sm sm:h-11 sm:w-10 sm:text-base',
							'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
							'disabled:cursor-not-allowed disabled:opacity-50'
						)}
						onPaste={onPaste}
						onChange={(event) => {
							const raw = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
							const next = [...chars]
							if (!raw) {
								next[index] = ''
								setCharAt(index, next)
								return
							}
							const digits = raw.slice(0, length - index).split('')
							digits.forEach((digit, offset) => {
								next[index + offset] = digit
							})
							setCharAt(index, next)
							const advanceTo = Math.min(index + digits.length, length - 1)
							focusAt(advanceTo)
						}}
						onKeyDown={(event) => {
							if (event.key === 'Backspace' && !chars[index] && index > 0) {
								event.preventDefault()
								const next = [...chars]
								next[index - 1] = ''
								setCharAt(index, next)
								focusAt(index - 1)
							}
							if (event.key === 'ArrowLeft' && index > 0) {
								event.preventDefault()
								focusAt(index - 1)
							}
							if (event.key === 'ArrowRight' && index < length - 1) {
								event.preventDefault()
								focusAt(index + 1)
							}
						}}
						data-testid={testId ? `${testId}-${index}` : undefined}
					/>
				))}
			</div>
		</div>
	)
}
