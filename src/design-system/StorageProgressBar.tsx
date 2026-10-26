'use client'

import { storageProgressTone, type StorageProgressTone } from '@/constants/storageQuota'
import { cn } from '@/lib/utils'

type StorageProgressBarProps = {
	percentUsed: number
	className?: string
	'data-testid'?: string
}

const TONE_CLASS: Record<StorageProgressTone, string> = {
	ok: 'bg-emerald-500',
	warn: 'bg-amber-500',
	critical: 'bg-red-500',
}

/** Barra de uso de cota: verde abaixo de 60 %, âmbar a partir de 60 %, vermelha acima de 90 %. */
export function StorageProgressBar({ percentUsed, className, 'data-testid': testId }: StorageProgressBarProps) {
	const clamped = Math.max(0, Math.min(100, percentUsed))
	const tone = storageProgressTone(clamped)

	return (
		<div
			className={cn('h-1.5 w-full overflow-hidden rounded-sm bg-foreground/25 dark:bg-foreground/35', className)}
			role="progressbar"
			aria-valuenow={clamped}
			aria-valuemin={0}
			aria-valuemax={100}
			data-testid={testId}
		>
			<div
				className={cn('h-full transition-[width] duration-300', TONE_CLASS[tone])}
				style={{ width: `${clamped}%` }}
			/>
		</div>
	)
}
