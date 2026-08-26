import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import UserController from '@/controllers/User/User.controller'

export async function DELETE(request: NextRequest) {
	return UserController.deleteAccount(request, getDependencies())
}
