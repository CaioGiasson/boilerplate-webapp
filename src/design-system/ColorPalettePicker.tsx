'use client'

import { cn } from '@/lib/utils'

export type ColorPalettePickerProps = {
	colors: readonly string[]
	value: string
	onChange: (color: string) => void
	label?: string
}

export function ColorPalettePicker({ colors, value, onChange, label }: ColorPalettePickerProps) {
	return (
		<div className="space-y-2">
			{label ? <p className="text-sm font-medium">{label}</p> : null}
			<div className="flex flex-wrap gap-2" role="listbox" aria-label={label}>
				{colors.map((color) => {
					const selected = value.toLowerCase() === color.toLowerCase()
					return (
						<button
							key={color}
							type="button"
							role="option"
							aria-selected={selected}
							onClick={() => onChange(color)}
							className={cn(
								'size-8 rounded-full border-2',
								selected ? 'border-foreground scale-110' : 'border-transparent'
							)}
							style={{ backgroundColor: color }}
							title={color}
						/>
					)
				})}
			</div>
		</div>
	)
}
