import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'

export const REQUEST_ID_HEADER = 'x-request-id'

/** Aceita só o que cabe num log sem risco (sem espaços, quebras ou lixo): evita injeção de linha de log. */
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/

type RequestContext = { requestId: string; ip?: string }

const storage = new AsyncLocalStorage<RequestContext>()

/** Reaproveita o `x-request-id` de entrada (proxy/gateway) quando válido; senão gera um UUID. */
export function resolveRequestId(incoming?: string | null): string {
	const candidate = incoming?.trim()
	return candidate && VALID_REQUEST_ID.test(candidate) ? candidate : randomUUID()
}

export function runWithRequestContext<T>(requestId: string, run: () => T, extras: { ip?: string } = {}): T {
	return storage.run({ requestId, ip: extras.ip }, run)
}

/** `undefined` fora de uma requisição (scripts, boot, testes sem contexto). */
export function getRequestId(): string | undefined {
	return storage.getStore()?.requestId
}

/** IP do cliente da requisição em curso (já normalizado); `undefined` fora de uma requisição ou sem IP confiável. */
export function getClientIp(): string | undefined {
	return storage.getStore()?.ip
}
