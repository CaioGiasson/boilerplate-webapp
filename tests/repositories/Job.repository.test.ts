import JobRepository, { truncateError } from '@/repositories/Job.repository'
import { JOB_DEFAULT_MAX_ATTEMPTS, JOB_ERROR_MAX_LENGTH } from '@/constants/jobs'

const NOW = new Date('2026-10-26T12:00:00.000Z')

function repositoryWith(job: Record<string, unknown>) {
	return new JobRepository({ job } as never)
}

describe('JobRepository.enqueue', () => {
	it('cria pending com os padrões e devolve o id', async () => {
		const create = jest.fn(async () => ({ id: 'job-1' }))

		const id = await repositoryWith({ create }).enqueue('email.send', { to: 'a@b.c', subject: 'S', text: 'T' })

		expect(id).toBe('job-1')
		expect(create).toHaveBeenCalledWith({
			data: {
				type: 'email.send',
				payload: { to: 'a@b.c', subject: 'S', text: 'T' },
				status: 'pending',
				maxAttempts: JOB_DEFAULT_MAX_ATTEMPTS,
				runAt: expect.any(Date),
			},
			select: { id: true },
		})
	})

	it('aceita agendamento e limite de tentativas', async () => {
		const create = jest.fn(async () => ({ id: 'job-2' }))
		const runAt = new Date('2026-11-01T00:00:00.000Z')

		await repositoryWith({ create }).enqueue(
			'email.send',
			{ to: 'a@b.c', subject: 'S', text: 'T' },
			{ runAt, maxAttempts: 2 }
		)

		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ runAt, maxAttempts: 2 }) })
		)
	})
})

describe('JobRepository.claimNext', () => {
	const input = { now: NOW, lockSeconds: 300, workerId: 'worker-1' }

	it('fila vazia devolve null e não escreve nada', async () => {
		const updateMany = jest.fn()

		await expect(
			repositoryWith({ findFirst: jest.fn(async () => null), updateMany }).claimNext(input)
		).resolves.toBeNull()
		expect(updateMany).not.toHaveBeenCalled()
	})

	it('elegível = pending vencido OU running com a trava vencida (worker morto), mais antigo primeiro', async () => {
		const findFirst = jest.fn(async () => null)

		await repositoryWith({ findFirst }).claimNext(input)

		expect(findFirst).toHaveBeenCalledWith({
			where: {
				OR: [
					{ status: 'pending', runAt: { lte: NOW } },
					{ status: 'running', lockedUntil: { lt: NOW } },
				],
			},
			orderBy: { runAt: 'asc' },
		})
	})

	it('pega o job com update condicional (repete a elegibilidade), trava, conta a tentativa e devolve o registro', async () => {
		const candidate = { id: 'job-1' }
		const claimed = { id: 'job-1', status: 'running', attempts: 1 }
		const findFirst = jest.fn().mockResolvedValueOnce(candidate).mockResolvedValueOnce(claimed)
		const updateMany = jest.fn(async () => ({ count: 1 }))

		const result = await repositoryWith({ findFirst, updateMany }).claimNext(input)

		expect(result).toBe(claimed)
		expect(updateMany).toHaveBeenCalledWith({
			where: {
				id: 'job-1',
				OR: [
					{ status: 'pending', runAt: { lte: NOW } },
					{ status: 'running', lockedUntil: { lt: NOW } },
				],
			},
			data: {
				status: 'running',
				lockedUntil: new Date(NOW.getTime() + 300_000),
				lockedBy: 'worker-1',
				attempts: { increment: 1 },
			},
		})
	})

	it('perdeu a corrida para outro worker: devolve null (não executa o job duas vezes)', async () => {
		const findFirst = jest.fn(async () => ({ id: 'job-1' }))
		const updateMany = jest.fn(async () => ({ count: 0 }))

		await expect(repositoryWith({ findFirst, updateMany }).claimNext(input)).resolves.toBeNull()
		expect(findFirst).toHaveBeenCalledTimes(1)
	})
})

describe('JobRepository finalização', () => {
	it('markSucceeded zera o payload (pode ter dado pessoal) e solta a trava', async () => {
		const update = jest.fn(async () => ({}))

		await repositoryWith({ update }).markSucceeded('job-1', NOW)

		expect(update).toHaveBeenCalledWith({
			where: { id: 'job-1' },
			data: {
				status: 'succeeded',
				payload: null,
				lockedUntil: null,
				lockedBy: null,
				lastError: null,
				finishedAt: NOW,
			},
		})
	})

	it('scheduleRetry volta para pending com o novo runAt e o erro truncado', async () => {
		const update = jest.fn(async () => ({}))
		const runAt = new Date('2026-10-26T12:01:00.000Z')

		await repositoryWith({ update }).scheduleRetry('job-1', { runAt, error: 'x'.repeat(JOB_ERROR_MAX_LENGTH + 50) })

		const data = (update.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data
		expect(data).toMatchObject({ status: 'pending', runAt, lockedUntil: null, lockedBy: null })
		expect((data.lastError as string).length).toBe(JOB_ERROR_MAX_LENGTH + 1)
		expect(data.payload).toBeUndefined()
	})

	it('markFailed mantém o payload (diagnóstico) e marca o fim', async () => {
		const update = jest.fn(async () => ({}))

		await repositoryWith({ update }).markFailed('job-1', { error: 'acabou', now: NOW })

		const data = (update.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data
		expect(data).toEqual({
			status: 'failed',
			lockedUntil: null,
			lockedBy: null,
			lastError: 'acabou',
			finishedAt: NOW,
		})
		expect('payload' in data).toBe(false)
	})

	it('countByStatus conta os quatro estados', async () => {
		const count = jest.fn(
			async ({ where }: { where: { status: string } }) =>
				({ pending: 3, running: 1, succeeded: 10, failed: 2 })[where.status]
		)

		await expect(repositoryWith({ count }).countByStatus()).resolves.toEqual({
			pending: 3,
			running: 1,
			succeeded: 10,
			failed: 2,
		})
	})

	it('truncateError só corta o que passa do limite', () => {
		expect(truncateError('curto')).toBe('curto')
		expect(truncateError('x'.repeat(JOB_ERROR_MAX_LENGTH))).toHaveLength(JOB_ERROR_MAX_LENGTH)
	})
})
