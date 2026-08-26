import CookiesManager, { COOKIE_KEYS } from '@/managers/Cookies.manager'
import { SETTINGS_KEYS, type SettingEntry } from '@/managers/Settings.manager'
import type { AppLocale } from '@/constants/texts'
import { ApiClientError, fetchApi, parseApiResponse } from '@/lib/api-error'

export { ApiClientError } from '@/lib/api-error'

export type AuthUser = {
	id: string
	name: string | null
	nickname: string
	email: string
	photoUrl: string | null
	settings: SettingEntry[]
	emailVerifiedAt: string | null
	pendingEmail: string | null
	emailChallenge: 'none' | 'verify' | 'change_old' | 'change_new'
	hasPassword: boolean
	googleLinked: boolean
}

async function parseApi<T>(response: Response): Promise<T> {
	return parseApiResponse<T>(response)
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
	const response = await fetchApi('/api/v1/auth/me', { credentials: 'include' })
	if (response.status === 401) {
		return null
	}
	const data = await parseApi<{ user: AuthUser }>(response)
	return data.user
}

export async function loginRequest(input: {
	identifier: string
	password: string
}): Promise<
	| { deletionDecisionRequired: true; deletedAt: string; deadlineAt: string }
	| { deletionDecisionRequired?: false; user: AuthUser; settings: SettingEntry[] }
