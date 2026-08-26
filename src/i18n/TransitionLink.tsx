'use client'

import * as React from 'react'
import { restorePageTransition, runPageTransition } from '@/components/layout/pageTransitionController'
import { Link as IntlLink, usePathname, useRouter as useIntlRouter } from '@/i18n/navigation.base'

type IntlLinkProps = React.ComponentProps<typeof IntlLink>

function hrefPathname(href: IntlLinkProps['href']): string | null {
	if (typeof href === 'string') return href
	if (href && typeof href === 'object' && 'pathname' in href) {
		return typeof href.pathname === 'string' ? href.pathname : null
	}
	return null
}

export const Link = React.forwardRef<HTMLAnchorElement, IntlLinkProps>(function TransitionLink(
	{ href, replace, onClick, onNavigate, ...props },
	ref
) {
	const pathname = usePathname()
	const router = useIntlRouter()

	const navigate = React.useCallback(() => {
		const destination = href as Parameters<typeof router.push>[0]
		if (replace) {
			router.replace(destination)
		} else {
			router.push(destination)
		}
	}, [href, replace, router])

	return (
		<IntlLink
			ref={ref}
			href={href}
			replace={replace}
			{...props}
			onClick={onClick}
			onNavigate={(event) => {
				onNavigate?.(event)

				const targetPath = hrefPathname(href)
				if (targetPath !== null && targetPath === pathname) return

				event.preventDefault()
				void runPageTransition(navigate).catch((error) => {
					restorePageTransition()
					throw error
				})
			}}
		/>
	)
})
