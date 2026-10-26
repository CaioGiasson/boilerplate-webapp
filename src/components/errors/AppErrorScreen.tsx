'use client'

import { TriangleAlert } from 'lucide-react'
import { Button } from '@/design-system/Button'
import { Icon } from '@/design-system/Icon'

type AppErrorScreenProps = {
	message: string
	retryLabel?: string
	onRetry?: () => void
}

/** Tela cheia para falhas que derrubam o layout; quem a usa decide o texto (pode estar fora do next-intl). */
export function AppErrorScreen({ message, retryLabel, onRetry }: AppErrorScreenProps) {
	return (
		<div
			className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-background px-6 text-foreground"
			data-testid="app-error-screen"
			role="alert"
		>
			<Icon icon={TriangleAlert} className="h-16 w-16 text-destructive" />
			<p className="max-w-md text-center text-lg leading-relaxed whitespace-pre-line">{message}</p>
			{retryLabel && onRetry ? (
				<Button type="button" onClick={onRetry}>
					{retryLabel}
				</Button>
			) : null}
		</div>
	)
}
