import { z } from 'zod'

export const uploadPhotoBodySchema = z.object({
	image: z.string().min(1),
})
