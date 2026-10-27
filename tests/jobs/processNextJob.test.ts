import { backoffSeconds, processNextJob, type JobHandlers } from '@/jobs/processNextJob'
import type JobRepository from '@/repositories/Job.repository'
import type { JobRecord } from '@/repositories/Job.repository'

jest.mock('@/managers/Log.manager', () => ({
	__esModule: true,
	default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const NOW = new Date('2026-10-26T12:00:00.000Z')

function job(overrides: Partial<JobRecord> = {}): JobRecord {
	return {
		id: 'job-1',
		type: 'email.send',
		payload: { to: 'ada@example.com', subject: 'Oi', text: 'Olá' },
		status: 'running',
		attempts: 1,
		maxAttempts: 5,
		runAt: NOW,
		lockedUntil: new Date(NOW.getTime() + 300_000),
		lockedBy: 'worker-1',
		lastError: null,
		createdAt: NOW,
		finishedAt: null,
		...overrides,
	}
}

function fakeRepository(claimed: JobRecord | null) {
	return {
		claimNext: jest.fn(async () => claimed),
		markSucceeded: jest.fn(async () => undefined),
		scheduleRetry: jest.fn(async () => undefined),
		markFailed: jest.fn(async () => undefined),
	}
}

async function run(
	repository: ReturnType<typeof fakeRepository>,
	handlers: JobHandlers,
	extra: { random?: () => number } = {}
) {
	return processNextJob({
		repository: repository as unknown as JobRepository,
		handlers,
		workerId: 'worker-1',
		now: () => NOW,
		lockSeconds: 120,
		...extra,
	})
}

describe('backoffSeconds', () => {
	const middle = () => 0.5 // fator 1.0

	it('dobra a cada tentativa e limita a 1 hora', () => {
		expect([1, 2, 3, 4, 5].map((attempt) => backoffSeconds(attempt, middle))).toEqual([30, 60, 120, 240, 480])
		expect(backoffSeconds(10, middle)).toBe(3600)
		expect(backoffSeconds(50, middle)).toBe(3600)
	})

	it('varia ±20 % para as tentativas não sincronizarem', () => {
		expect(backoffSeconds(3, () => 0)).toBe(96)
		expect(backoffSeconds(3, () => 0.999)).toBe(144)
	})

	it('tentativa 0 ou negativa não quebra', () => {
		expect(backoffSeconds(0, middle)).toBe(30)
		expect(backoffSeconds(-3, middle)).toBe(30)
	})
})

describe('processNextJob', () => {
	it('fila vazia: não faz nada', async () => {
		const repository = fakeRepository(null)
		const handler = jest.fn()

		await expect(run(repository, { 'email.send': handler })).resolves.toEqual({ processed: false })

		expect(handler).not.toHaveBeenCalled()
		expect(repository.claimNext).toHaveBeenCalledWith({ now: NOW, lockSeconds: 120, workerId: 'worker-1' })
	})

	it('sucesso: roda o handler com payload e tentativa e marca concluído', async () => {
		const repository = fakeRepository(job({ attempts: 2 }))
		const handler = jest.fn(async () => undefined)

		const result = await run(repository, { 'email.send': handler })

		expect(handler).toHaveBeenCalledWith(
			{ to: 'ada@example.com', subject: 'Oi', text: 'Olá' },
			{ jobId: 'job-1', attempt: 2 }
		)
		expect(repository.markSucceeded).toHaveBeenCalledWith('job-1', NOW)
		expect(result).toEqual({ processed: true, jobId: 'job-1', type: 'email.send', outcome: 'succeeded' })
		expect(repository.scheduleRetry).not.toHaveBeenCalled()
	})

	it('erro com tentativas sobrando: reagenda com backoff e guarda o erro', async () => {
		const repository = fakeRepository(job({ attempts: 2 }))

		const result = await run(
			repository,
			{ 'email.send': async () => Promise.reject(new Error('provedor fora do ar')) },
			{ random: () => 0.5 }
		)

		expect(repository.scheduleRetry).toHaveBeenCalledWith('job-1', {
			runAt: new Date(NOW.getTime() + 60_000),
			error: 'Error: provedor fora do ar',
		})
		expect(result).toMatchObject({ outcome: 'retry' })
		expect(repository.markFailed).not.toHaveBeenCalled()
		expect(repository.markSucceeded).not.toHaveBeenCalled()
	})

	it('esgotou as tentativas: marca falho (sem reagendar)', async () => {
		const repository = fakeRepository(job({ attempts: 5, maxAttempts: 5 }))

		const result = await run(repository, { 'email.send': async () => Promise.reject('texto solto') })

		expect(repository.markFailed).toHaveBeenCalledWith('job-1', { error: 'texto solto', now: NOW })
		expect(repository.scheduleRetry).not.toHaveBeenCalled()
		expect(result).toMatchObject({ outcome: 'failed' })
	})

	it('tipo sem handler registrado: falha na hora, sem retry', async () => {
		const repository = fakeRepository(job({ type: 'tipo.desconhecido' }))

		const result = await run(repository, {})

		expect(repository.markFailed).toHaveBeenCalledWith('job-1', {
			error: 'No handler registered for "tipo.desconhecido"',
			now: NOW,
		})
		expect(repository.scheduleRetry).not.toHaveBeenCalled()
		expect(result).toMatchObject({ processed: true, outcome: 'failed' })
	})

	it('o último erro de handler que lança antes de qualquer await também é tratado', async () => {
		const repository = fakeRepository(job())

		await run(repository, {
			'email.send': () => {
				throw new Error('síncrono')
			},
		})

		expect(repository.scheduleRetry).toHaveBeenCalledTimes(1)
	})
})
