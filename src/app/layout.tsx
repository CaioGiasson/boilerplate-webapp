import type { ReactNode } from 'react'

type RootLayoutProps = {
	children: ReactNode
}

/**
 * Root layout mínimo exigido pelo Next.js.
 * O shell HTML/tema/i18n fica em `app/[locale]/layout.tsx`.
 */
export default function RootLayout({ children }: RootLayoutProps) {
	return children
}
