'use client'

import * as React from 'react'
import { restorePageTransition, runPageTransition } from '@/components/layout/pageTransitionController'
import { usePathname, useRouter as useIntlRouter } from '@/i18n/navigation.base'

type AppRouter = ReturnType<typeof useIntlRouter>

function hrefPathname(href: Parameters<AppRouter['push']>[0]): string | null {
	if (typeof href === 'string') return href
	if (href && typeof href === 'object' && 'pathname' in href) {
		return typeof href.pathname === 'string' ? href.pathname : null
	}
	return null
}

/**
 * Locale-aware router that runs the core page transition around navigation.
 */
export function useRouter(): AppRouter {
	const router = useIntlRouter()
	const pathname = usePathname()

	return React.useMemo(
		() => ({
			...router,
			push: ((href, options) => {
				const targetPath = hrefPathname(href)
				const localeOverride =
					options && typeof options === 'object' && 'locale' in options ? options.locale : undefined
				if (targetPath !== null && targetPath === pathname && localeOverride === undefined) {
					return router.push(href, options)
				}

				return runPageTransition(() => router.push(href, options)).catch((error) => {
					restorePageTransition()
					throw error
				})
			}) as AppRouter['push'],
			replace: ((href, options) => {
				const targetPath = hrefPathname(href)
				const localeOverride =
					options && typeof options === 'object' && 'locale' in options ? options.locale : undefined
				if (targetPath !== null && targetPath === pathname && localeOverride === undefined) {
					return router.replace(href, options)
				}

				return runPageTransition(() => router.replace(href, options)).catch((error) => {
					restorePageTransition()
					throw error
				})
			}) as AppRouter['replace'],
		}),
		[pathname, router]
	)
}
