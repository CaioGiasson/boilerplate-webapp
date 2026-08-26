'use client'

import { useTranslations } from 'next-intl'
import { AccordionSection } from '@/design-system'
import type { ProfileFormModel } from '@/components/auth/useProfileForm'

type ProfileStatisticsSectionProps = Pick<
	ProfileFormModel,
	'statisticsLoading' | 'statisticsLoaded' | 'statisticsFileCount' | 'statisticsUsedMegabytes'
>

export function ProfileStatisticsSection({
	statisticsLoading,
	statisticsLoaded,
	statisticsFileCount,
	statisticsUsedMegabytes,
}: ProfileStatisticsSectionProps) {
	const t = useTranslations('profile')

	return (
		<AccordionSection value="statistics" title={t('statistics')} data-testid="statistics-accordion">
			<div className="space-y-3">
				{statisticsLoading || !statisticsLoaded ? (
					<p className="text-sm text-muted-foreground">{t('statisticsLoading')}</p>
				) : (
					<dl className="space-y-3 text-sm" data-testid="statistics-list">
						<div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
							<dt className="text-muted-foreground">{t('statisticsFileCount')}</dt>
							<dd className="font-medium tabular-nums" data-testid="statistics-file-count">
								{statisticsFileCount}
							</dd>
						</div>
						<div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
							<dt className="text-muted-foreground">{t('statisticsStorageUsed')}</dt>
							<dd className="font-medium tabular-nums" data-testid="statistics-storage-used">
								{t('statisticsStorageUsedValue', { megabytes: statisticsUsedMegabytes })}
							</dd>
						</div>
					</dl>
				)}
			</div>
		</AccordionSection>
	)
}
