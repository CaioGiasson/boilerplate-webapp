import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import UserController from '@/controllers/User/User.controller'

export async function POST(request: NextRequest) {
	return UserController.keepAccountDeletion(request, getDependencies())
}
