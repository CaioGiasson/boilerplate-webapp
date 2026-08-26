import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import UserController from '@/controllers/User/User.controller'

export async function GET(request: NextRequest) {
	return UserController.getAccountDeletionStatus(request, getDependencies())
}
