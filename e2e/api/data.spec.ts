import { randomBytes } from 'node:crypto'
import { expect, request as playwrightRequest, test, type APIRequestContext } from '@playwright/test'
import { disconnectDb, deleteE2eUsers, deleteJobs, prismaClient, setRole } from '../support/db'
import { headersFor, json, newUser, register, type E2eUser } from '../support/api'
import { E2E_BASE_URL } from '../support/env'
import JobRepository from '../../src/repositories/Job.repository'
import { totpCode, totpStep } from '../../src/utils/totp'

type Page<T> = { data: { items: T[]; pageInfo: { nextCursor: string | null; hasNext: boolean; limit: number } } }
type UserRow = { id: string; nickname: string; createdAt: string }
type AuditRow = { action: string; actorType: string; actor: { nickname: string | null } | null }

const contexts: APIRequestContext[] = []

/** Contexto de requisições com cookie jar próprio. */
async function newContext(): Promise<APIRequestContext> {
	const context = await playwrightRequest.newContext({ baseURL: E2E_BASE_URL })
	contexts.push(context)
	return context
}

test.beforeAll(async () => {
	await deleteJobs()
})

test.afterAll(async () => {
	await Promise.all(contexts.map((context) => context.dispose()))
	await deleteJobs()
	await deleteE2eUsers()
	await disconnectDb()
})

async function adminSession(request: APIRequestContext): Promise<E2eUser> {
	const admin = newUser()
	expect((await register(request, admin)).status()).toBe(201)
	await setRole(admin.email, 'ADMIN')
	return admin
}

test.describe('paginação por cursor no Mongo real (admin)', () => {
	test('keyset com busca por apelido (sem diferenciar caixa), ordem e página final', async ({ request }) => {
		const admin = await adminSession(request)
		const tag = randomBytes(3).toString('hex')
		const nicknames = ['a', 'b', 'c'].map((suffix) => `e2e_pg${tag}${suffix}`)
		for (const [index, nickname] of nicknames.entries()) {
			const other = { ...newUser(), nickname }
			expect((await register(await newContext(), other)).status(), `cadastro ${index}`).toBe(201)
		}
		const list = async (query: string) =>
			json<Page<UserRow>>(
				await request.get(`/api/v1/admin/users?${query}`, { headers: { 'x-real-ip': admin.ip } })
			)

		const first = await list(`q=${tag.toUpperCase()}&limit=2&order=asc`)
		expect(first.data.items).toHaveLength(2)
		expect(first.data.pageInfo.hasNext).toBe(true)
		expect(first.data.pageInfo.nextCursor).toBeTruthy()

		const second = await list(`q=${tag}&limit=2&order=asc&cursor=${first.data.pageInfo.nextCursor}`)
		expect(second.data.items).toHaveLength(1)
		expect(second.data.pageInfo).toMatchObject({ hasNext: false, nextCursor: null })

		const seen = [...first.data.items, ...second.data.items].map((item) => item.nickname)
		expect(new Set(seen).size).toBe(3)
		expect(seen.sort()).toEqual(nicknames)
		// Crescente: cada página vem depois da anterior.
		expect(new Date(second.data.items[0].createdAt).getTime()).toBeGreaterThanOrEqual(
			new Date(first.data.items[1].createdAt).getTime()
		)

		const descending = await list(`q=${tag}&limit=10&order=desc`)
		expect(descending.data.items.map((item) => item.nickname)).toEqual([...seen.sort()].reverse())
	})

	test('limit e cursor inválidos são 400; usuário comum é 403', async ({ request }) => {
		const admin = await adminSession(request)
		const get = (query: string) =>
			request.get(`/api/v1/admin/users?${query}`, { headers: { 'x-real-ip': admin.ip } })

		expect((await get('limit=0')).status()).toBe(400)
		expect((await get('limit=101')).status()).toBe(400)
		expect((await get('cursor=lixo')).status()).toBe(400)

		const regular = newUser()
		const regularContext = await newContext()
		await register(regularContext, regular)
		expect(
			(await regularContext.get('/api/v1/admin/users', { headers: { 'x-real-ip': regular.ip } })).status()
		).toBe(403)
	})
})

