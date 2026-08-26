'use client'

import { useTranslations } from 'next-intl'
import { User } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { AppDropdownMenu, Avatar, Icon, NavIconButton, NavIconLink } from '@/design-system'
import { NAV_ITEMS } from '@/constants/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { APP_NAME } from '@/constants/app'
import { cn } from '@/lib/utils'

const APP_INITIAL = APP_NAME.charAt(0).toUpperCase()

type SidebarProps = {
	className?: string
	onNavigate?: () => void
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
	const t = useTranslations('nav')
	const tLegal = useTranslations('legal')
	const tApp = useTranslations('app')
	const { user, loading, logout } = useAuth()
	const mainItems = NAV_ITEMS.filter((item) => item.placement === 'main')

	const legalItems = [
		{
			id: 'privacy',
			label: tLegal('privacyLink'),
			href: '/privacy' as const,
			separatorBefore: true,
			onSelect: () => onNavigate?.(),
		},
		{
			id: 'terms',
			label: tLegal('termsLink'),
			href: '/terms' as const,
			onSelect: () => onNavigate?.(),
		},
	]

	const guestItems = [
		{
			id: 'sign-in',
			label: t('signIn'),
			href: '/login' as const,
			onSelect: () => onNavigate?.(),
		},
		{
			id: 'sign-up',
			label: t('signUp'),
			href: '/register' as const,
			onSelect: () => onNavigate?.(),
		},
		{
			id: 'settings',
			label: t('settings'),
			href: '/config' as const,
			onSelect: () => onNavigate?.(),
		},
		...legalItems,
	]

	const authItems = [
		{
			id: 'profile',
			label: t('profile'),
			href: '/profile' as const,
			onSelect: () => onNavigate?.(),
		},
		{
			id: 'settings',
			label: t('settings'),
			href: '/config' as const,
			onSelect: () => onNavigate?.(),
		},
		...legalItems,
		{
			id: 'sign-out',
			label: t('signOut'),
			destructive: true,
			onSelect: () => {
				onNavigate?.()
				void logout()
			},
		},
	]

	return (
		<aside
			className={cn(
				'flex h-full w-16 shrink-0 flex-col items-center border-r border-border bg-surface py-3',
				className
			)}
			data-testid="app-sidebar"
		>
			<Link
				href="/"
				onClick={onNavigate}
				className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground"
				aria-label={tApp('name')}
				data-testid="sidebar-logo"
			>
				{APP_INITIAL}
			</Link>

			<nav className="flex flex-1 flex-col items-center gap-2" aria-label={t('mainNavigation')}>
				{mainItems.map((item) => (
					<NavIconLink
						key={item.id}
						asChild
						label={t(item.labelKey)}
						tooltip={t(item.labelKey)}
						data-testid={`nav-${item.id}`}
					>
						<Link href={item.href} onClick={onNavigate}>
							<Icon icon={item.icon} />
						</Link>
					</NavIconLink>
				))}
			</nav>

			<div className="mt-auto flex flex-col items-center">
				<AppDropdownMenu
					data-testid="account-menu"
					side="right"
					align="end"
					openOnHover
					items={user ? authItems : guestItems}
					trigger={
						<NavIconButton label={t('account')} data-testid="nav-account" disabled={loading}>
							{user?.photoUrl ? (
								<Avatar
									src={user.photoUrl}
									alt={user.nickname}
									className="h-6 w-6"
									fallback={<Icon icon={User} />}
								/>
							) : (
								<Icon icon={User} />
							)}
						</NavIconButton>
					}
				/>
			</div>
		</aside>
	)
}
