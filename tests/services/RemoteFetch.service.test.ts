import { ValidationError } from '@/errors'
import RemoteFetchService from '@/services/Storage/RemoteFetch.service'

describe('RemoteFetchService.fetchImage', () => {
	it.each(['http://localhost/a.png', 'http://app.localhost/a.png', 'http://printer.local/a.png'])(
		'recusa o nome interno %s sem resolver DNS nem buscar',
		async (url) => {
			const lookup = jest.fn(async () => [{ address: '93.184.216.34' }])
			const fetchImpl = jest.fn()

			await expect(new RemoteFetchService(lookup, fetchImpl as never).fetchImage(url)).rejects.toBeInstanceOf(
				ValidationError
			)
			expect(lookup).not.toHaveBeenCalled()
			expect(fetchImpl).not.toHaveBeenCalled()
		}
	)

	it('recusa host público cujo DNS resolve para IP reservado (rebinding)', async () => {
		const lookup = jest.fn(async () => [{ address: '10.0.0.5' }])
		const fetchImpl = jest.fn()

		await expect(
			new RemoteFetchService(lookup, fetchImpl as never).fetchImage('https://static.cdn.example.com/a.png')
		).rejects.toBeInstanceOf(ValidationError)
		expect(fetchImpl).not.toHaveBeenCalled()
	})

	it('recusa redirect para IP reservado', async () => {
		const lookup = jest.fn(async () => [{ address: '93.184.216.34' }])
		const fetchImpl = jest.fn(
			async () => new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/x' } })
		)

		await expect(
			new RemoteFetchService(lookup, fetchImpl as never).fetchImage('https://example.com/a.png')
		).rejects.toBeInstanceOf(ValidationError)
		expect(fetchImpl).toHaveBeenCalledTimes(1)
	})
})
