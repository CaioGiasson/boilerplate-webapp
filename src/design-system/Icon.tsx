import type { LucideIcon, LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'

export type IconProps = LucideProps & {
	icon: LucideIcon
}

export function Icon({ icon: IconComponent, className, ...props }: IconProps) {
	return <IconComponent className={cn('h-5 w-5', className)} aria-hidden {...props} />
}
