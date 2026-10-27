'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { AccordionSection, Badge, Button, InputPassword, TextInput, useToast } from '@/design-system'
import {
	beginTwoFactorSetupRequest,
	disableTwoFactorRequest,
	enableTwoFactorRequest,
	getTwoFactorStatusRequest,
	regenerateRecoveryCodesRequest,
	type TwoFactorStatus,
} from '@/lib/auth-client'
import { ApiClientError } from '@/lib/api-error'

type View = 'idle' | 'setup' | 'recovery' | 'regenerate' | 'disable'

type Setup = { secret: string; otpauthUri: string }

/** Código do app: só dígitos, no máximo 6. */
function digitsOnly(value: string): string {
	return value.replace(/\D/g, '').slice(0, 6)
}

function TwoFactorPanel({ status, reload }: { status: TwoFactorStatus; reload: () => Promise<void> }) {
	const t = useTranslations('profile')
	const { toast } = useToast()
	const [view, setView] = React.useState<View>('idle')
	const [busy, setBusy] = React.useState(false)
	const [error, setError] = React.useState<string | null>(null)
	const [setup, setSetup] = React.useState<Setup | null>(null)
	const [recoveryCodes, setRecoveryCodes] = React.useState<string[]>([])
	const [code, setCode] = React.useState('')
	const [password, setPassword] = React.useState('')
	const [recoveryInput, setRecoveryInput] = React.useState('')

	const reset = () => {
		setView('idle')
		setError(null)
		setSetup(null)
		setCode('')
		setPassword('')
		setRecoveryInput('')
	}

	const failureMessage = (cause: unknown): string => {
		if (cause instanceof ApiClientError) {
			if (cause.code === 'INVALID_TWO_FACTOR_CODE' || cause.kind === 'unauthorized')
				return t('twoFactorInvalidCode')
			if (cause.code === 'PASSWORD_REQUIRED') return t('twoFactorPasswordRequired')
		}
		return t('twoFactorError')
	}

	const run = async (action: () => Promise<void>) => {
		setBusy(true)
		setError(null)
		try {
			await action()
		} catch (cause: unknown) {
			setError(failureMessage(cause))
		} finally {
			setBusy(false)
		}
	}

	const startSetup = () =>
		run(async () => {
			setSetup(await beginTwoFactorSetupRequest())
			setView('setup')
		})

	const confirmSetup = () =>
		run(async () => {
			const result = await enableTwoFactorRequest(code)
			setRecoveryCodes(result.recoveryCodes)
			setCode('')
			setSetup(null)
			setView('recovery')
			toast({ variant: 'success', title: t('twoFactorEnabledToast') })
		})

	const regenerate = () =>
		run(async () => {
			const result = await regenerateRecoveryCodesRequest(code)
			setRecoveryCodes(result.recoveryCodes)
			setCode('')
			setView('recovery')
		})

	const disable = () =>
		run(async () => {
			await disableTwoFactorRequest({
				password,
				...(recoveryInput.trim() ? { recoveryCode: recoveryInput.trim() } : { code }),
			})
			toast({ variant: 'success', title: t('twoFactorDisabledToast') })
			reset()
			await reload()
		})

	const finishRecovery = async () => {
		setRecoveryCodes([])
		reset()
		await reload()
	}

	const copyCodes = async () => {
		try {
			await navigator.clipboard.writeText(recoveryCodes.join('\n'))
			toast({ variant: 'success', title: t('twoFactorRecoveryCopied') })
		} catch {
			setError(t('twoFactorError'))
		}
	}

	const errorNode = error ? (
		<p role="alert" className="text-sm text-destructive" data-testid="two-factor-error">
			{error}
		</p>
	) : null

	if (view === 'setup' && setup) {
		return (
			<div className="space-y-4" data-testid="two-factor-setup">
				<p className="font-medium">{t('twoFactorSetupTitle')}</p>
				<p className="text-sm text-muted-foreground">{t('twoFactorSetupSteps')}</p>
				<div className="space-y-1">
					<p className="text-sm font-medium">{t('twoFactorSecretLabel')}</p>
					<code
						className="block rounded bg-muted px-3 py-2 text-sm tracking-wider break-all"
						data-testid="two-factor-secret"
					>
						{setup.secret}
					</code>
					<a
						href={setup.otpauthUri}
						className="text-sm font-medium text-primary underline-offset-4 hover:underline"
					>
						{t('twoFactorOpenApp')}
					</a>
				</div>
				<TextInput
					label={t('twoFactorCodeLabel')}
					inputMode="numeric"
					autoComplete="one-time-code"
					value={code}
					onChange={(event) => setCode(digitsOnly(event.target.value))}
				/>
				{errorNode}
				<div className="flex gap-2">
					<Button type="button" disabled={busy || code.length !== 6} onClick={() => void confirmSetup()}>
						{t('twoFactorConfirm')}
					</Button>
					<Button type="button" variant="outline" disabled={busy} onClick={reset}>
						{t('twoFactorCancel')}
					</Button>
				</div>
			</div>
		)
	}

	if (view === 'recovery') {
		return (
			<div className="space-y-4" data-testid="two-factor-recovery">
				<p className="font-medium">{t('twoFactorRecoveryTitle')}</p>
				<p className="text-sm text-muted-foreground">{t('twoFactorRecoveryHint')}</p>
				<ul
					className="grid grid-cols-2 gap-2 rounded bg-muted p-3 font-mono text-sm"
					data-testid="two-factor-codes"
				>
					{recoveryCodes.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
				{errorNode}
				<div className="flex gap-2">
					<Button type="button" variant="outline" onClick={() => void copyCodes()}>
						{t('twoFactorRecoveryCopy')}
					</Button>
					<Button type="button" onClick={() => void finishRecovery()}>
						{t('twoFactorRecoveryDone')}
					</Button>
				</div>
			</div>
		)
	}

	if (view === 'regenerate') {
		return (
			<div className="space-y-4" data-testid="two-factor-regenerate">
				<p className="text-sm text-muted-foreground">{t('twoFactorRegenerateHint')}</p>
				<TextInput
					label={t('twoFactorCodeLabel')}
					inputMode="numeric"
					autoComplete="one-time-code"
					value={code}
					onChange={(event) => setCode(digitsOnly(event.target.value))}
				/>
				{errorNode}
				<div className="flex gap-2">
					<Button type="button" disabled={busy || code.length !== 6} onClick={() => void regenerate()}>
						{t('twoFactorRegenerate')}
					</Button>
					<Button type="button" variant="outline" disabled={busy} onClick={reset}>
						{t('twoFactorCancel')}
					</Button>
				</div>
			</div>
		)
	}

	if (view === 'disable') {
		const hasSecondFactor = recoveryInput.trim().length > 0 || code.length === 6
		return (
			<div className="space-y-4" data-testid="two-factor-disable">
				<p className="text-sm text-muted-foreground">{t('twoFactorDisableHint')}</p>
				<InputPassword
					label={t('twoFactorPasswordLabel')}
					autoComplete="current-password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					showPasswordLabel={t('twoFactorPasswordLabel')}
					hidePasswordLabel={t('twoFactorPasswordLabel')}
				/>
				<TextInput
					label={t('twoFactorCodeLabel')}
					inputMode="numeric"
					autoComplete="one-time-code"
					value={code}
					onChange={(event) => setCode(digitsOnly(event.target.value))}
				/>
				<TextInput
					label={t('twoFactorRecoveryInputLabel')}
					value={recoveryInput}
					onChange={(event) => setRecoveryInput(event.target.value.slice(0, 16))}
				/>
				{errorNode}
				<div className="flex gap-2">
					<Button
						type="button"
						variant="destructive"
						disabled={busy || !password || !hasSecondFactor}
						onClick={() => void disable()}
					>
						{t('twoFactorDisableConfirm')}
					</Button>
					<Button type="button" variant="outline" disabled={busy} onClick={reset}>
						{t('twoFactorCancel')}
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-4" data-testid="two-factor-status">
			<div className="flex items-center gap-2">
				<Badge variant={status.enabled ? 'success' : 'neutral'}>
					{status.enabled ? t('twoFactorStatusOn') : t('twoFactorStatusOff')}
				</Badge>
				{status.enabled ? (
					<span className="text-sm text-muted-foreground">
						{t('twoFactorRecoveryRemaining', { count: status.recoveryCodesRemaining })}
					</span>
				) : null}
			</div>
			<p className="text-sm text-muted-foreground">{t('twoFactorIntro')}</p>
			{errorNode}
			{status.enabled ? (
				<div className="flex flex-wrap gap-2">
					<Button type="button" variant="outline" onClick={() => setView('regenerate')}>
						{t('twoFactorRegenerate')}
					</Button>
					<Button type="button" variant="destructive" onClick={() => setView('disable')}>
						{t('twoFactorDisable')}
					</Button>
				</div>
			) : (
				<Button type="button" disabled={busy} onClick={() => void startSetup()}>
					{t('twoFactorEnable')}
				</Button>
			)}
		</div>
	)
}

/**
 * 2FA (TOTP) da própria conta. Só aparece quando o servidor tem `TWO_FACTOR_ENCRYPTION_KEY` (`available`).
 * O estado é buscado ao montar; o painel só monta com o accordion aberto.
 */
export function ProfileTwoFactorSection() {
	const t = useTranslations('profile')
	const [status, setStatus] = React.useState<TwoFactorStatus | null>(null)
	const [failed, setFailed] = React.useState(false)

	const reload = React.useCallback(async () => {
		try {
			setStatus(await getTwoFactorStatusRequest())
			setFailed(false)
		} catch {
			setFailed(true)
		}
	}, [])

	React.useEffect(() => {
		void reload()
	}, [reload])

	if (!status && !failed) return null
	if (status && !status.available && !status.enabled) return null

	return (
		<AccordionSection value="two-factor" title={t('twoFactorTitle')} data-testid="two-factor-accordion">
			{status ? (
				<TwoFactorPanel status={status} reload={reload} />
			) : (
				<p className="text-sm text-destructive">{t('twoFactorLoadError')}</p>
			)}
		</AccordionSection>
	)
}
