import type { Prisma } from '@prisma/client'
import LogManager from '@/managers/Log.manager'
import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import ActiveSessionRepository from '@/repositories/ActiveSession.repository'
import UserRepository, { isUniqueConstraintError, type PublicUser } from '@/repositories/User.repository'
import SettingsManager, { SETTINGS_KEYS, parseUserSettingsList, type SettingEntry } from '@/managers/Settings.manager'
import { ConflictError, ValidationError } from '@/errors'
import { getAppBaseUrl, getJwtTtlSeconds } from '@/config/env'
import { LEGAL_VERSIONS } from '@/constants/legal'
import { getEmailService } from '@/services/Email/Email.service'
import type { EmailPort } from '@/services/Email/email.port'
import { buildEmailVerificationMail } from '@/utils/emailMessages'
import { createEmailToken, emailTokenExpiresAt } from '@/utils/emailToken'
import { assertPasswordPolicy, hashPassword } from '@/utils/password'
import { createSessionDeviceId, signSessionToken } from '@/utils/session'
import { toPublicUserWithSignedPhoto } from '@/utils/publicUserAccess'
import { validateAdultBirthDate } from '@/utils/ageGate'
import { normalizeNickname } from '@/utils/nickname'

type Input = {
	nickname: string
	email: string
	password: string
	passwordConfirmation: string
	birthDate: string
	device?: string
	acceptedTerms: boolean
	acceptedPrivacy: boolean
	settings?: SettingEntry[]
	locale?: string
}

type Output = {
	user: PublicUser
	token: string
	ttlSeconds: number
}

export default class RegisterUser extends UseCaseMasterPort<Input, Output> {
	constructor(private readonly emailService: EmailPort = getEmailService()) {
		super()
	}

	async validate(input: Input): Promise<void> {
		normalizeNickname(input.nickname ?? '')
		if (!input.email?.trim()) {
			throw new ValidationError('Email is required')
		}
		if (input.password !== input.passwordConfirmation) {
			throw new ValidationError('Password confirmation does not match')
		}
		assertPasswordPolicy(input.password)
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
		parseUserSettingsList(input.settings)
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const userRepository = new UserRepository(injectables.prisma)
		const nickname = normalizeNickname(input.nickname)

		const existingNick = await userRepository.findByNickname(nickname)
		const existingEmail = await userRepository.findByEmail(input.email.trim())
		if (existingNick || existingEmail) {
			throw new ConflictError('Could not complete registration')
		}

		const birthCheck = validateAdultBirthDate(input.birthDate.trim())
		if (!birthCheck.ok) {
			if (birthCheck.reason === 'underage') {
				throw new ValidationError('You must be at least 18 years old')
			}
			throw new ValidationError('Invalid birth date')
		}

		const passwordHash = await hashPassword(input.password)
		const settings = normalizeInitialSettings(input.settings)

		try {
			const acceptedAt = new Date()
			const user = await userRepository.create({
				nickname,
				email: input.email.trim(),
				passwordHash,
				settings,
				acceptedTermsAt: acceptedAt,
				acceptedPrivacyAt: acceptedAt,
				termsVersion: LEGAL_VERSIONS.terms,
				privacyVersion: LEGAL_VERSIONS.privacy,
				dateOfBirth: birthCheck.date,
				ageVerifiedAt: acceptedAt,
			})

			const { token: emailToken, hash } = createEmailToken()
			const userWithChallenge = await userRepository.setEmailChallenge(user.id, {
				tokenHash: hash,
				purpose: 'verify',
				expiresAt: emailTokenExpiresAt(),
				pendingEmail: null,
			})

			try {
				const mail = buildEmailVerificationMail({
					appBaseUrl: getAppBaseUrl(),
					locale: input.locale?.trim() || 'en',
					token: emailToken,
					purpose: 'verify',
				})
				await this.emailService.send({
					to: user.email,
					subject: mail.subject,
					text: mail.text,
				})
			} catch (error: unknown) {
				LogManager.error('Failed to send verification email after register', error)
			}

			const device = createSessionDeviceId()
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

			return {
				user: await toPublicUserWithSignedPhoto(userWithChallenge),
				token,
				ttlSeconds: getJwtTtlSeconds(),
			}
		} catch (error: unknown) {
			if (isUniqueConstraintError(error)) {
				throw new ConflictError('Could not complete registration')
			}
			throw error
		}
	}
}

/**
 * Garante settings iniciais sem keys duplicadas, a partir do dispositivo.
 */
function normalizeInitialSettings(settings: SettingEntry[] | undefined): SettingEntry[] {
	let user = { settings: [] as SettingEntry[] }

	for (const entry of parseUserSettingsList(settings)) {
		user = { settings: SettingsManager.set(user, entry.key, entry.value as Prisma.JsonValue) }
	}

	const hasDarkMode = SettingsManager.get(user, SETTINGS_KEYS.DARK_MODE) !== undefined
	const hasLanguage = SettingsManager.get(user, SETTINGS_KEYS.LANGUAGE) !== undefined

	if (!hasDarkMode) {
		user = { settings: SettingsManager.set(user, SETTINGS_KEYS.DARK_MODE, false) }
	}
	if (!hasLanguage) {
		user = { settings: SettingsManager.set(user, SETTINGS_KEYS.LANGUAGE, 'pt') }
	}

	return SettingsManager.list(user)
}
