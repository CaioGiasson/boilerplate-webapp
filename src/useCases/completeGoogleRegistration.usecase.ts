import LogManager from '@/managers/Log.manager'
import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import ActiveSessionRepository from '@/repositories/ActiveSession.repository'
import UserRepository, { isUniqueConstraintError, type PublicUser } from '@/repositories/User.repository'
import SettingsManager, { SETTINGS_KEYS, type SettingEntry } from '@/managers/Settings.manager'
import { ConflictError, UnauthorizedError, ValidationError } from '@/errors'
import { getJwtTtlSeconds } from '@/config/env'
import { LEGAL_VERSIONS } from '@/constants/legal'
import { PROFILE_PHOTO_MAX_BYTES, PROFILE_PHOTO_MIME_TYPES } from '@/useCases/uploadUserPhoto.usecase'
import FileManager from '@/services/Storage/File.manager'
import RemoteFetchService from '@/services/Storage/RemoteFetch.service'
import { allocateGoogleNickname } from '@/utils/googleNickname'
import { verifyGoogleOAuthPendingToken } from '@/utils/googleOAuthCookies'
import { toPublicUserWithSignedPhoto } from '@/utils/publicUserAccess'
import { validateAdultBirthDate } from '@/utils/ageGate'
import { resolveSessionDeviceId, signSessionToken } from '@/utils/session'
import { safeReturnUrl } from '@/utils/safeReturnUrl'
import type { Prisma } from '@prisma/client'

type Input = {
	birthDate: string
	acceptedTerms: boolean
	acceptedPrivacy: boolean
	pendingCookie?: string | null
	deviceCookie?: string | null
}

type Output = {
	user: PublicUser
	token: string
	ttlSeconds: number
	device: string
	returnUrl: string
}

export default class CompleteGoogleRegistration extends UseCaseMasterPort<Input, Output> {
	constructor(private readonly remoteFetchService = new RemoteFetchService()) {
		super()
	}

