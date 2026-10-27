import { registerErrorReporter, reportError } from '@/lib/errorReporter'
import { runWithRequestContext } from '@/lib/requestContext'

describe('errorReporter', () => {
	afterEach(() => registerErrorReporter(undefined))

	it('não faz nada sem reporter registrado', () => {
		expect(() => reportError(new Error('x'), { source: 'route' })).not.toThrow()
	})

	it('entrega o erro com o requestId do contexto', () => {
		const reporter = jest.fn()
		registerErrorReporter(reporter)
		const error = new Error('falhou')

		runWithRequestContext('req-12345678', () => reportError(error, { source: 'route' }))

		expect(reporter).toHaveBeenCalledWith(error, { source: 'route', requestId: 'req-12345678' })
	})

	it('engole falha do próprio reporter', () => {
		registerErrorReporter(() => {
			throw new Error('destino fora do ar')
		})

		expect(() => reportError(new Error('x'), { source: 'route' })).not.toThrow()
	})
})
