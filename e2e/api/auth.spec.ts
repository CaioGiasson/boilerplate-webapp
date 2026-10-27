import { expect, test } from '@playwright/test'
import { disconnectDb, deleteE2eUsers, markEmailVerified } from '../support/db'
import { headersFor, json, login, logout, me, newUser, register } from '../support/api'

type SessionBody = {
	success: boolean
	data: { user: { id: string; nickname: string; email: string; emailVerifiedAt: string | null } }
}

test.afterAll(async () => {
	await deleteE2eUsers()
	await disconnectDb()
})

test.describe('jornada de conta (API)', () => {
	test('cadastro → verificação → perfil → logout → login', async ({ request }) => {
		const user = newUser()

		// Cadastro já abre a sessão (cookie HttpOnly no jar do contexto).
		const registered = await register(request, user)
		expect(registered.status()).toBe(201)
		const { data } = await json<SessionBody>(registered)
		expect(data.user.nickname).toBe(user.nickname)
		expect(data.user.emailVerifiedAt).toBeNull()

		const current = await me(request, user)
		expect(current.status()).toBe(200)

		// O e-mail de verificação não sai nos testes: o equivalente de abrir o link é marcar a conta no banco.
		await markEmailVerified(user.email)
		const verified = await json<SessionBody>(await me(request, user))
		expect(verified.data.user.emailVerifiedAt).not.toBeNull()

		// Perfil: troca o nome.
		const updated = await request.patch(`/api/v1/users/${data.user.id}`, {
			headers: headersFor(user),
			data: { name: 'Ada E2E', nickname: user.nickname },
		})
		expect(updated.status()).toBe(200)
		expect((await json<SessionBody>(await me(request, user))).data.user).toMatchObject({ name: 'Ada E2E' })

		// Logout derruba a sessão; sem cookie, /me é 401.
		expect((await logout(request, user)).status()).toBe(204)
		expect((await me(request, user)).status()).toBe(401)

		// Login com a senha certa volta a abrir a sessão.
		const logged = await login(request, user)
		expect(logged.status()).toBe(200)
		expect((await me(request, user)).status()).toBe(200)
	})

	test('senha errada é 401 e não abre sessão', async ({ request }) => {
		const user = newUser()
		await register(request, user)
		await logout(request, user)

		const wrong = await login(request, user, 'Senha#Errada123')

		expect(wrong.status()).toBe(401)
		expect((await me(request, user)).status()).toBe(401)
	})

	test('cadastro recusa e-mail repetido e senha fraca', async ({ request }) => {
		const user = newUser()
		expect((await register(request, user)).status()).toBe(201)

		const duplicate = await register(request, { ...user, nickname: `${user.nickname}x` })
		expect(duplicate.ok()).toBe(false)

		const weak = await register(request, { ...newUser(), password: 'abc' })
		expect(weak.status()).toBe(400)
	})

	test('mutação sem Origin do próprio site é recusada (CSRF)', async ({ request }) => {
		const user = newUser()

		const response = await request.post('/api/v1/auth/login', {
			headers: { Origin: 'https://evil.example', 'x-real-ip': user.ip },
			data: { identifier: user.email, password: user.password },
		})

		expect(response.status()).toBe(403)
	})

	test('rotas autenticadas respondem 401 sem sessão e a resposta traz x-request-id', async ({ request }) => {
		const response = await request.get('/api/v1/users/me/sessions')

		expect(response.status()).toBe(401)
		expect(response.headers()['x-request-id']).toMatch(/^[0-9a-f-]{36}$/)
		const body = await json<{ success: boolean; requestId: string }>(response)
		expect(body.requestId).toBe(response.headers()['x-request-id'])
	})
})
