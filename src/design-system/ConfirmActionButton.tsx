'use client'

import * as React from 'react'
import { Button, type ButtonProps } from '@/design-system/Button'
import { cn } from '@/lib/utils'

export type ConfirmActionButtonProps = Omit<ButtonProps, 'onClick' | 'children' | 'variant'> & {
	idleLabel: React.ReactNode
	confirmLabel: React.ReactNode
	onConfirm: () => void
	/**
	 * When false, the first click calls `onConfirm` immediately.
	 * When true (default), the first click arms the button and the second confirms.
	 */
	requireConfirmation?: boolean
	/** Controlled armed state. */
	armed?: boolean
	onArmedChange?: (armed: boolean) => void
	/** Resets armed state when this value changes. */
	resetKey?: string | number
	idleClassName?: string
	confirmClassName?: string
	shakeClassName?: string
}

/**
 * Two-step confirmation button (idle → armed/destructive → confirm).
 * Used for “close without saving” and “delete this image?” patterns.
 */
export function ConfirmActionButton({
	idleLabel,
	confirmLabel,
	onConfirm,
	requireConfirmation = true,
	armed: armedControlled,
	onArmedChange,
	resetKey,
	disabled,
	className,
	idleClassName,
	confirmClassName,
	shakeClassName = 'confirm-action-shake',
	type = 'button',
	size = 'sm',
	...rest
}: ConfirmActionButtonProps) {
	const [armedInternal, setArmedInternal] = React.useState(false)
	const isControlled = armedControlled !== undefined
	const armed = isControlled ? armedControlled : armedInternal

	const setArmed = React.useCallback(
		(next: boolean) => {
			if (!isControlled) setArmedInternal(next)
			onArmedChange?.(next)
		},
		[isControlled, onArmedChange]
	)

	React.useEffect(() => {
		setArmed(false)
		// resetKey intentionally drives disarm; setArmed is stable enough for this effect
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [resetKey])

	React.useEffect(() => {
		if (!requireConfirmation) setArmed(false)
	}, [requireConfirmation, setArmed])

	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation()
		if (disabled) return
		if (!requireConfirmation) {
			onConfirm()
			return
		}
		if (!armed) {
			setArmed(true)
			return
		}
		setArmed(false)
		onConfirm()
	}

	const showConfirm = requireConfirmation && armed

	return (
		<Button
			type={type}
			size={size}
			variant={showConfirm ? 'destructive' : 'ghost'}
			disabled={disabled}
			className={cn(
				'h-6 min-h-6 gap-1 px-2 text-xs [&_svg]:size-3',
				showConfirm
					? cn(shakeClassName, 'text-white hover:bg-destructive hover:text-white', confirmClassName)
					: cn('bg-transparent text-slate-900 hover:bg-white/80', idleClassName),
				className
			)}
			onClick={handleClick}
			aria-label={
				typeof (showConfirm ? confirmLabel : idleLabel) === 'string'
					? String(showConfirm ? confirmLabel : idleLabel)
					: undefined
			}
			{...rest}
		>
			{showConfirm ? confirmLabel : idleLabel}
		</Button>
	)
}
