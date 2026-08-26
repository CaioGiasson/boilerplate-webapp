/** Generic image upload limits for client-side file validation. */
export const IMAGE_MAX_BYTES = 3 * 1024 * 1024
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(',')
