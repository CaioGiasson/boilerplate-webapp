import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import AuthController from '@/controllers/Auth/Auth.controller'

export async function GET(request: NextRequest) {
	const dependencies = getDependencies()
	return AuthController.me(request, dependencies)
}
