import { getDependencies } from '@/container/dependencies'
import PushController from '@/controllers/Push/Push.controller'

export async function GET() {
	return PushController.vapidPublicKey(getDependencies())
}