test.describe('audit log no Mongo real', () => {
	test('ativar 2FA gera um evento listado para o admin, com o apelido de quem agiu e filtro por ação', async ({
		request,
	}) => {
		const admin = await adminSession(request)
		const actorContext = await newContext()
		const actor = newUser()
		expect((await register(actorContext, actor)).status()).toBe(201)

		const setup = await actorContext.post('/api/v1/users/me/2fa/setup', { headers: headersFor(actor), data: {} })
		const { secret } = (await json<{ data: { secret: string } }>(setup)).data
		const enable = await actorContext.post('/api/v1/users/me/2fa/enable', {
			headers: headersFor(actor),
			data: { code: totpCode(secret, totpStep()) },
		})
		expect(enable.status()).toBe(200)

		const filtered = await json<Page<AuditRow>>(
			await request.get('/api/v1/admin/audit-events?action=user.two_factor_enabled&limit=100', {
				headers: { 'x-real-ip': admin.ip },
			})
		)
		const mine = filtered.data.items.filter((item) => item.actor?.nickname === actor.nickname)
		expect(mine).toHaveLength(1)
		expect(mine[0]).toMatchObject({ action: 'user.two_factor_enabled', actorType: 'user' })
		// A API não devolve IP, requestId nem metadata.
		expect(JSON.stringify(filtered)).not.toContain('requestId')

		const invalid = await request.get('/api/v1/admin/audit-events?action=nao.existe', {
			headers: { 'x-real-ip': admin.ip },
		})
		expect(invalid.status()).toBe(400)
	})
})

test.describe('fila de jobs no Mongo real', () => {
	const payload = { to: 'e2e@example.test', subject: 'Oi', text: 'Olá' }

	test('claim atômico: 5 workers disputando 1 job, só um leva', async () => {
		const repository = new JobRepository(prismaClient() as never)
		await deleteJobs()
		await repository.enqueue('email.send', payload)

		const claims = await Promise.all(
			Array.from({ length: 5 }, (_, index) =>
				repository.claimNext({ now: new Date(), lockSeconds: 60, workerId: `worker-${index}` })
			)
		)

		const winners = claims.filter((claim) => claim !== null)
		expect(winners).toHaveLength(1)
		expect(winners[0]).toMatchObject({ status: 'running', attempts: 1, type: 'email.send' })
	})

	test('trava vencida: outro worker retoma o job e conta a segunda tentativa', async () => {
		const repository = new JobRepository(prismaClient() as never)
		await deleteJobs()
		await repository.enqueue('email.send', payload)
		const first = await repository.claimNext({ now: new Date(), lockSeconds: 60, workerId: 'morto' })
		expect(first?.attempts).toBe(1)

		// Dentro da trava ninguém pega; depois que ela vence, o job é retomado.
		expect(await repository.claimNext({ now: new Date(), lockSeconds: 60, workerId: 'outro' })).toBeNull()
		const later = new Date(Date.now() + 120_000)
		const retaken = await repository.claimNext({ now: later, lockSeconds: 60, workerId: 'outro' })

		expect(retaken).toMatchObject({ id: first?.id, attempts: 2, lockedBy: 'outro' })
	})

	test('retry só fica elegível depois do backoff; sucesso zera o payload', async () => {
		const repository = new JobRepository(prismaClient() as never)
		await deleteJobs()
		const id = await repository.enqueue('email.send', payload)
		const claimed = await repository.claimNext({ now: new Date(), lockSeconds: 60, workerId: 'w' })
		expect(claimed?.id).toBe(id)

		const runAt = new Date(Date.now() + 60_000)
		await repository.scheduleRetry(id, { runAt, error: 'provedor fora do ar' })
		expect(await repository.claimNext({ now: new Date(), lockSeconds: 60, workerId: 'w' })).toBeNull()

		const again = await repository.claimNext({
			now: new Date(runAt.getTime() + 1000),
			lockSeconds: 60,
			workerId: 'w',
		})
		expect(again).toMatchObject({ id, attempts: 2, lastError: 'provedor fora do ar' })

		await repository.markSucceeded(id, new Date())
		const stored = await prismaClient().job.findFirst({ where: { id } })
		expect(stored).toMatchObject({ status: 'succeeded', payload: null, lockedBy: null })
		expect(await repository.countByStatus()).toMatchObject({ succeeded: 1, pending: 0, running: 0 })
	})
})
