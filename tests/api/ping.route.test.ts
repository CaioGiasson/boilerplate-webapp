import { GET, HEAD } from '@/app/api/ping/route'

describe('/api/ping', () => {
	it('GET responde 200 sem cache e sem dados', async () => {
		const response = await GET()

		expect(response.status).toBe(200)
		expect(response.headers.get('Cache-Control')).toBe('no-store')
		await expect(response.json()).resolves.toEqual({ success: true, message: 'Pong', data: { ok: true } })
	})

	it('HEAD responde 200 sem corpo', async () => {
		const response = await HEAD()

		expect(response.status).toBe(200)
		expect(response.headers.get('Cache-Control')).toBe('no-store')
		await expect(response.text()).resolves.toBe('')
	})
})
