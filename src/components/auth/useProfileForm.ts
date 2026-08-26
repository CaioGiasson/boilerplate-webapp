'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useToast } from '@/design-system'
import {
	ApiClientError,
	changePasswordRequest,
	checkNicknameExists,
	confirmEmailChallengeRequest,
	updateProfileRequest,
	uploadPhotoRequest,
	exportUserDataRequest,
	deleteAccountRequest,
	requestEmailChangeRequest,
	sendEmailVerificationRequest,
	listSessionsRequest,
	getUserStorageStatsRequest,
	revokeSessionRequest,
	revokeOtherSessionsRequest,
	type ActiveSessionDto,
	type AuthUser,
} from '@/lib/auth-client'
import { getPasswordPolicyIssue } from '@/utils/passwordPolicy'
import { canonicalizeNickname } from '@/utils/nickname'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from '@/i18n/navigation'
import { EMAIL_CODE_LENGTH, normalizeEmailToken } from '@/utils/emailCode'
import { formatMegabytes } from '@/utils/formatStorage'
import type { AppLocale } from '@/constants/texts'

const MAX_PHOTO_BYTES = 3 * 1024 * 1024

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(String(reader.result))
		reader.onerror = () => reject(new Error('Failed to read file'))
		reader.readAsDataURL(file)
	})
}

export type ProfileFormModel = {
	ready: true
	user: AuthUser
	name: string
	setName: (value: string) => void
	nickname: string
	setNickname: (value: string) => void
	nicknameStatus: 'idle' | 'available' | 'taken'
	currentPassword: string
	setCurrentPassword: (value: string) => void
	newPassword: string
	setNewPassword: (value: string) => void
	newPasswordConfirmation: string
	setNewPasswordConfirmation: (value: string) => void
	newPasswordError: string | null
	setNewPasswordError: (value: string | null) => void
	newPasswordConfirmationError: string | null
	setNewPasswordConfirmationError: (value: string | null) => void
	saving: boolean
	exporting: boolean
	deleteConfirm: string
	setDeleteConfirm: (value: string) => void
	deletePassword: string
	setDeletePassword: (value: string) => void
	deleting: boolean
	verificationToken: string
	setVerificationToken: (value: string) => void
	resendingVerification: boolean
	confirmingVerification: boolean
	newEmail: string
	setNewEmail: (value: string) => void
	emailChangePassword: string
	setEmailChangePassword: (value: string) => void
	changingEmail: boolean
	openAccordion: string
	setOpenAccordion: (value: string) => void
	sessions: ActiveSessionDto[]
	sessionsLoading: boolean
	revokingSessionId: string | null
	revokingOthers: boolean
	photoInputRef: React.RefObject<HTMLInputElement | null>
	visiblePhotoUrl: string | null
	isVerified: boolean
	emailChangeInProgress: boolean
	hasOtherSessions: boolean
	deleteConfirmWord: string
	resolvePasswordError: (value: string) => string | null
	onPhotoChange: (file: File | null) => void
	openPhotoPicker: () => void
	markPhotoRemoved: () => void
	saveProfile: (event: React.FormEvent) => Promise<void>
	savePassword: (event: React.FormEvent) => Promise<void>
	downloadMyData: () => Promise<void>
	onDeleteAccount: (event: React.FormEvent) => Promise<void>
	resendVerification: () => Promise<void>
	confirmVerificationToken: (event: React.FormEvent) => Promise<void>
	saveEmailChange: (event: React.FormEvent) => Promise<void>
	revokeSession: (sessionId: string) => Promise<void>
	revokeOthers: () => Promise<void>
	formatSessionDate: (iso: string) => string
	statisticsLoading: boolean
	statisticsLoaded: boolean
	statisticsImageCount: number
	statisticsUsedMegabytes: string
}

