import {
	buildImagePath,
	documentTitleForImage,
	documentTitleForPage,
	IMAGE_MODAL_HISTORY_KEY,
	isImageModalHistoryState,
} from '@/lib/image-modal-url'

describe('image-modal-url / document titles', () => {
	it('buildImagePath inclui locale e id', () => {
		expect(buildImagePath('pt', 'abc')).toBe('/pt/image/abc')
	})

	it('isImageModalHistoryState reconhece estado da modal', () => {
		expect(isImageModalHistoryState({ [IMAGE_MODAL_HISTORY_KEY]: true, returnTo: '/pt' })).toBe(true)
		expect(isImageModalHistoryState({ returnTo: '/pt' })).toBe(false)
		expect(isImageModalHistoryState(null)).toBe(false)
	})

	it('documentTitleForImage formata título com prefixo Vitraux', () => {
		expect(documentTitleForImage('Floresta')).toBe('Vitraux - Floresta')
		expect(documentTitleForImage('  ')).toBe('Vitraux')
		expect(documentTitleForImage(null)).toBe('Vitraux')
	})

	it('documentTitleForPage formata seções de página', () => {
		expect(documentTitleForPage()).toBe('Vitraux')
		expect(documentTitleForPage('Minhas imagens')).toBe('Vitraux - Minhas imagens')
	})
})
