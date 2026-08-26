'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { Icon } from '@/design-system/Icon'

export type ToastVariant = 'success' | 'error'

export type ToastMessage = {
	id: string
	title: string
	description?: string
	variant: ToastVariant
	exiting?: boolean
}

type ToastContextValue = {
	toast: (input: Omit<ToastMessage, 'id' | 'exiting'>) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)
const TOAST_EXIT_MS = 200

export function useToast(): ToastContextValue {
	const context = React.useContext(ToastContext)
	if (!context) {
		throw new Error('useToast must be used within ToastProvider')
	}
	return context
}

function toastClasses(variant: ToastVariant) {
	return variant === 'success'
		? 'border-green-600 bg-green-600 text-white'
		: 'border-destructive bg-destructive text-white'
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const t = useTranslations('app')
	const pathname = usePathname()
	const previousPathname = React.useRef(pathname)
	const [toasts, setToasts] = React.useState<ToastMessage[]>([])
	const [mounted, setMounted] = React.useState(false)

	React.useEffect(() => {
		setMounted(true)
	}, [])

	React.useEffect(() => {
		if (previousPathname.current === pathname) {
			return
		}
		previousPathname.current = pathname
		setToasts([])
	}, [pathname])

	const toast = React.useCallback((input: Omit<ToastMessage, 'id' | 'exiting'>) => {
		const id = crypto.randomUUID()
		setToasts((current) => [
			...current,
			{ id, title: input.title, description: input.description, variant: input.variant },
		])
	}, [])

	const dismiss = React.useCallback((id: string) => {
		setToasts((current) =>
			current.map((item) => (item.id === id && !item.exiting ? { ...item, exiting: true } : item))
		)
		window.setTimeout(() => {
			setToasts((current) => current.filter((item) => item.id !== id))
		}, TOAST_EXIT_MS)
	}, [])

	return (
		<ToastContext.Provider value={{ toast }}>
			{children}
			{mounted
				? createPortal(
						<div className="pointer-events-none fixed top-4 right-4 left-4 z-[100] mx-auto flex w-full max-w-lg flex-col gap-2">
							{toasts.map((item) => (
								<div
									key={item.id}
									className={cn(
										'pointer-events-auto flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 shadow-lg',
										toastClasses(item.variant),
										item.exiting ? 'animate-toast-slide-up' : 'animate-toast-slide-down'
									)}
									data-testid={`toast-${item.variant}`}
									role="status"
									onClick={() => dismiss(item.id)}
								>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium">{item.title}</p>
										{item.description ? (
											<p className="mt-1 text-sm opacity-90">{item.description}</p>
										) : null}
									</div>
									<button
										type="button"
										className="ml-auto shrink-0 cursor-pointer rounded-sm p-1 opacity-90 hover:opacity-100"
										aria-label={t('close')}
										data-testid="toast-dismiss"
										onClick={(event) => {
											event.stopPropagation()
											dismiss(item.id)
										}}
									>
										<Icon icon={X} className="h-4 w-4" />
									</button>
								</div>
							))}
						</div>,
						document.body
					)
				: null}
		</ToastContext.Provider>
	)
}

export function Toast({
	title,
	description,
	variant = 'success',
	className,
	onDismiss,
}: {
	title: string
	description?: string
	variant?: ToastVariant
	className?: string
	onDismiss?: () => void
}) {
	const t = useTranslations('app')
	return (
		<div
			className={cn(
				'flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3',
				toastClasses(variant),
				className
			)}
			onClick={onDismiss}
		>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">{title}</p>
				{description ? <p className="mt-1 text-sm opacity-90">{description}</p> : null}
			</div>
			{onDismiss ? (
				<button
					type="button"
					className="ml-auto shrink-0 cursor-pointer rounded-sm p-1"
					aria-label={t('close')}
					onClick={(event) => {
						event.stopPropagation()
						onDismiss()
					}}
				>
					<Icon icon={X} className="h-4 w-4" />
				</button>
			) : null}
		</div>
	)
}
