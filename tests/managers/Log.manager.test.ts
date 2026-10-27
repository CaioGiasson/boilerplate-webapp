import LogManager from '@/managers/Log.manager'
import { runWithRequestContext } from '@/lib/requestContext'

describe('LogManager', () => {
	const originalFormat = process.env.LOG_FORMAT
	const originalEnvironment = process.env.ENVIRONMENT
	let stdout: jest.SpyInstance
	let stderr: jest.SpyInstance

	beforeEach(() => {
		stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
		stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true)
	})

	afterEach(() => {
		stdout.mockRestore()
		stderr.mockRestore()
		restore('LOG_FORMAT', originalFormat)
		restore('ENVIRONMENT', originalEnvironment)
	})

	function restore(key: string, value: string | undefined) {
		if (value === undefined) delete process.env[key]
		else process.env[key] = value
	}

	it('LOG_FORMAT=json escreve uma linha JSON válida com requestId e dados', () => {
		process.env.LOG_FORMAT = 'json'

		runWithRequestContext('req-12345678', () => LogManager.info('Pedido criado', { orderId: 'o1' }))

		const line = String(stdout.mock.calls[0][0])
		expect(line.endsWith('\n')).toBe(true)
		expect(JSON.parse(line)).toEqual({
			level: 'info',
			time: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
			requestId: 'req-12345678',
			message: 'Pedido criado',
			data: { orderId: 'o1' },
		})
	})

	it('JSON: erro vai para stderr, sem data quando não há dados, e redige segredos', () => {
		process.env.LOG_FORMAT = 'json'

		LogManager.error('falha')
		LogManager.warn('aviso', { note: 'Bearer token abc' })

		expect(JSON.parse(String(stderr.mock.calls[0][0]))).toEqual({
			level: 'error',
			time: expect.any(String),
			message: 'falha',
		})
		expect(JSON.parse(String(stderr.mock.calls[1][0])).data).toEqual({ note: '[redacted]' })
	})

	it('mensagem com aspas e quebra de linha continua sendo uma linha JSON', () => {
		process.env.LOG_FORMAT = 'json'

		LogManager.info('linha1\n"linha2"')

		const line = String(stdout.mock.calls[0][0])
		expect(line.trimEnd().split('\n')).toHaveLength(1)
		expect(JSON.parse(line).message).toBe('linha1\n"linha2"')
	})

	it('texto mantém o formato legado e acrescenta o requestId quando existe', () => {
		process.env.LOG_FORMAT = 'text'

		LogManager.info('Olá')
		runWithRequestContext('req-12345678', () => LogManager.info('Com id', { a: 1 }))

		expect(String(stdout.mock.calls[0][0])).toMatch(/^\[INFO\] \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} - Olá\n$/)
		expect(String(stdout.mock.calls[1][0])).toMatch(/ - Com id requestId=req-12345678 \{"a":1\}\n$/)
	})

	it('sem LOG_FORMAT: texto fora de produção e JSON em produção', () => {
		delete process.env.LOG_FORMAT
		process.env.ENVIRONMENT = 'dev'
		LogManager.info('dev')
		expect(String(stdout.mock.calls[0][0])).toMatch(/^\[INFO\]/)

		process.env.ENVIRONMENT = 'prod'
		LogManager.info('prod')
		expect(JSON.parse(String(stdout.mock.calls[1][0])).message).toBe('prod')
	})
})
