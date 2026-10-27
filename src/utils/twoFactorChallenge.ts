import { SignJWT, jwtVerify } from 'jose'
import { getJwtAudience, getJwtIssuer, getJwtSecret } from '@/config/env'
import { UnauthorizedError } from '@/errors'

/** Quanto tempo o usuário tem para digitar o código depois de acertar a senha. */
export const TWO_FACTOR_CHALLENGE_TTL_SECONDS = 5 * 60

const PURPOSE = '2fa-login'

/** Audiência própria: o desafio nunca é aceito como token de sessão (`verifySessionToken` exige a audiência da sessão). */
function challengeAudience(): string {
	return `${getJwtAudience()}:2fa`
}

/** Emitido após a senha correta quando a conta tem 2FA; só serve para `POST /auth/2fa/verify`. */
export async function signTwoFactorChallenge(userId: string): Promise<string> {
	const nowSeconds = Math.floor(Date.now() / 1000)
	return new SignJWT({ userId, purpose: PURPOSE })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuer(getJwtIssuer())
		.setAudience(challengeAudience())
		.setIssuedAt(nowSeconds)
		.setExpirationTime(nowSeconds + TWO_FACTOR_CHALLENGE_TTL_SECONDS)
		.sign(getJwtSecret())
}

/** Devolve o `userId`. Qualquer falha (assinatura, expiração, finalidade) responde o mesmo 401. */
export async function verifyTwoFactorChallenge(token: string): Promise<string> {
	try {
		const { payload } = await jwtVerify(token, getJwtSecret(), {
			issuer: getJwtIssuer(),
			audience: challengeAudience(),
		})
		if (payload.purpose !== PURPOSE || typeof payload.userId !== 'string' || !payload.userId) {
			throw new UnauthorizedError('Invalid two-factor challenge')
		}
		return payload.userId
	} catch {
		throw new UnauthorizedError('Invalid two-factor challenge')
	}
}
