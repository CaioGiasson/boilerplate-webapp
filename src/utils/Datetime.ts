const PAD_LENGTH = 2

export default class Datetime {
	static now(): Date {
		return new Date()
	}

	static format(date: Date, pattern: string): string {
		const year = date.getFullYear().toString()
		const month = (date.getMonth() + 1).toString().padStart(PAD_LENGTH, '0')
		const day = date.getDate().toString().padStart(PAD_LENGTH, '0')
		const hours = date.getHours().toString().padStart(PAD_LENGTH, '0')
		const minutes = date.getMinutes().toString().padStart(PAD_LENGTH, '0')
		const seconds = date.getSeconds().toString().padStart(PAD_LENGTH, '0')

		return pattern
			.replace('YYYY', year)
			.replace('MM', month)
			.replace('DD', day)
			.replace('HH', hours)
			.replace('mm', minutes)
			.replace('ss', seconds)
	}
}
