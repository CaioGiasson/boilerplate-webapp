import { getRequestId, resolveRequestId, runWithRequestContext } from '@/lib/requestContext'

describe('requestContext', () => {
	it('reaproveita um x-request-id válido', () => {
		expect(resolveRequestId('abc12345-req.1_x')).toBe('abc12345-req.1_x')
	})

	it.each([null, undefined, '', 'curto', 'tem espaço no meio', 'linha\ninjetada-aqui', 'x'.repeat(65)])(
		'gera um UUID novo para %j',
		(incoming) => {
			expect(resolveRequestId(incoming as string | null | undefined)).toMatch(/^[0-9a-f-]{36}$/)
		}
	)

	it('expõe o id só dentro do contexto, inclusive após await', async () => {
		expect(getRequestId()).toBeUndefined()

		await runWithRequestContext('req-12345678', async () => {
			await Promise.resolve()
			expect(getRequestId()).toBe('req-12345678')
		})

		expect(getRequestId()).toBeUndefined()
	})
})