> {
	const response = await fetchApi('/api/v1/auth/login', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	return parseApi(response)
}

export async function registerRequest(input: {
	nickname: string
	email: string
	password: string
	passwordConfirmation: string
	birthDate: string
	acceptedTerms: boolean
	acceptedPrivacy: boolean
	settings?: SettingEntry[]
	locale?: AppLocale
}): Promise<{ user: AuthUser }> {
	const response = await fetchApi('/api/v1/auth/register', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	return parseApi(response)
}

export async function sendEmailVerificationRequest(locale?: AppLocale): Promise<{
	user: AuthUser
	sent: boolean
}> {
	const response = await fetchApi('/api/v1/auth/email/verify/send', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(locale ? { locale } : {}),
	})
	return parseApi(response)
}

export async function confirmEmailChallengeRequest(input: {
	token: string
	locale?: AppLocale
}): Promise<{ user: AuthUser }> {
	const response = await fetchApi('/api/v1/auth/email/confirm', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	return parseApi(response)
}

export async function forgotPasswordRequest(input: { email: string; locale?: AppLocale }): Promise<void> {
	const response = await fetchApi('/api/v1/auth/password/forgot', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	await parseApi(response)
}

export async function resetPasswordRequest(input: {
	token: string
	newPassword: string
	newPasswordConfirmation: string
}): Promise<void> {
	const response = await fetchApi('/api/v1/auth/password/reset', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	await parseApi(response)
}

export async function requestEmailChangeRequest(input: {
	password: string
	newEmail: string
	locale?: AppLocale
}): Promise<{ user: AuthUser; willUnlinkGoogle: boolean }> {
	const response = await fetchApi('/api/v1/users/me/email/change', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	return parseApi(response)
}

export async function logoutRequest(): Promise<void> {
	const response = await fetchApi('/api/v1/auth/logout', {
		method: 'POST',
		credentials: 'include',
	})
	if (!response.ok && response.status !== 204) {
		throw new ApiClientError('Logout failed')
	}
}

export async function checkNicknameExists(nickname: string): Promise<boolean> {
	const response = await fetchApi(`/api/v1/nickname/${encodeURIComponent(nickname)}`, {
		credentials: 'include',
	})
	if (response.status === 404) {
		return false
	}
	if (response.status === 200) {
		return true
	}
	const payload = (await response.json()) as { message?: string }
	throw new ApiClientError(payload.message || 'Nickname check failed')
}

export async function updateProfileRequest(
	userId: string,
	body: { name?: string | null; nickname?: string; photoUrl?: null }
): Promise<AuthUser> {
	const response = await fetchApi(`/api/v1/users/${userId}`, {
		method: 'PATCH',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	const data = await parseApi<{ user: AuthUser }>(response)
	return data.user
}

export async function changePasswordRequest(
	userId: string,
	body: {
		currentPassword: string
		newPassword: string
		newPasswordConfirmation: string
	}
): Promise<void> {
	const response = await fetchApi(`/api/v1/users/${userId}/password`, {
		method: 'PATCH',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	await parseApi(response)
}

export async function uploadPhotoRequest(userId: string, dataUrl: string): Promise<AuthUser> {
	const response = await fetchApi(`/api/v1/users/${userId}/photo`, {
		method: 'PATCH',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ image: dataUrl }),
	})
	const data = await parseApi<{ user: AuthUser }>(response)
	return data.user
}

export async function setUserSettingRequest(
	userId: string,
	key: string,
	value: string | number | boolean | null
): Promise<AuthUser> {
	const response = await fetchApi(`/api/v1/users/${userId}/settings`, {
		method: 'PATCH',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ key, value }),
	})
	const data = await parseApi<{ user: AuthUser }>(response)
	return data.user
}

export async function exportUserDataRequest(): Promise<{
	exportedAt: string
	user: AuthUser
	images: Array<{
		id: string
		url: string
		title: string | null
		description: string | null
		tags: string[]
		visibility: string
		createdAt: string
	}>
}> {
	const response = await fetchApi('/api/v1/users/me/export', {
		credentials: 'include',
	})
	return parseApi(response)
}

export async function deleteAccountRequest(input: {
	currentPassword?: string
	locale?: AppLocale
}): Promise<{ ok: true; deletedAt: string; deadlineAt: string }> {
	const response = await fetchApi('/api/v1/users/me', {
		method: 'DELETE',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	return parseApi(response)
}

export async function getAccountDeletionStatusRequest(): Promise<{ deletedAt: string; deadlineAt: string }> {
	const response = await fetchApi('/api/v1/users/me/deletion', {
		credentials: 'include',
	})
	return parseApi(response)
}

export async function cancelAccountDeletionRequest(locale?: AppLocale): Promise<{
	user: AuthUser
	settings: SettingEntry[]
}> {
	const response = await fetchApi('/api/v1/users/me/deletion/cancel', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(locale ? { locale } : {}),
	})
	return parseApi(response)
}

export async function keepAccountDeletionRequest(): Promise<void> {
	const response = await fetchApi('/api/v1/users/me/deletion/keep', {
		method: 'POST',
		credentials: 'include',
	})
	await parseApi(response)
}

export type ActiveSessionDto = {
	id: string
	device: string
	createdAt: string
	exp: string
	current: boolean
}

export type UserStorageStatsDto = {
	imageCount: number
	usedBytes: number
}

export async function getUserStorageStatsRequest(): Promise<UserStorageStatsDto> {
	const response = await fetchApi('/api/v1/users/me/stats', {
		credentials: 'include',
	})
	return parseApi(response)
}

export async function listSessionsRequest(): Promise<{ sessions: ActiveSessionDto[] }> {
	const response = await fetchApi('/api/v1/users/me/sessions', {
		credentials: 'include',
	})
	return parseApi(response)
}

export async function revokeSessionRequest(sessionId: string): Promise<void> {
	const response = await fetchApi(`/api/v1/users/me/sessions/${encodeURIComponent(sessionId)}`, {
		method: 'DELETE',
		credentials: 'include',
	})
	await parseApi(response)
}

export async function revokeOtherSessionsRequest(): Promise<{ ok: true; revokedCount: number }> {
	const response = await fetchApi('/api/v1/users/me/sessions', {
		method: 'DELETE',
		credentials: 'include',
	})
	return parseApi(response)
}

export async function fetchGoogleOAuthReady(): Promise<boolean> {
	const response = await fetchApi('/api/v1/auth/google/ready', { credentials: 'include' })
	if (!response.ok) {
		return false
	}
	const data = await parseApi<{ ready: boolean }>(response)
	return data.ready === true
}

/** Navigates to Google OAuth start (full page redirect). */
export function startGoogleOAuth(returnUrl?: string): void {
	const params = new URLSearchParams()
	if (returnUrl) {
		params.set('returnUrl', returnUrl)
	}
	const query = params.toString()
	window.location.assign(`/api/v1/auth/google/start${query ? `?${query}` : ''}`)
}

export async function completeGoogleRegistrationRequest(input: {
	birthDate: string
	acceptedTerms: true
	acceptedPrivacy: true
}): Promise<{ user: AuthUser; returnUrl: string }> {
	const response = await fetchApi('/api/v1/auth/google/complete-registration', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	return parseApi(response)
}

export async function linkGoogleAccountRequest(password: string): Promise<{ user: AuthUser; returnUrl: string }> {
	const response = await fetchApi('/api/v1/auth/google/link', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ password }),
	})
	return parseApi(response)
}

/**
 * Aplica settings da nuvem sobre cookies locais (nuvem vence).
 */
export function applyCloudSettingsToLocal(settings: SettingEntry[]): {
	theme?: 'light' | 'dark'
	locale?: AppLocale
} {
	const result: { theme?: 'light' | 'dark'; locale?: AppLocale } = {}

	for (const entry of settings) {
		if (entry.key === SETTINGS_KEYS.DARK_MODE) {
			const dark = entry.value === true || entry.value === 'true'
			const theme = dark ? 'dark' : 'light'
			CookiesManager.set(COOKIE_KEYS.THEME, theme)
			result.theme = theme
		}
		if (entry.key === SETTINGS_KEYS.LANGUAGE && typeof entry.value === 'string') {
			CookiesManager.set(COOKIE_KEYS.LOCALE, entry.value)
			result.locale = entry.value as AppLocale
		}
	}

	return result
}
