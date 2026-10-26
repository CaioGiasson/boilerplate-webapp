import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import AdminController from '@/controllers/Admin/Admin.controller'

export async function GET(request: NextRequest) {
	return AdminController.listUsers(request, getDependencies())
}
