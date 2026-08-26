'use client'

import * as React from 'react'
import { Menu } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Icon, IconButton, ToastProvider } from '@/design-system'
import { Sidebar } from '@/components/layout/Sidebar'
import { PageTransition } from '@/components/layout/PageTransition'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { CookieNotice } from '@/components/legal/CookieNotice'

type AppShellProps = {
	children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
	const t = useTranslations('nav')
	const [open, setOpen] = React.useState(false)

	return (
		<AuthProvider>
			<ToastProvider>
				<div className="flex h-screen overflow-hidden bg-background text-foreground" data-testid="app-shell">
					<div className="hidden h-full shrink-0 md:flex">
						<Sidebar />
					</div>

					<div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
						<header className="flex shrink-0 items-center border-b border-border px-3 py-2 md:hidden">
							<Sheet open={open} onOpenChange={setOpen}>
								<SheetTrigger asChild>
									<IconButton label={t('openMenu')} data-testid="mobile-menu-trigger">
										<Icon icon={Menu} />
									</IconButton>
								</SheetTrigger>
								<SheetContent title={t('menu')} closeLabel={t('closeMenu')}>
									<Sidebar onNavigate={() => setOpen(false)} />
								</SheetContent>
							</Sheet>
						</header>

						<main className="vitraux-scrollbar relative min-h-0 flex-1 overflow-y-auto">
							<PageTransition>{children}</PageTransition>
							<CookieNotice />
						</main>
					</div>
				</div>
			</ToastProvider>
		</AuthProvider>
	)
}
