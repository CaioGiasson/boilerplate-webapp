'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type SelectOption = {
	value: string
	label: string
}

export type AppSelectProps = {
	value?: string
	defaultValue?: string
	placeholder?: string
	options: SelectOption[]
	onValueChange?: (value: string) => void
	disabled?: boolean
	'aria-label'?: string
}

export function AppSelect({
	value,
	defaultValue,
	placeholder,
	options,
	onValueChange,
	disabled,
	'aria-label': ariaLabel,
}: AppSelectProps) {
	return (
		<Select value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled}>
			<SelectTrigger aria-label={ariaLabel}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
