import { NextRequest } from 'next/server'
import changePasswordRoute from '@/controllers/User/routes/changePassword.route'
import deleteAccountRoute from '@/controllers/User/routes/deleteAccount.route'
import exportUserDataRoute from '@/controllers/User/routes/exportUserData.route'
import requestEmailChangeRoute from '@/controllers/User/routes/requestEmailChange.route'
import revokeOtherSessionsRoute from '@/controllers/User/routes/revokeOtherSessions.route'
import revokeSessionRoute from '@/controllers/User/routes/revokeSession.route'
import cancelAccountDeletionRoute from '@/controllers/User/routes/cancelAccountDeletion.route'
import keepAccountDeletionRoute from '@/controllers/User/routes/keepAccountDeletion.route'
import sendEmailVerificationRoute from '@/controllers/Auth/routes/sendEmailVerification.route'
import subscribeRoute from '@/controllers/Push/routes/subscribe.route'
import unsubscribeRoute from '@/controllers/Push/routes/unsubscribe.route'
import sendTestRoute from '@/controllers/Push/routes/sendTest.route'
import listAdminUsersRoute from '@/controllers/Admin/routes/listUsers.route'
import createImpersonationTokenRoute from '@/controllers/Admin/routes/createImpersonationToken.route'

/**
 * Garante a fiação do bloqueio de impersonamento: toda rota destrutiva/de conta responde 403 e nunca chega ao use case.
 * Rota nova que precise do bloqueio entra nesta lista (rota esquecida = teste esquecido = brecha).
 */
const impersonationSession = {
	userId: 'target-1',
	device: 'Admin Impersonation',
	token: 't',
	jti: 'jti-1',
	exp: 9_999_999_999,
	iat: 1,
	sessionType: 'IMPERSONATION' as const,
	impersonatedBy: 'admin-1',
}

jest.mock('@/managers/Db.manager', () => ({ getPrismaClient: () => ({}) }))
jest.mock('@/middleware/auth.middleware', () => ({
	...jest.requireActual('@/middleware/auth.middleware'),
	requireAuth: jest.fn(async () => impersonationSession),
	requireAuthForDeletionDecision: jest.fn(async () => ({ ...impersonationSession, deletedAt: new Date() })),
}))

/** Qualquer use case acessado nas dependências falha o teste se for executado. */
const dependencies = new Proxy(
	{},
	{
		get: () => ({
			run: () => {
				throw new Error('use case must not run during impersonation')
			},
		}),
	}
)

function request(method: string): NextRequest {
	return new NextRequest('http://localhost:3000/api/v1/x', {
		method,
		headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
		body: method === 'GET' ? undefined : '{}',
	})
}

type RouteCall = (request: NextRequest) => Promise<Response>

const BLOCKED: Array<[string, string, RouteCall]> = [
	['PATCH users/{id}/password', 'PATCH', (req) => changePasswordRoute(req, dependencies as never, 'target-1')],
	['DELETE users/me', 'DELETE', (req) => deleteAccountRoute(req, dependencies as never)],
	['GET users/me/export', 'GET', (req) => exportUserDataRoute(req, dependencies as never)],
	['POST users/me/email/change', 'POST', (req) => requestEmailChangeRoute(req, dependencies as never)],
	['DELETE users/me/sessions', 'DELETE', (req) => revokeOtherSessionsRoute(req, dependencies as never)],
	['DELETE users/me/sessions/{id}', 'DELETE', (req) => revokeSessionRoute(req, dependencies as never, 's1')],
	['POST users/me/deletion/cancel', 'POST', (req) => cancelAccountDeletionRoute(req, dependencies as never)],
	['POST users/me/deletion/keep', 'POST', (req) => keepAccountDeletionRoute(req, dependencies as never)],
	['POST auth/email/verify/send', 'POST', (req) => sendEmailVerificationRoute(req, dependencies as never)],
	['POST push/subscriptions', 'POST', (req) => subscribeRoute(req, dependencies as never)],
	['DELETE push/subscriptions', 'DELETE', (req) => unsubscribeRoute(req, dependencies as never)],
	['POST push/test', 'POST', (req) => sendTestRoute(req, dependencies as never)],
	['GET admin/users', 'GET', (req) => listAdminUsersRoute(req, dependencies as never)],
	[
		'POST admin/users/{id}/impersonation-token',
		'POST',
		(req) => createImpersonationTokenRoute(req, dependencies as never, 'other-1'),
	],
]

describe('rotas que recusam sessão de impersonamento', () => {
	it.each(BLOCKED)('%s responde 403 sem executar o use case', async (_label, method, call) => {
		const response = await call(request(method))

		expect(response.status).toBe(403)
		expect((await response.json()).success).toBe(false)
	})
})
