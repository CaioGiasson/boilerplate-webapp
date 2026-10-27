import LogManager from '@/managers/Log.manager'
import type { Injectables } from '@/masterPorts/UseCase.masterport'
import ActiveSessionRepository from '@/repositories/ActiveSession.repository'
import UserRepository, { type PublicUser, type UserEntity } from '@/repositories/User.repository'
import { getJwtTtlSeconds } from '@/config/env'
import { accountDeletionDeadline } from '@/constants/accountDeletion'
import type { EmailPort } from '@/services/Email/email.port'
import { buildNewLoginMail } from '@/utils/emailMessages'
import { resolveSessionDeviceId, signSessionToken } from '@/utils/session'
import { toPublicUserWithSignedPhoto } from '@/utils/publicUserAccess'
import SettingsManager, { type SettingEntry } from '@/managers/Settings.manager'

export type SessionOutput = {
	kind: 'session'
	user: PublicUser
	token: string
	ttlSeconds: number
	settings: SettingEntry[]
	device: string
}

export type DeletionDecisionOutput = {
	kind: 'deletion_decision'
	token: string
	ttlSeconds: number
	device: string
	deletedAt: Date
	deadlineAt: Date
}

export type CompletedLogin = SessionOutput | DeletionDecisionOutput

/**
 * Abre a sessão depois que a identidade já foi provada (senha e, se a conta tem, o segundo fator).
 *
 * Conta em quarentena de exclusão recebe uma sessão só para decidir (cancelar ou manter).
 *
 * New-login alert heuristic (SEC-I15-C): resolve o device do cookie HttpOnly (ou cria um). Se `emailVerifiedAt`
 * está preenchido e (`lastLoginDevice` é nulo ou diferente), envia `buildNewLoginMail` (melhor esforço) e grava
 * `lastLoginDevice`. Conta sem e-mail verificado nunca recebe o alerta. O mesmo navegador mantém o cookie.
 */
export async function completeLogin(input: {
	user: UserEntity
	deviceCookie?: string | null
	injectables: Injectables
	emailService: EmailPort
}): Promise<CompletedLogin> {
	const { user, injectables } = input
	const device = resolveSessionDeviceId(input.deviceCookie)
	const { token, jti, exp } = await signSessionToken({ userId: user.id, device })

	await new ActiveSessionRepository(injectables.prisma).create({ userId: user.id, jti, device, exp })

	if (user.deletedAt) {
		return {
			kind: 'deletion_decision',
			token,
			ttlSeconds: getJwtTtlSeconds(),
			device,
			deletedAt: user.deletedAt,
			deadlineAt: accountDeletionDeadline(user.deletedAt),
		}
	}

	const isNewDevice = user.lastLoginDevice == null || user.lastLoginDevice !== device
	if (user.emailVerifiedAt && isNewDevice) {
		try {
			const mail = buildNewLoginMail()
			await input.emailService.send({ to: user.email, subject: mail.subject, text: mail.text })
		} catch (error: unknown) {
			LogManager.error('Failed to send new-login email', error)
		}
	}

	try {
		await new UserRepository(injectables.prisma).updateLastLoginDevice(user.id, device)
	} catch (error: unknown) {
		LogManager.error('Failed to persist lastLoginDevice after login', error)
	}

	return {
		kind: 'session',
		user: await toPublicUserWithSignedPhoto(user),
		token,
		ttlSeconds: getJwtTtlSeconds(),
		settings: SettingsManager.list(user),
		device,
	}
}
