import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import PushController from '@/controllers/Push/Push.controller'

export async function POST(request: NextRequest) {
	return PushController.sendTest(request, getDependencies())
}
