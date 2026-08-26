'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

type LegalLinksProps = {
	variant?: 'inline' | 'sidebar'
	className?: string
}

export function LegalLinks({ variant = 'inline', className }: LegalLinksProps) {
	const t = useTranslations('legal')
	const linkClass =
		variant === 'sidebar'
			? 'text-[10px] leading-tight text-muted-foreground hover:underline'
			: 'text-xs text-muted-foreground underline-offset-4 hover:underline'

	return (
		<nav
			aria-label={t('linksLabel')}
			className={cn(
				variant === 'sidebar'
					? 'flex flex-col items-center gap-1 px-1 text-center'
					: 'flex flex-wrap items-center justify-center gap-x-2 gap-y-1',
				className
			)}
		>
			<Link href="/privacy" className={linkClass}>
				{variant === 'sidebar' ? t('privacyLinkShort') : t('privacyLink')}
			</Link>
			{variant === 'inline' ? <span className="text-xs text-muted-foreground">·</span> : null}
			<Link href="/terms" className={linkClass}>
				{variant === 'sidebar' ? t('termsLinkShort') : t('termsLink')}
			</Link>
		</nav>
	)
}
