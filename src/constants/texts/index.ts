import pt from './pt'
import en from './en'
import es from './es'
import type { AppLocale } from './types'
import type { AppMessages } from './types'

export const messagesByLocale: Record<AppLocale, AppMessages> = {
	pt,
	en,
	es,
}

export * from './types'
