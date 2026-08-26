import { cn } from '@/lib/utils'

type FormPageSkeletonProps = {
	className?: string
	testId?: string
}

export function FormPageSkeleton({ className, testId = 'form-page-skeleton' }: FormPageSkeletonProps) {
	return (
		<div
			className={cn('mx-auto w-full max-w-md space-y-6 p-4 sm:p-6', className)}
			aria-busy="true"
			data-testid={testId}
		>
			<div className="h-8 w-48 animate-pulse rounded-md bg-muted" aria-hidden />
			<div className="space-y-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<div key={index} className="space-y-2">
						<div className="h-4 w-24 animate-pulse rounded bg-muted" aria-hidden />
						<div className="h-10 w-full animate-pulse rounded-md bg-muted" aria-hidden />
					</div>
				))}
			</div>
			<div className="h-10 w-32 animate-pulse rounded-md bg-muted" aria-hidden />
		</div>
	)
}
