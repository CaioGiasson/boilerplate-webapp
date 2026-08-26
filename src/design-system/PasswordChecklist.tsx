'use client'

import * as React from 'react'
import { evaluatePasswordCriteria } from '@/utils/passwordPolicy'
import { cn } from '@/lib/utils'

export type PasswordChecklistLabels = {
	minLength: string
	complexity: string
	lowercase: string
	uppercase: string
	number: string
	symbol: string
}

export type PasswordChecklistProps = {
	password: string
	labels: PasswordChecklistLabels
	className?: string
}

function itemClass(met: boolean): string {
	return cn('text-xs transition-colors', met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')
}

/**
 * Checklist sempre visível dos critérios de senha; itens cumpridos ficam verdes.
 */
export function PasswordChecklist({ password, labels, className }: PasswordChecklistProps) {
	const status = evaluatePasswordCriteria(password)

	return (
		<ul className={cn('list-disc space-y-1 pl-5', className)} data-testid="password-checklist">
			<li className={itemClass(status.minLength)}>{labels.minLength}</li>
			<li className={itemClass(status.complexityMet)}>
				<span>{labels.complexity}</span>
				<ul className="mt-1 list-disc space-y-1 pl-5">
					<li className={itemClass(status.lowercase)}>{labels.lowercase}</li>
					<li className={itemClass(status.uppercase)}>{labels.uppercase}</li>
					<li className={itemClass(status.number)}>{labels.number}</li>
					<li className={itemClass(status.symbol)}>{labels.symbol}</li>
				</ul>
			</li>
		</ul>
	)
}
