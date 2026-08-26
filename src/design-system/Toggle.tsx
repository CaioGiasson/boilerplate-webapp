'use client'

import type { ComponentProps } from 'react'
import { Switch } from '@/components/ui/switch'

export type ToggleProps = ComponentProps<typeof Switch>

export function Toggle(props: ToggleProps) {
	return <Switch {...props} />
}
