'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { SearchBar, Title } from '@/design-system'
import { DS_CATALOG, type DsCatalogCategory } from '@/components/ds-catalog/catalog'
import { DsComponentExample } from '@/components/ds-catalog/DsComponentExample'

const CATEGORY_ORDER: DsCatalogCategory[] = ['actions', 'inputs', 'navigation', 'feedback', 'layout', 'icons']

export function DsComponentsPageClient() {
	const t = useTranslations('dsCatalog')
	const [query, setQuery] = React.useState('')

	const normalizedQuery = query.trim().toLowerCase()

	const filtered = DS_CATALOG.filter((entry) => {
		if (!normalizedQuery) return true
		const haystack = [entry.name, entry.description, entry.id, ...entry.keywords].join(' ').toLowerCase()
		return haystack.includes(normalizedQuery)
	})

	const grouped = CATEGORY_ORDER.map((category) => ({
		category,
		items: filtered.filter((entry) => entry.category === category),
	})).filter((group) => group.items.length > 0)

	return (
		<div className="mx-auto w-full max-w-5xl space-y-8 p-4 sm:p-6" data-testid="ds-components-page">
			<header className="space-y-3">
				<Title as="h1">{t('title')}</Title>
				<p className="max-w-3xl text-sm text-muted-foreground">{t('description')}</p>
				<SearchBar
					value={query}
					onValueChange={setQuery}
					placeholder={t('searchPlaceholder')}
					label={t('searchPlaceholder')}
				/>
			</header>

			{grouped.length === 0 ? (
				<p className="text-sm text-muted-foreground">{t('noResults')}</p>
			) : (
				grouped.map((group) => (
					<section key={group.category} className="space-y-4">
						<h2 className="text-lg font-semibold">{t(`categories.${group.category}`)}</h2>
						<div className="grid gap-4">
							{group.items.map((entry) => (
								<article
									key={entry.id}
									id={entry.id}
									className="rounded-lg border border-border bg-surface p-4 shadow-sm"
									data-testid={`ds-catalog-${entry.id}`}
								>
									<div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
										<div>
											<h3 className="text-base font-semibold">{entry.name}</h3>
											<p className="text-sm text-muted-foreground">{entry.description}</p>
										</div>
										<span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
											{t('categoryLabel')}: {t(`categories.${entry.category}`)}
										</span>
									</div>

									<div className="mt-3 space-y-1">
										<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
											{t('importLabel')}
										</p>
										<pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs">
											<code>{entry.importLine}</code>
										</pre>
									</div>

									<div className="mt-4 space-y-2">
										<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
											{t('exampleLabel')}
										</p>
										<div className="rounded-md border border-dashed border-border bg-background p-4">
											<DsComponentExample componentId={entry.id} />
										</div>
									</div>
								</article>
							))}
						</div>
					</section>
				))
			)}
		</div>
	)
}