export function useProfileForm(): ProfileFormModel | { ready: false } {
	const t = useTranslations('profile')
	const tAuth = useTranslations('auth')
	const tValidation = useTranslations('validation')
	const locale = useLocale()
	const { toast } = useToast()
	const { user, setUser, loading } = useAuth()
	const router = useRouter()
	const [name, setName] = React.useState('')
	const [nickname, setNickname] = React.useState('')
	const [nicknameStatus, setNicknameStatus] = React.useState<'idle' | 'available' | 'taken'>('idle')
	const [currentPassword, setCurrentPassword] = React.useState('')
	const [newPassword, setNewPassword] = React.useState('')
	const [newPasswordConfirmation, setNewPasswordConfirmation] = React.useState('')
	const [newPasswordError, setNewPasswordError] = React.useState<string | null>(null)
	const [newPasswordConfirmationError, setNewPasswordConfirmationError] = React.useState<string | null>(null)
	const [pendingPhoto, setPendingPhoto] = React.useState<File | null>(null)
	const [photoPreviewUrl, setPhotoPreviewUrl] = React.useState<string | null>(null)
	const [photoRemoved, setPhotoRemoved] = React.useState(false)
	const [saving, setSaving] = React.useState(false)
	const [exporting, setExporting] = React.useState(false)
	const [deleteConfirm, setDeleteConfirm] = React.useState('')
	const [deletePassword, setDeletePassword] = React.useState('')
	const [deleting, setDeleting] = React.useState(false)
	const [verificationToken, setVerificationToken] = React.useState('')
	const [resendingVerification, setResendingVerification] = React.useState(false)
	const [confirmingVerification, setConfirmingVerification] = React.useState(false)
	const [newEmail, setNewEmail] = React.useState('')
	const [emailChangePassword, setEmailChangePassword] = React.useState('')
	const [changingEmail, setChangingEmail] = React.useState(false)
	const [openAccordion, setOpenAccordion] = React.useState('')
	const [sessions, setSessions] = React.useState<ActiveSessionDto[]>([])
	const [sessionsLoading, setSessionsLoading] = React.useState(false)
	const [sessionsLoaded, setSessionsLoaded] = React.useState(false)
	const [revokingSessionId, setRevokingSessionId] = React.useState<string | null>(null)
	const [revokingOthers, setRevokingOthers] = React.useState(false)
	const [statisticsLoading, setStatisticsLoading] = React.useState(false)
	const [statisticsLoaded, setStatisticsLoaded] = React.useState(false)
	const [statisticsImageCount, setStatisticsImageCount] = React.useState<number | null>(null)
	const [statisticsUsedMegabytes, setStatisticsUsedMegabytes] = React.useState<string | null>(null)
	const photoInputRef = React.useRef<HTMLInputElement>(null)
	/** Evita race: setUser(null) dispara efeito → /login antes de chegar em /account-delete. */
	const skipLoginRedirectRef = React.useRef(false)

	React.useEffect(() => {
		if (!loading && !user && !skipLoginRedirectRef.current) {
			router.replace('/login')
		}
	}, [loading, user, router])

	React.useEffect(() => {
		if (user) {
			setName(user.name ?? '')
			setNickname(user.nickname)
			setNicknameStatus('available')
		}
	}, [user])

	React.useEffect(() => {
		return () => {
			if (photoPreviewUrl) {
				URL.revokeObjectURL(photoPreviewUrl)
			}
		}
	}, [photoPreviewUrl])

	React.useEffect(() => {
		if (!user) {
			return
		}

		const trimmed = nickname.trim()
		if (!trimmed) {
			setNicknameStatus('idle')
			return
		}

		if (canonicalizeNickname(trimmed) === user.nickname) {
			setNicknameStatus('available')
			return
		}

		const handle = window.setTimeout(() => {
			void checkNicknameExists(trimmed)
				.then((exists) => {
					setNicknameStatus(exists ? 'taken' : 'available')
				})
				.catch(() => setNicknameStatus('idle'))
		}, 400)

		return () => window.clearTimeout(handle)
	}, [nickname, user])

	const loadSessions = React.useCallback(async () => {
		setSessionsLoading(true)
		try {
			const result = await listSessionsRequest()
			setSessions(result.sessions)
			setSessionsLoaded(true)
		} catch {
			toast({ variant: 'error', title: t('errorGeneric') })
		} finally {
			setSessionsLoading(false)
		}
	}, [t, toast])

	React.useEffect(() => {
		if (openAccordion === 'active-sessions' && !sessionsLoaded && !sessionsLoading) {
			void loadSessions()
		}
	}, [openAccordion, sessionsLoaded, sessionsLoading, loadSessions])

	const loadStatistics = React.useCallback(async () => {
		setStatisticsLoading(true)
		try {
			const result = await getUserStorageStatsRequest()
			setStatisticsImageCount(result.imageCount)
			setStatisticsUsedMegabytes(formatMegabytes(result.usedBytes, locale))
			setStatisticsLoaded(true)
		} catch {
			toast({ variant: 'error', title: t('errorGeneric') })
		} finally {
			setStatisticsLoading(false)
		}
	}, [locale, t, toast])

	React.useEffect(() => {
		if (openAccordion === 'statistics' && !statisticsLoaded && !statisticsLoading) {
			void loadStatistics()
		}
	}, [openAccordion, statisticsLoaded, statisticsLoading, loadStatistics])

	const resolvePasswordError = (value: string): string | null => {
		const issue = getPasswordPolicyIssue(value)
		if (issue === 'minLength') {
			return t('passwordMinLength')
		}
		if (issue === 'complexity') {
			return t('passwordComplexity')
		}
		return null
	}

	const onPhotoChange = (file: File | null) => {
		if (photoPreviewUrl) {
			URL.revokeObjectURL(photoPreviewUrl)
			setPhotoPreviewUrl(null)
		}

		if (!file) {
			setPendingPhoto(null)
			return
		}

		if (file.size > MAX_PHOTO_BYTES) {
			setPendingPhoto(null)
			toast({ variant: 'error', title: t('photoHelper') })
			return
		}

		setPhotoRemoved(false)
		setPendingPhoto(file)
		setPhotoPreviewUrl(URL.createObjectURL(file))
	}

	const openPhotoPicker = () => {
		photoInputRef.current?.click()
	}

	const markPhotoRemoved = () => {
		onPhotoChange(null)
		setPhotoRemoved(true)
		if (photoInputRef.current) {
			photoInputRef.current.value = ''
		}
	}

	const saveProfile = async (event: React.FormEvent) => {
		event.preventDefault()
		if (!user) {
			return
		}
		if (nicknameStatus === 'taken') {
			toast({ variant: 'error', title: tAuth('nicknameTaken') })
			return
		}

		setSaving(true)
		try {
			let updated = await updateProfileRequest(user.id, {
				name: name.trim() || null,
				nickname,
				...(photoRemoved && !pendingPhoto ? { photoUrl: null } : {}),
			})

			if (pendingPhoto) {
				const dataUrl = await readFileAsDataUrl(pendingPhoto)
				updated = await uploadPhotoRequest(user.id, dataUrl)
				if (photoPreviewUrl) {
					URL.revokeObjectURL(photoPreviewUrl)
				}
				setPendingPhoto(null)
				setPhotoPreviewUrl(null)
			}

			setPhotoRemoved(false)

			setUser(updated)
			toast({ variant: 'success', title: t('successProfile') })
		} catch (error: unknown) {
			const title =
				error instanceof ApiClientError && error.code === 'CONFLICT'
					? tAuth('nicknameTaken')
					: error instanceof ApiClientError && error.code === 'VALIDATION_ERROR'
						? tValidation('nicknameInvalid')
						: t('errorGeneric')
			toast({ variant: 'error', title })
		} finally {
			setSaving(false)
		}
	}

	const savePassword = async (event: React.FormEvent) => {
		event.preventDefault()
		if (!user) {
			return
		}
		const nextPasswordError = resolvePasswordError(newPassword)
		const nextConfirmationError = newPassword !== newPasswordConfirmation ? t('passwordMismatch') : null

		setNewPasswordError(nextPasswordError)
		setNewPasswordConfirmationError(nextConfirmationError)

		if (nextPasswordError || nextConfirmationError) {
			return
		}

		setSaving(true)
		try {
			await changePasswordRequest(user.id, {
				currentPassword,
				newPassword,
				newPasswordConfirmation,
			})
			setCurrentPassword('')
			setNewPassword('')
			setNewPasswordConfirmation('')
			if (!user.hasPassword && user.googleLinked) {
				setUser({ ...user, hasPassword: true })
			}
			toast({ variant: 'success', title: t('successPassword') })
		} catch {
			toast({ variant: 'error', title: t('errorGeneric') })
		} finally {
			setSaving(false)
		}
	}

	const downloadMyData = async () => {
		setExporting(true)
		try {
			const data = await exportUserDataRequest()
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const link = document.createElement('a')
			link.href = url
			link.download = `app-export-${data.exportedAt.slice(0, 10)}.json`
			link.click()
			URL.revokeObjectURL(url)
			toast({ variant: 'success', title: t('successExport') })
		} catch {
			toast({ variant: 'error', title: t('errorGeneric') })
		} finally {
			setExporting(false)
		}
	}

	const deleteConfirmWord = locale === 'en' ? 'DELETE' : locale === 'es' ? 'ELIMINAR' : 'EXCLUIR'

	const onDeleteAccount = async (event: React.FormEvent) => {
		event.preventDefault()
		const googleOnly = Boolean(user && !user.hasPassword && user.googleLinked)
		if (deleteConfirm.trim() !== deleteConfirmWord) {
			return
		}
		if (!googleOnly && !deletePassword) {
			return
		}

		setDeleting(true)
		try {
			const result = await deleteAccountRequest({
				currentPassword: googleOnly ? undefined : deletePassword,
				locale: locale as AppLocale,
			})
			skipLoginRedirectRef.current = true
			setUser(null)
			toast({ variant: 'success', title: t('successDeleteAccount') })
			const params = new URLSearchParams({
				deletedAt: result.deletedAt,
				deadlineAt: result.deadlineAt,
			})
			router.replace(`/account-delete?${params.toString()}`)
		} catch {
			skipLoginRedirectRef.current = false
			toast({ variant: 'error', title: t('errorDeleteAccount') })
		} finally {
			setDeleting(false)
		}
	}

	const resendVerification = async () => {
		setResendingVerification(true)
		try {
			const result = await sendEmailVerificationRequest(locale as AppLocale)
			setUser(result.user)
			toast({
				variant: 'success',
				title: result.sent ? t('successVerificationSent') : t('accountVerified'),
			})
		} catch {
			toast({ variant: 'error', title: t('errorVerificationSent') })
		} finally {
			setResendingVerification(false)
		}
	}

	const confirmVerificationToken = async (event: React.FormEvent) => {
		event.preventDefault()
		const code = normalizeEmailToken(verificationToken)
		if (code.length !== EMAIL_CODE_LENGTH) {
			return
		}

		setConfirmingVerification(true)
		try {
			const result = await confirmEmailChallengeRequest({
				token: code,
				locale: locale as AppLocale,
			})
			setUser(result.user)
			setVerificationToken('')
			setOpenAccordion('')
			toast({ variant: 'success', title: t('verifyEmailSuccess') })
		} catch {
			toast({ variant: 'error', title: t('verifyEmailError') })
		} finally {
			setConfirmingVerification(false)
		}
	}

	const saveEmailChange = async (event: React.FormEvent) => {
		event.preventDefault()
		setChangingEmail(true)
		try {
			const result = await requestEmailChangeRequest({
				password: emailChangePassword,
				newEmail,
				locale: locale as AppLocale,
			})
			setUser(result.user)
			setNewEmail('')
			setEmailChangePassword('')
			toast({
				variant: 'success',
				title: t('successEmailChangeRequested'),
				description: result.willUnlinkGoogle ? t('emailChangeWillUnlinkGoogle') : undefined,
			})
		} catch {
			toast({ variant: 'error', title: t('errorGeneric') })
		} finally {
			setChangingEmail(false)
		}
	}

	const revokeSession = async (sessionId: string) => {
		setRevokingSessionId(sessionId)
		try {
			await revokeSessionRequest(sessionId)
			setSessions((prev) => prev.filter((session) => session.id !== sessionId))
			toast({ variant: 'success', title: t('sessionRevoke') })
		} catch {
			toast({ variant: 'error', title: t('errorGeneric') })
		} finally {
			setRevokingSessionId(null)
		}
	}

	const revokeOthers = async () => {
		setRevokingOthers(true)
		try {
			await revokeOtherSessionsRequest()
			setSessions((prev) => prev.filter((session) => session.current))
			toast({ variant: 'success', title: t('sessionRevokeOthers') })
		} catch {
			toast({ variant: 'error', title: t('errorGeneric') })
		} finally {
			setRevokingOthers(false)
		}
	}

	const formatSessionDate = (iso: string) => {
		try {
			return new Date(iso).toLocaleString(locale)
		} catch {
			return iso
		}
	}

	if (loading || !user) {
		return { ready: false }
	}

	const visiblePhotoUrl = photoRemoved ? null : (photoPreviewUrl ?? user.photoUrl)
	const isVerified = Boolean(user.emailVerifiedAt)
	const emailChangeInProgress = user.emailChallenge === 'change_old' || user.emailChallenge === 'change_new'
	const hasOtherSessions = sessions.some((session) => !session.current)

	return {
		ready: true,
		user,
		name,
		setName,
		nickname,
		setNickname,
		nicknameStatus,
		currentPassword,
		setCurrentPassword,
		newPassword,
		setNewPassword,
		newPasswordConfirmation,
		setNewPasswordConfirmation,
		newPasswordError,
		setNewPasswordError,
		newPasswordConfirmationError,
		setNewPasswordConfirmationError,
		saving,
		exporting,
		deleteConfirm,
		setDeleteConfirm,
		deletePassword,
		setDeletePassword,
		deleting,
		verificationToken,
		setVerificationToken,
		resendingVerification,
		confirmingVerification,
		newEmail,
		setNewEmail,
		emailChangePassword,
		setEmailChangePassword,
		changingEmail,
		openAccordion,
		setOpenAccordion,
		sessions,
		sessionsLoading,
		revokingSessionId,
		revokingOthers,
		photoInputRef,
		visiblePhotoUrl,
		isVerified,
		emailChangeInProgress,
		hasOtherSessions,
		deleteConfirmWord,
		resolvePasswordError,
		onPhotoChange,
		openPhotoPicker,
		markPhotoRemoved,
		saveProfile,
		savePassword,
		downloadMyData,
		onDeleteAccount,
		resendVerification,
		confirmVerificationToken,
		saveEmailChange,
		revokeSession,
		revokeOthers,
		formatSessionDate,
		statisticsLoading,
		statisticsLoaded,
		statisticsImageCount: statisticsImageCount ?? 0,
		statisticsUsedMegabytes: statisticsUsedMegabytes ?? formatMegabytes(0, locale),
	}
}
