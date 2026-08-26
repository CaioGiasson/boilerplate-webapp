import { createNavigation } from 'next-intl/navigation'
import { routing } from '@/i18n/routing'

/** Raw next-intl navigation helpers (no page-transition interception). */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
