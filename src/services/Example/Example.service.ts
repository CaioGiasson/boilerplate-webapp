import type { ExampleRawData } from './Example.ports'

export default class ExampleService {
	/**
	 * Gera um dado de exemplo.
	 * Isolado em um service para permitir troca futura por integração externa
	 * sem alterar useCases ou controllers.
	 */
	async generate(): Promise<ExampleRawData> {
		const now = new Date()
		const suffix = Math.floor(Math.random() * 100_000)

		return {
			id: now.getTime().toString(),
			created_at: now.toISOString(),
			value: `Hello World from Vitraux #${suffix}`,
		}
	}
}
