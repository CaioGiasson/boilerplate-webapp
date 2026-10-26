import { NextResponse } from 'next/server'
import ApiPresenter from '@/utils/Api.presenter'

const NO_STORE = { 'Cache-Control': 'no-store' }

/** Sonda de conectividade para o navegador: público, sem estado, sem banco e sem dados. Diferente de `/api/health*` (loopback/token). */
export async function GET() {
	return NextResponse.json(ApiPresenter.success('Pong', { ok: true }), { headers: NO_STORE })
}

export async function HEAD() {
	return new NextResponse(null, { status: 200, headers: NO_STORE })
}
