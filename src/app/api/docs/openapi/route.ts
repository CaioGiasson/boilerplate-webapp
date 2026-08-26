import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { swaggerGateResponse } from '@/utils/swaggerAccess'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
	const denied = swaggerGateResponse(request)
	if (denied) {
		return denied
	}

	const specPath = path.join(process.cwd(), 'docs', 'openapi.yaml')
	try {
		const yaml = await readFile(specPath, 'utf8')
		return new NextResponse(yaml, {
			status: 200,
			headers: {
				'Content-Type': 'application/yaml; charset=utf-8',
				'Cache-Control': 'no-store',
			},
		})
	} catch {
		return NextResponse.json(
			{ success: false, message: 'OpenAPI spec not found', code: 'NOT_FOUND' },
			{ status: 404, headers: { 'Cache-Control': 'no-store' } }
		)
	}
}
