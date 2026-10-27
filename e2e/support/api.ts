import { randomBytes } from 'node:crypto'
import type { APIRequestContext, APIResponse } from '@playwright/test'
import { E2E_BASE_URL } from './env'
import { E2E_NICKNAME_PREFIX } from './db'

export const E2E_PASSWORD = 'Senha#E2e12345'

export type E2eUser = {
	nickname: string
	email: string
	password: string
	birthDate: string
	/** IP "do cliente" desta conta: o limite de tentativas é por IP, então cada teste usa o seu. */
	ip: string
}

let ipCounter = 0

/** Conta única por teste (sem colisão entre execuções nem entre testes). */
export function newUser(): E2eUser {
	const id = randomBytes(5).toString('hex')
	ipCounter += 1
	return {
		nickname: `${E2E_NICKNAME_PREFIX}${id}`,
		email: `${E2E_NICKNAME_PREFIX}${id}@example.test`,
		password: E2E_PASSWORD,
		birthDate: '1990-01-01',
		ip: `10.${(ipCounter >> 8) & 255}.${ipCounter & 255}.${Math.floor(Math.random() * 200) + 1}`,
	}
}

/** Cabeçalhos que o app exige em mutações: `Origin` igual ao host (CSRF) e o IP do cliente (limite de tentativas). */
export function headersFor(user: E2eUser): Record<string, string> {
	return { Origin: E2E_BASE_URL, 'x-real-ip': user.ip }
}

export async function json<T = Record<string, unknown>>(response: APIResponse): Promise<T> {
	return (await response.json()) as T
}

export function register(request: APIRequestContext, user: E2eUser): Promise<APIResponse> {
	return request.post('/api/v1/auth/register', {
		headers: headersFor(user),
		data: {
			nickname: user.nickname,
			email: user.email,
			password: user.password,
			passwordConfirmation: user.password,
			birthDate: user.birthDate,
			acceptedTerms: true,
			acceptedPrivacy: true,
		},
	})
}

export function login(request: APIRequestContext, user: E2eUser, password = user.password): Promise<APIResponse> {
	return request.post('/api/v1/auth/login', {
		headers: headersFor(user),
		data: { identifier: user.email, password },
	})
}

export function logout(request: APIRequestContext, user: E2eUser): Promise<APIResponse> {
	return request.post('/api/v1/auth/logout', { headers: headersFor(user) })
}

export function me(request: APIRequestContext, user: E2eUser): Promise<APIResponse> {
	return request.get('/api/v1/auth/me', { headers: { 'x-real-ip': user.ip } })
}
