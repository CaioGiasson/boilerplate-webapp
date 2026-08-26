import { NextRequest } from 'next/server'
import AuthController from '@/controllers/Auth/Auth.controller'
import { getDependencies } from '@/container/dependencies'

export async function GET(request: NextRequest) {
	const dependencies = getDependencies()
	return AuthController.googleStart(request, dependencies)
}
