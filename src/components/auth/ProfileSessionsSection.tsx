'use client'

import { useTranslations } from 'next-intl'
import { AccordionSection, Button } from '@/design-system'
import type { ProfileFormModel } from '@/components/auth/useProfileForm'

type ProfileSessionsSectionProps = Pick<
	ProfileFormModel,
	| 'sessions'
	| 'sessionsLoading'
	| 'revokingSessionId'
	| 'revokingOthers'
	| 'hasOtherSessions'
	| 'revokeSession'
	| 'revokeOthers'
	| 'formatSessionDate'
>

export function ProfileSessionsSection({
	sessions,
	sessionsLoading,
	revokingSessionId,
	revokingOthers,
	hasOtherSessions,
	revokeSession,
	revokeOthers,
	formatSessionDate,
}: ProfileSessionsSectionProps) {
	const t = useTranslations('profile')

	return (
		<AccordionSection value="active-sessions" title={t('activeSessions')} data-testid="active-sessions-accordion">
			<div className="space-y-4">
				{sessionsLoading ? (
					<p className="text-sm text-muted-foreground">…</p>
				) : sessions.length === 0 ? (
					<p className="text-sm text-muted-foreground">{t('sessionEmpty')}</p>
				) : (
					<ul className="space-y-3" data-testid="active-sessions-list">
						{sessions.map((session) => (
							<li
								key={session.id}
								className="flex flex-col gap-2 border-b border-border pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
								data-testid="active-session-item"
							>
								<div className="space-y-1 text-sm">
									<div className="flex flex-wrap items-center gap-2">
										<span className="font-medium">
											{t('sessionDevice')}: {session.device.slice(0, 8)}…
										</span>
										{session.current ? (
											<span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
												{t('sessionCurrent')}
											</span>
										) : null}
									</div>
									<p className="text-muted-foreground">
										{t('sessionCreated')}: {formatSessionDate(session.createdAt)}
									</p>
									<p className="text-muted-foreground">
										{t('sessionExpires')}: {formatSessionDate(session.exp)}
									</p>
								</div>
								{!session.current ? (
									<Button
										type="button"
										variant="outline"
										disabled={revokingSessionId === session.id || revokingOthers}
										onClick={() => void revokeSession(session.id)}
										data-testid="revoke-session"
									>
										{t('sessionRevoke')}
									</Button>
								) : null}
							</li>
						))}
					</ul>
				)}
				{hasOtherSessions ? (
					<Button
						type="button"
						variant="destructive"
						disabled={revokingOthers || Boolean(revokingSessionId)}
						onClick={() => void revokeOthers()}
						data-testid="revoke-other-sessions"
					>
						{t('sessionRevokeOthers')}
					</Button>
				) : null}
			</div>
		</AccordionSection>
	)
}
