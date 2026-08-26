import { Home, type LucideIcon } from 'lucide-react'

export type NavItemConfig = {
	id: string
	href: '/'
	icon: LucideIcon
	labelKey: 'home'
	placement: 'main' | 'footer'
}

export const NAV_ITEMS: NavItemConfig[] = [
	{
		id: 'home',
		href: '/',
		icon: Home,
		labelKey: 'home',
		placement: 'main',
	},
]
