'use client'

import * as React from 'react'
import { AvatarFallback, AvatarImage, AvatarRoot } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export type AvatarProps = {
	src?: string | null
	alt?: string
	fallback?: React.ReactNode
	className?: string
}

export function Avatar({ src, alt = '', fallback, className }: AvatarProps) {
	return (
		<AvatarRoot className={cn(className)}>
			{src ? <AvatarImage src={src} alt={alt} /> : null}
			<AvatarFallback>{fallback}</AvatarFallback>
		</AvatarRoot>
	)
}
