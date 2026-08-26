const BYTES_PER_MEGABYTE = 1024 * 1024

export function bytesToMegabytes(bytes: number): number {
	return bytes / BYTES_PER_MEGABYTE
}

export function formatMegabytes(bytes: number, locale: string): string {
	return bytesToMegabytes(bytes).toLocaleString(locale, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})
}
