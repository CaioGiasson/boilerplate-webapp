import type { MetadataRoute } from 'next'
import { buildWebManifest } from '@/lib/pwa/webManifest'

export default function manifest(): MetadataRoute.Manifest {
	return buildWebManifest()
}
