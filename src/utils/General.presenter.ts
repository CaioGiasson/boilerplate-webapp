export default class GeneralPresenter {
	static numberAsString(value: string | number): string {
		const stringValue = value.toString()
		return stringValue.replace(/\D/g, '')
	}
}
