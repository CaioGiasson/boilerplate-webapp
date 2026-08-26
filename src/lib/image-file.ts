import { IMAGE_MAX_BYTES, IMAGE_MIME_TYPES } from '@/constants/fileUpload'

export function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			if (typeof reader.result === 'string') resolve(reader.result)
			else reject(new Error('Could not read file'))
		}
		reader.onerror = () => reject(new Error('Could not read file'))
		reader.readAsDataURL(file)
	})
}

export function assertImageFile(file: File): 'tooLarge' | 'invalidType' | null {
	if (file.size > IMAGE_MAX_BYTES) return 'tooLarge'
	if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) return 'invalidType'
	return null
}
