import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { NotFoundError } from '@/errors'
import { REQUEST_ID_HEADER, getClientIp, getRequestId } from '@/lib/requestContext'
import { registerErrorReporter } from '@/lib/errorReporter'
import { handleRoute } from '@/utils/routeHandler'

jest.mock('next/headers', () => ({ headers: jest.fn() }))
jest.mock('@/managers/Log.manager', () => ({
	__esModule: true,
	default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockedHeaders = headers as unknown as jest.Mock

function incoming(requestId?: string) {
	mockedHeaders.mockResolvedValue(new Headers(requestId ? { [REQUEST_ID_HEADER]: requestId } : {}))
}

describe('handleRoute', () => {
	afterEach(() => registerErrorReporter(undefined))

	it('responde com o x-request-id de entrada e o expõe ao handler', async () => {
		incoming('gateway-req-0001')
		let seen: string | undefined

		const response = await handleRoute(async () => {
			seen = getRequestId()
			return NextResponse.json({ ok: true })
		})

		expect(response.headers.get(REQUEST_ID_HEADER)).toBe('gateway-req-0001')
		expect(seen).toBe('gateway-req-0001')
	})

	it('expõe ao handler o IP do cliente (cabeçalho do proxy) e ignora quando não há IP confiável', async () => {
		mockedHeaders.mockResolvedValue(new Headers({ 'cf-connecting-ip': '203.0.113.7' }))
		let seen: string | undefined
		await handleRoute(async () => {
			seen = getClientIp()
			return NextResponse.json({ ok: true })
		})
		expect(seen).toBe('203.0.113.7')

		incoming()
		await handleRoute(async () => {
			seen = getClientIp()
			return NextResponse.json({ ok: true })
		})
		expect(seen).toBeUndefined()
	})

	it('gera um id quando o de entrada é inválido', async () => {
		incoming('inválido com espaço')

		const response = await handleRoute(async () => NextResponse.json({ ok: true }))

		expect(response.headers.get(REQUEST_ID_HEADER)).toMatch(/^[0-9a-f-]{36}$/)
	})

	it('gera um id quando não há escopo de requisição (headers() lança)', async () => {
		mockedHeaders.mockRejectedValue(new Error('outside request scope'))

		const response = await handleRoute(async () => NextResponse.json({ ok: true }))

		expect(response.headers.get(REQUEST_ID_HEADER)).toMatch(/^[0-9a-f-]{36}$/)
	})

	it('AppError 4xx: corpo traz requestId e o erro não vai ao reporter', async () => {
		incoming('gateway-req-0002')
		const reporter = jest.fn()
		registerErrorReporter(reporter)

		const response = await handleRoute(async () => {
			throw new NotFoundError('Não achei')
		})

		expect(response.status).toBe(404)
		expect(response.headers.get(REQUEST_ID_HEADER)).toBe('gateway-req-0002')
		await expect(response.json()).resolves.toMatchObject({
			success: false,
			message: 'Não achei',
			requestId: 'gateway-req-0002',
		})
		expect(reporter).not.toHaveBeenCalled()
	})

	it('erro inesperado: 500 com requestId e reportado', async () => {
		incoming('gateway-req-0003')
		const reporter = jest.fn()
		registerErrorReporter(reporter)
		const boom = new Error('boom')

		const response = await handleRoute(async () => {
			throw boom
		})

		expect(response.status).toBe(500)
		await expect(response.json()).resolves.toEqual({
			success: false,
			message: 'Internal server error',
			code: 'INTERNAL_ERROR',
			requestId: 'gateway-req-0003',
		})
		expect(reporter).toHaveBeenCalledWith(boom, { source: 'route', requestId: 'gateway-req-0003' })
	})
})
