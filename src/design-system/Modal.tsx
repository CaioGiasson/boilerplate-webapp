'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isPortaledMenuEventTarget } from '@/utils/pointerHover'

export type ModalSize = 'sm' | 'md' | 'lg'

export type ModalProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description?: string
	/** Rótulo (leitores de tela) do botão X. */
	closeLabel: string
	children?: React.ReactNode
	/** Rodapé com as ações (ex.: Cancelar / Confirmar). */
	footer?: React.ReactNode
	size?: ModalSize
	'data-testid'?: string
}

const SIZE_CLASS: Record<ModalSize, string> = {
	sm: 'max-w-sm',
	md: 'max-w-lg',
	lg: 'max-w-2xl',
}

/**
 * Diálogo modal acessível (Radix): foco preso, Escape e clique fora fecham, rolagem do fundo travada.
 * Controlado: quem abre é `open`/`onOpenChange`. Menus em portal (select, dropdown) abertos dentro dele
 * não contam como "clique fora".
 */
export function Modal({
	open,
	onOpenChange,
	title,
	description,
	closeLabel,
	children,
	footer,
	size = 'md',
	'data-testid': testId,
}: ModalProps) {
	const ignorePortaledMenu = (event: { target: EventTarget | null; preventDefault: () => void }) => {
		if (isPortaledMenuEventTarget(event.target)) {
			event.preventDefault()
		}
	}

	return (
		<DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/50" />
				<DialogPrimitive.Content
					data-testid={testId}
					{...(description ? {} : { 'aria-describedby': undefined })}
					onInteractOutside={ignorePortaledMenu}
					onPointerDownOutside={ignorePortaledMenu}
					className={cn(
						'fixed top-1/2 left-1/2 z-[200] flex max-h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col',
						'overflow-hidden rounded-lg border border-border bg-background shadow-xl outline-none',
						SIZE_CLASS[size]
					)}
				>
					<div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
						<div className="min-w-0">
							<DialogPrimitive.Title className="text-sm font-medium">{title}</DialogPrimitive.Title>
							{description ? (
								<DialogPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">
									{description}
								</DialogPrimitive.Description>
							) : null}
						</div>
						<DialogPrimitive.Close className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
							<X className="size-4" aria-hidden />
							<span className="sr-only">{closeLabel}</span>
						</DialogPrimitive.Close>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
					{footer ? (
						<div className="flex justify-end gap-2 border-t border-border px-4 py-3">{footer}</div>
					) : null}
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	)
}
