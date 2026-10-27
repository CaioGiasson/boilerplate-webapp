import { expect, test } from '@playwright/test'
import { messagesByLocale } from '../../src/constants/texts'
import { disconnectDb, deleteE2eUsers, markEmailVerified } from '../support/db'
import { logout, newUser, register } from '../support/api'

const t = messagesByLocale.pt

test.afterAll(async () => {
	await deleteE2eUsers()
	await disconnectDb()
})

test.describe('jornada de conta (UI)', () => {
	test('login pelo formulário → página inicial → perfil mostra a conta', async ({ page, request }) => {
		const user = newUser()
		// A conta nasce pela API (o formulário de cadastro tem a sua própria cobertura); o login é o que se testa aqui.
		expect((await register(request, user)).status()).toBe(201)
		await markEmailVerified(user.email)
		await logout(request, user)

		await page.goto('/pt/login')
		await page.getByLabel(t.auth.identifier).fill(user.email)
		await page.getByLabel(t.auth.password, { exact: true }).fill(user.password)
		await page.getByRole('button', { name: t.auth.submitLogin, exact: true }).click()

		await expect(page.getByTestId('login-feedback')).toHaveText(t.auth.successLogin)
		await page.waitForURL('**/pt')

		await page.goto('/pt/profile')
		await expect(page.getByTestId('profile-page')).toBeVisible()
		await expect(page.getByLabel(t.profile.nickname, { exact: true })).toHaveValue(user.nickname)
	})

	test('senha errada mostra o erro e continua na tela de login', async ({ page, request }) => {
		const user = newUser()
		await register(request, user)
		await logout(request, user)

		await page.goto('/pt/login')
		await page.getByLabel(t.auth.identifier).fill(user.email)
		await page.getByLabel(t.auth.password, { exact: true }).fill('Senha#Errada123')
		await page.getByRole('button', { name: t.auth.submitLogin, exact: true }).click()

		await expect(page.getByTestId('login-feedback')).toHaveText(t.auth.invalidCredentials)
		await expect(page).toHaveURL(/\/pt\/login$/)
	})

	test('rota protegida sem sessão não mostra o perfil', async ({ page }) => {
		await page.goto('/pt/profile')

		await expect(page.getByTestId('profile-page')).toHaveCount(0)
	})
})
