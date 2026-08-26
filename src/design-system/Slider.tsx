'use client'

import type { ComponentProps } from 'react'
import { Slider as UiSlider } from '@/components/ui/slider'

export type AppSliderProps = ComponentProps<typeof UiSlider>

export function AppSlider(props: AppSliderProps) {
	return <UiSlider {...props} />
}
