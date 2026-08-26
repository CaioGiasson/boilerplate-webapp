import LogManager from '@/managers/Log.manager'

export default class ErrorManager {
	static log(error: Error): void {
		LogManager.error(error.message, {
			name: error.name,
			stack: error.stack,
		})
	}
}
