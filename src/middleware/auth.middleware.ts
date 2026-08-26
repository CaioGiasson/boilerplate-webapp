import { NextRequest } from 'next/server'
import ActiveSessionRepository from '@/repositories/ActiveSession.repository'
import SessionEventRepository from '@/repositories/SessionEvent.repository'
import UserRepository from '@/repositories/User.repository'
import { ForbiddenError, UnauthorizedError } from '@/errors'
import { isWithinAccountDeletionQuarantine } from '@/constants/accountDeletion'
import { readSessionCookieValue, verifySessionToken, type VerifiedSession } from '@/utils/session'
import type { Prisma } from '@prisma/client'

/**
 * Middleware de autenticação para rotas protegidas (runtime Node).
 * Valida JWT, ausência em SessionEvents, usuário ativo e opcionalmente o :id do recurso.
 * Self-heal: cria ActiveSession a partir das claims se o jti ainda não estiver no store.
 */
export async function requireAuth(
	request: NextRequest,
	prisma: Prisma.TransactionClient,
	options?: { userIdParam?: string }
): Promise<VerifiedSession> {
	const token = readSessionCookieValue(request.cookies)
	if (!token) {
		throw new UnauthorizedError('Authentication required')
	}

	const session = await verifySessionToken(token)
	const sessionEventRepository = new SessionEventRepository(prisma)
	const revoked = await sessionEventRepository.existsForJti(session.jti)

	if (revoked) {
		throw new UnauthorizedError('Session has been revoked')
	}

	const userRepository = new UserRepository(prisma)
	const user = await userRepository.findById(session.userId)
	if (!user) {
		throw new UnauthorizedError('Authentication required')
	}

	if (user.sessionsRevokedAt && session.iat * 1000 < user.sessionsRevokedAt.getTime()) {
		throw new UnauthorizedError('Session has been revoked')
	}

	const activeSessionRepository = new ActiveSessionRepository(prisma)
	const exists = await activeSessionRepository.existsForJti(session.jti)
	if (!exists) {
		await activeSessionRepository.upsertFromClaims({
			userId: session.userId,
			jti: session.jti,
			device: session.device,
			exp: session.exp,
		})
	}

	if (options?.userIdParam && options.userIdParam !== session.userId) {
		throw new ForbiddenError('You cannot access this resource')
	}

	return session
}

/**
 * Auth for account-deletion decision endpoints while the user is in quarantine.
 * Accepts a session for a soft-deleted user within the 30-day restore window.
 */
export async function requireAuthForDeletionDecision(
	request: NextRequest,
	prisma: Prisma.TransactionClient
): Promise<VerifiedSession & { deletedAt: Date }> {
	const token = readSessionCookieValue(request.cookies)
	if (!token) {
		throw new UnauthorizedError('Authentication required')
	}

	const session = await verifySessionToken(token)
	const sessionEventRepository = new SessionEventRepository(prisma)
	const revoked = await sessionEventRepository.existsForJti(session.jti)
	if (revoked) {
		throw new UnauthorizedError('Session has been revoked')
	}

	const userRepository = new UserRepository(prisma)
	const user = await userRepository.findByIdIncludingDeleted(session.userId)
	if (!user?.deletedAt) {
		throw new UnauthorizedError('Authentication required')
	}

	if (!isWithinAccountDeletionQuarantine(user.deletedAt)) {
		throw new UnauthorizedError('Account deletion quarantine has expired', 'ACCOUNT_DELETION_EXPIRED')
	}

	if (user.sessionsRevokedAt && session.iat * 1000 < user.sessionsRevokedAt.getTime()) {
		throw new UnauthorizedError('Session has been revoked')
	}

	const activeSessionRepository = new ActiveSessionRepository(prisma)
	const exists = await activeSessionRepository.existsForJti(session.jti)
	if (!exists) {
		await activeSessionRepository.upsertFromClaims({
			userId: session.userId,
			jti: session.jti,
			device: session.device,
			exp: session.exp,
		})
	}

	return { ...session, deletedAt: user.deletedAt }
}

/**
 * Optional auth for public routes. Invalid, revoked, or missing sessions become `null` (never throw).
 */
export async function tryAuthFromToken(
	token: string | null | undefined,
	prisma: Prisma.TransactionClient
): Promise<VerifiedSession | null> {
	if (!token) {
		return null
	}

	try {
		const session = await verifySessionToken(token)
		const sessionEventRepository = new SessionEventRepository(prisma)
		const revoked = await sessionEventRepository.existsForJti(session.jti)
		if (revoked) {
			return null
		}

		const userRepository = new UserRepository(prisma)
		const user = await userRepository.findById(session.userId)
		if (!user) {
			return null
		}

		if (user.sessionsRevokedAt && session.iat * 1000 < user.sessionsRevokedAt.getTime()) {
			return null
		}

		const activeSessionRepository = new ActiveSessionRepository(prisma)
		const exists = await activeSessionRepository.existsForJti(session.jti)
		if (!exists) {
			await activeSessionRepository.upsertFromClaims({
				userId: session.userId,
				jti: session.jti,
				device: session.device,
				exp: session.exp,
			})
		}

		return session
	} catch {
		return null
	}
}

export async function tryAuth(request: NextRequest, prisma: Prisma.TransactionClient): Promise<VerifiedSession | null> {
	return tryAuthFromToken(readSessionCookieValue(request.cookies), prisma)
}

export function readSessionTokenFromRequest(request: NextRequest): string | null {
	return readSessionCookieValue(request.cookies)
}
