'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Icon } from '@/design-system/Icon'
import { PasswordChecklist, type PasswordChecklistLabels } from '@/design-system/PasswordChecklist'
import { evaluatePasswordCriteria, PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'
import { applyCustomValidity, type ValidityMessageMap } from '@/utils/inputValidity'
import { cn } from '@/lib/utils'

export type InputPasswordProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
	label?: string
	error?: string
	hint?: string
	policyChecklist?: PasswordChecklistLabels
	validityMessages?: ValidityMessageMap
	showPasswordLabel?: string
	hidePasswordLabel?: string
}

export function InputPassword({
	label,
	error,
	hint,
	className,
	policyChecklist,
	validityMessages,
	showPasswordLabel = 'Show password',
	hidePasswordLabel = 'Hide password',
	id,
	value,
	maxLength = PASSWORD_MAX_LENGTH,
	onInvalid,
	onInput,
	onChange,
	...props
}: InputPasswordProps) {
	const [visible, setVisible] = React.useState(false)

	React.useEffect(() => {
		if (!visible) return
		const handle = window.setTimeout(() => setVisible(false), 8000)
		return () => window.clearTimeout(handle)
	}, [visible])
	const generatedId = React.useId()
	const inputId = id ?? generatedId
	const passwordValue = typeof value === 'string' ? value : ''
	const policyValid = policyChecklist ? evaluatePasswordCriteria(passwordValue).valid : false

	return (
		<div className="flex w-full flex-col gap-1.5">
			{label ? (
				<label htmlFor={inputId} className="text-sm font-medium text-foreground">
					{label}
				</label>
			) : null}
			<div className="relative">
				<input
					id={inputId}
					type={visible ? 'text' : 'password'}
					autoComplete={props.autoComplete ?? 'current-password'}
					autoCorrect="off"
					autoCapitalize="off"
					spellCheck={false}
					{...props}
					maxLength={maxLength}
					value={value}
					className={cn(
						'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
						error && 'border-destructive focus-visible:ring-destructive',
						!error && policyValid && 'border-emerald-600 focus-visible:ring-emerald-600',
						className
					)}
					onInvalid={(event) => {
						applyCustomValidity(event.currentTarget, validityMessages)
						onInvalid?.(event)
					}}
					onInput={(event) => {
						event.currentTarget.setCustomValidity('')
						onInput?.(event)
					}}
					onChange={(event) => {
						event.currentTarget.setCustomValidity('')
						onChange?.(event)
					}}
				/>
				<button
					type="button"
					className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
					onClick={() => setVisible((current) => !current)}
					aria-label={visible ? hidePasswordLabel : showPasswordLabel}
					tabIndex={-1}
				>
					<Icon icon={visible ? EyeOff : Eye} />
				</button>
			</div>
			{error ? <p className="text-sm text-destructive">{error}</p> : null}
			{hint && !policyChecklist ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
			{policyChecklist ? <PasswordChecklist password={passwordValue} labels={policyChecklist} /> : null}
		</div>
	)
}
