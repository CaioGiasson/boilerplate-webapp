import { expect, test, type APIRequestContext } from '@playwright/test'
import { disconnectDb, deleteE2eUsers, findTwoFactorState } from '../support/db'
import { headersFor, json, login, logout, me, newUser, register, type E2eUser } from '../support/api'
import { totpCode, totpStep } from '../../src/utils/totp'

const currentCode = (secret: string) => totpCode(secret, totpStep()) as string
/** O `enable` já consumiu o passo atual (anti-replay): o próximo login usa o código do passo seguinte, aceito pela janela de ±1. */
const nextCode = (secret: string) => totpCode(secret, totpStep() + 1) as string

async function post(request: APIRequestContext, user: E2eUser, path: string, data: unknown = {}) {
	return request.post(path, { headers: headersFor(user), data })
}

/** Cadastra, ativa o 2FA pelo fluxo real e devolve o segredo e os códigos de recuperação. */
async function enableTwoFactor(request: APIRequestContext, user: E2eUser) {
	expect((await register(request, user)).status()).toBe(201)

	const setup = await post(request, user, '/api/v1/users/me/2fa/setup')
	expect(setup.status()).toBe(200)
	const { secret } = (await json<{ data: { secret: string; otpauthUri: string } }>(setup)).data

	const enabled = await post(request, user, '/api/v1/users/me/2fa/enable', { code: currentCode(secret) })
	expect(enabled.status()).toBe(200)
	const { recoveryCodes } = (await json<{ data: { recoveryCodes: string[] } }>(enabled)).data
	return { secret, recoveryCodes }
}

test.afterAll(async () => {
	await deleteE2eUsers()
	await disconnectDb()
})

test.describe('2FA (API)', () => {
	test('o segredo fica cifrado no banco e o status reflete a ativação', async ({ request }) => {
		const user = newUser()
		const { secret, recoveryCodes } = await enableTwoFactor(request, user)

		expect(recoveryCodes).toHaveLength(10)
		const stored = await findTwoFactorState(user.email)
		expect(stored?.twoFactorEnabledAt).not.toBeNull()
		expect(stored?.twoFactorSecretEnc?.startsWith('v1.')).toBe(true)
		expect(stored?.twoFactorSecretEnc).not.toContain(secret)

		const status = await request.get('/api/v1/users/me/2fa', { headers: { 'x-real-ip': user.ip } })
		expect((await json<{ data: object }>(status)).data).toEqual({
			available: true,
			enabled: true,
			recoveryCodesRemaining: 10,
		})
	})

	test('login com 2FA: a senha sozinha não abre sessão; o código abre; o mesmo código não vale duas vezes', async ({
		request,
	}) => {
		const user = newUser()
		const { secret } = await enableTwoFactor(request, user)
		await logout(request, user)

		const step1 = await login(request, user)
		expect(step1.status()).toBe(200)
		const { data } = await json<{ data: { twoFactorRequired?: boolean; challengeToken?: string } }>(step1)
		expect(data.twoFactorRequired).toBe(true)
		// Sem sessão: o /me continua 401 mesmo com a senha certa.
		expect((await me(request, user)).status()).toBe(401)

		const wrong = await post(request, user, '/api/v1/auth/2fa/verify', {
			challengeToken: data.challengeToken,
			code: '000000',
		})
		expect(wrong.status()).toBe(401)
		expect((await me(request, user)).status()).toBe(401)

		const code = nextCode(secret)
		const verified = await post(request, user, '/api/v1/auth/2fa/verify', {
			challengeToken: data.challengeToken,
			code,
		})
		expect(verified.status()).toBe(200)
		expect((await me(request, user)).status()).toBe(200)

		// Replay: o mesmo código (mesmo passo) com um desafio novo é recusado.
		await logout(request, user)
		const again = await json<{ data: { challengeToken: string } }>(await login(request, user))
		const replay = await post(request, user, '/api/v1/auth/2fa/verify', {
			challengeToken: again.data.challengeToken,
			code,
		})
		expect(replay.status()).toBe(401)
	})

	test('código de recuperação entra uma vez só', async ({ request }) => {
		const user = newUser()
		const { recoveryCodes } = await enableTwoFactor(request, user)
		await logout(request, user)

		const first = await json<{ data: { challengeToken: string } }>(await login(request, user))
		const used = await post(request, user, '/api/v1/auth/2fa/verify', {
			challengeToken: first.data.challengeToken,
			recoveryCode: recoveryCodes[0],
		})
		expect(used.status()).toBe(200)

		await logout(request, user)
		const second = await json<{ data: { challengeToken: string } }>(await login(request, user))
		const reused = await post(request, user, '/api/v1/auth/2fa/verify', {
			challengeToken: second.data.challengeToken,
			recoveryCode: recoveryCodes[0],
		})
		expect(reused.status()).toBe(401)
	})

	test('desativar exige senha e segundo fator; depois o login volta a ser só senha', async ({ request }) => {
		const user = newUser()
		const { recoveryCodes } = await enableTwoFactor(request, user)
		const disable = (data: unknown) => post(request, user, '/api/v1/users/me/2fa/disable', data)

		// Senha errada: recusa antes de consumir o código de recuperação.
		expect((await disable({ password: 'Senha#Errada123', recoveryCode: recoveryCodes[0] })).status()).toBe(401)
		// Sem segundo fator, só a senha não basta.
		expect((await disable({ password: user.password })).status()).toBe(400)

		// (O passo TOTP do enable já foi consumido; o código de recuperação não depende do relógio.)
		expect((await disable({ password: user.password, recoveryCode: recoveryCodes[0] })).status()).toBe(200)
		expect((await findTwoFactorState(user.email))?.twoFactorEnabledAt).toBeNull()

		await logout(request, user)
		const plain = await json<{ data: { twoFactorRequired?: boolean } }>(await login(request, user))
		expect(plain.data.twoFactorRequired).toBeUndefined()
		expect((await me(request, user)).status()).toBe(200)
	})
})