	async validate(input: Input): Promise<void> {
		if (!input.pendingCookie?.trim()) {
			throw new UnauthorizedError('Missing Google registration session')
		}
		if (input.acceptedTerms !== true) {
			throw new ValidationError('Terms of use must be accepted')
		}
		if (input.acceptedPrivacy !== true) {
			throw new ValidationError('Privacy policy must be accepted')
		}
		if (!input.birthDate?.trim()) {
			throw new ValidationError('Birth date is required')
		}
		const birthCheck = validateAdultBirthDate(input.birthDate.trim())
		if (!birthCheck.ok) {
			if (birthCheck.reason === 'underage') {
				throw new ValidationError('You must be at least 18 years old')
			}
			throw new ValidationError('Invalid birth date')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const pending = await verifyGoogleOAuthPendingToken(input.pendingCookie!.trim())
		if (pending.flow !== 'register') {
			throw new UnauthorizedError('Invalid Google registration session')
		}

		const birthCheck = validateAdultBirthDate(input.birthDate.trim())
		if (!birthCheck.ok) {
			if (birthCheck.reason === 'underage') {
				throw new ValidationError('You must be at least 18 years old')
			}
			throw new ValidationError('Invalid birth date')
		}

		const userRepository = new UserRepository(injectables.prisma)
		const existing = await userRepository.findByEmail(pending.email)
		if (existing) {
			// Race: another request created the account — treat as login if already Google-linked or passwordless.
			if (existing.googleLinkedAt || !existing.passwordHash) {
				let user = existing
				if (!user.googleLinkedAt) {
					user = await userRepository.linkGoogle(user.id)
				}
				return this.mintSession(user, input.deviceCookie, pending.returnUrl, injectables)
			}
			throw new ConflictError('Could not complete registration')
		}

		const nickname = await allocateGoogleNickname(pending.email, async (candidate) => {
			const taken = await userRepository.findByNickname(candidate)
			return Boolean(taken)
		})

		const name = pending.name?.trim() || nickname
		const acceptedAt = new Date()
		const settings = defaultSettings()

		try {
			const user = await userRepository.create({
				nickname,
				email: pending.email,
				passwordHash: null,
				name,
				photoUrl: null,
				googleLinkedAt: acceptedAt,
				emailVerifiedAt: pending.emailVerified ? acceptedAt : null,
				settings,
				acceptedTermsAt: acceptedAt,
				acceptedPrivacyAt: acceptedAt,
				termsVersion: LEGAL_VERSIONS.terms,
				privacyVersion: LEGAL_VERSIONS.privacy,
				dateOfBirth: birthCheck.date,
				ageVerifiedAt: acceptedAt,
			})

			let photoUrl: string | null = null
			if (pending.picture) {
				photoUrl = await this.importAvatarBestEffort(user.id, pending.picture, injectables.prisma)
				if (photoUrl) {
					await userRepository.updateProfile(user.id, { photoUrl })
				}
			}

			const finalUser = photoUrl ? { ...user, photoUrl } : user
			return this.mintSession(finalUser, input.deviceCookie, pending.returnUrl, injectables)
		} catch (error: unknown) {
			if (isUniqueConstraintError(error)) {
				const raced = await userRepository.findByEmail(pending.email)
				if (raced && (raced.googleLinkedAt || !raced.passwordHash)) {
					let user = raced
					if (!user.googleLinkedAt) {
						user = await userRepository.linkGoogle(user.id)
					}
					return this.mintSession(user, input.deviceCookie, pending.returnUrl, injectables)
				}
				throw new ConflictError('Could not complete registration')
			}
			throw error
		}
	}

	private async mintSession(
		user: Awaited<ReturnType<UserRepository['create']>>,
		deviceCookie: string | null | undefined,
		returnUrl: string,
		injectables: Injectables
	): Promise<Output> {
		const device = resolveSessionDeviceId(deviceCookie)
		const { token, jti, exp } = await signSessionToken({
			userId: user.id,
			device,
		})

		const activeSessionRepository = new ActiveSessionRepository(injectables.prisma)
		await activeSessionRepository.create({
			userId: user.id,
			jti,
			device,
			exp,
		})

		try {
			const userRepository = new UserRepository(injectables.prisma)
			await userRepository.updateLastLoginDevice(user.id, device)
		} catch (error: unknown) {
			LogManager.error('Failed to persist lastLoginDevice after Google registration', error)
		}

		return {
			user: await toPublicUserWithSignedPhoto(user),
			token,
			ttlSeconds: getJwtTtlSeconds(),
			device,
			returnUrl: safeReturnUrl(returnUrl),
		}
	}

	private async importAvatarBestEffort(
		ownerId: string,
		pictureUrl: string,
		prisma: Prisma.TransactionClient
	): Promise<string | null> {
		try {
			const remote = await this.remoteFetchService.fetchImage(pictureUrl)
			if (!PROFILE_PHOTO_MIME_TYPES.includes(remote.mimeType as (typeof PROFILE_PHOTO_MIME_TYPES)[number])) {
				return null
			}
			if (remote.buffer.byteLength > PROFILE_PHOTO_MAX_BYTES) {
				return null
			}
			const fileManager = FileManager.create(prisma)
			return await fileManager.storeAvatar({
				buffer: remote.buffer,
				mimeType: remote.mimeType,
				ownerId,
			})
		} catch (error: unknown) {
			LogManager.error('Failed to import Google profile photo', error)
			return null
		}
	}
}

function defaultSettings(): SettingEntry[] {
	let user = { settings: [] as SettingEntry[] }
	user = { settings: SettingsManager.set(user, SETTINGS_KEYS.DARK_MODE, false) }
	user = { settings: SettingsManager.set(user, SETTINGS_KEYS.LANGUAGE, 'pt') }
	return SettingsManager.list(user)
}
