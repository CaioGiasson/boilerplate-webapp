import { isJobWorkerEnabled, resolvePollIntervalMs, startJobWorker } from '@/jobs/worker'
import { buildJobHandlers } from '@/jobs/registry'
import { processNextJob } from '@/jobs/processNextJob'

jest.mock('@/managers/Log.manager', () => ({
	__esModule: true,
	default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))
jest.mock('@/managers/Db.manager', () => ({
	runWithoutTransaction: jest.fn(async (fn: (client: unknown) => Promise<unknown>) => fn({})),
}))
jest.mock('@/jobs/processNextJob', () => ({ processNextJob: jest.fn() }))
const send = jest.fn()
jest.mock('@/services/Email/Email.service', () => ({
	getEmailService: () => ({ send: (...args: unknown[]) => send(...args) }),
}))

const mockedProcess = processNextJob as jest.Mock

describe('configuração do worker', () => {
	it('intervalo: padrão 5 s; aceita >= 500 ms; ignora lixo', () => {
		expect(resolvePollIntervalMs({})).toBe(5000)
		expect(resolvePollIntervalMs({ JOBS_POLL_INTERVAL_MS: '1500' } as never)).toBe(1500)
		for (const bad of ['499', '0', '-1', 'abc', '1.5', '']) {
			expect(resolvePollIntervalMs({ JOBS_POLL_INTERVAL_MS: bad } as never)).toBe(5000)
		}
	})

	it('liga por padrão, desliga com JOBS_WORKER=off e nunca roda nos testes', () => {
		expect(isJobWorkerEnabled({ NODE_ENV: 'production' } as never)).toBe(true)
		expect(isJobWorkerEnabled({ NODE_ENV: 'production', JOBS_WORKER: 'OFF' } as never)).toBe(false)
		expect(isJobWorkerEnabled({ NODE_ENV: 'production', JOBS_WORKER: 'on' } as never)).toBe(true)
		expect(isJobWorkerEnabled({ NODE_ENV: 'test' } as never)).toBe(false)
	})
})

describe('laço do worker', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		mockedProcess.mockReset()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('esvazia a fila de uma vez e só volta a consultar depois do intervalo', async () => {
		mockedProcess
			.mockResolvedValueOnce({ processed: true })
			.mockResolvedValueOnce({ processed: true })
			.mockResolvedValue({ processed: false })
		const worker = startJobWorker({ handlers: {}, intervalMs: 1000, workerId: 'w1' })

		expect(mockedProcess).not.toHaveBeenCalled()
		await jest.advanceTimersByTimeAsync(1000)
		expect(mockedProcess).toHaveBeenCalledTimes(3)
		expect(mockedProcess.mock.calls[0][0]).toMatchObject({ workerId: 'w1', handlers: {} })

		await jest.advanceTimersByTimeAsync(1000)
		expect(mockedProcess).toHaveBeenCalledTimes(4)
		await worker.stop()
	})

	it('erro do banco não derruba o laço: loga e tenta no próximo intervalo', async () => {
		mockedProcess.mockRejectedValueOnce(new Error('mongo fora')).mockResolvedValue({ processed: false })
		const worker = startJobWorker({ handlers: {}, intervalMs: 1000 })

		await jest.advanceTimersByTimeAsync(1000)
		expect(mockedProcess).toHaveBeenCalledTimes(1)
		await jest.advanceTimersByTimeAsync(1000)
		expect(mockedProcess).toHaveBeenCalledTimes(2)
		await worker.stop()
	})

	it('stop espera o job em andamento e não agenda mais nada', async () => {
		let finish: (value: { processed: boolean }) => void = () => undefined
		mockedProcess.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
		const worker = startJobWorker({ handlers: {}, intervalMs: 1000 })
		await jest.advanceTimersByTimeAsync(1000)

		let stopped = false
		const stopping = worker.stop().then(() => (stopped = true))
		await Promise.resolve()
		expect(stopped).toBe(false)

		finish({ processed: false })
		await stopping
		expect(stopped).toBe(true)

		await jest.advanceTimersByTimeAsync(5000)
		expect(mockedProcess).toHaveBeenCalledTimes(1)
	})
})

describe('registro de handlers', () => {
	it('email.send entrega o payload ao serviço de e-mail e propaga a falha (para o retry)', async () => {
		const handlers = buildJobHandlers()
		const payload = { to: 'ada@example.com', subject: 'Oi', text: 'Olá' }

		await handlers['email.send']?.(payload, { jobId: 'j1', attempt: 1 })
		expect(send).toHaveBeenCalledWith(payload)

		send.mockRejectedValueOnce(new Error('brevo 503'))
		await expect(handlers['email.send']?.(payload, { jobId: 'j1', attempt: 2 })).rejects.toThrow('brevo 503')
	})
})
