import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import UserController from '@/controllers/User/User.controller'

export async function GET(request: NextRequest) {
	return UserController.listSessions(request, getDependencies())
}

export async function DELETE(request: NextRequest) {
	return UserController.revokeOtherSessions(request, getDependencies())
}
