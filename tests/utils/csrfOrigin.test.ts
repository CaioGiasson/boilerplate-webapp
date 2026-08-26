import { NextRequest } from 'next/server'
import { ForbiddenError } from '@/errors'
import { assertSameOrigin } from '@/utils/csrfOrigin'

describe('assertSameOrigin', () => {
	it('aceita Origin igual ao da request', () => {
		const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
			method: 'POST',
			headers: { origin: 'http://localhost:3000' },
		})
		expect(() => assertSameOrigin(request)).not.toThrow()
	})

	it('rejeita Origin cruzada', () => {
		const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
			method: 'POST',
			headers: { origin: 'https://evil.example' },
		})
		expect(() => assertSameOrigin(request)).toThrow(ForbiddenError)
	})
})
