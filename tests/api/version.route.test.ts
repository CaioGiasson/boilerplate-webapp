import { APP_VERSION } from '@/constants/app'
import { GET } from '@/app/api/v1/version/route'
import packageJson from '../../package.json'

describe('GET /api/v1/version', () => {
	it('devolve a versão do package.json no envelope da API, sem cache', async () => {
		const response = await GET()

		expect(response.status).toBe(200)
		expect(response.headers.get('Cache-Control')).toBe('no-store')
		const body = await response.json()
		expect(body.success).toBe(true)
		expect(body.data).toEqual({ version: packageJson.version })
		expect(APP_VERSION).toBe(packageJson.version)
	})
})
