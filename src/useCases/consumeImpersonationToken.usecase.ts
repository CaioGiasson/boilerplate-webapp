import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { UnauthorizedError, ValidationError } from '@/errors'
import SessionEventRepository from '@/repositories/SessionEvent.repository'
import UserRepository from '@/repositories/User.repository'
import { isAdminRole } from '@/constants/userRole'
import { isImpersonationSession, verifySessionToken, type VerifiedSession } from '@/utils/session'

type Input = {
	token: string
}

type Output = {
	token: string
	/** Unix seconds */
	exp: number
}

const INVALID_TOKEN_MESSAGE = 'Invalid impersonation token'

/**
 * Valida o link de impersonamento. Toda falha responde o mesmo 401, sem revelar o motivo.
 * O token é o próprio JWT de sessão: quem tem o link vira o alvo até `exp`; não há revogação antes disso
 * além do logout, da troca de senha do alvo (`sessionsRevokedAt`) ou do admin deixar de ser ADMIN.
 */
export default class ConsumeImpersonationToken extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		if (!input.token?.trim()) throw new ValidationError('Token is required')
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const session = await this.verifyImpersonationToken(input.token)

		if (await new SessionEventRepository(injectables.prisma).existsForJti(session.jti)) {
			throw new UnauthorizedError(INVALID_TOKEN_MESSAGE)
		}

		const users = new UserRepository(injectables.prisma)
		const target = await users.findById(session.userId)
		if (!target) throw new UnauthorizedError(INVALID_TOKEN_MESSAGE)
		if (target.sessionsRevokedAt && session.iat * 1000 < target.sessionsRevokedAt.getTime()) {
			throw new UnauthorizedError(INVALID_TOKEN_MESSAGE)
		}

		const admin = session.impersonatedBy ? await users.findById(session.impersonatedBy) : null
		if (!admin || !isAdminRole(admin.role)) throw new UnauthorizedError(INVALID_TOKEN_MESSAGE)

		return { token: session.token, exp: session.exp }
	}

	private async verifyImpersonationToken(token: string): Promise<VerifiedSession> {
		let session: VerifiedSession
		try {
			session = await verifySessionToken(token.trim())
		} catch {
			throw new UnauthorizedError(INVALID_TOKEN_MESSAGE)
		}
		if (!isImpersonationSession(session)) throw new UnauthorizedError(INVALID_TOKEN_MESSAGE)

		return session
	}
}
