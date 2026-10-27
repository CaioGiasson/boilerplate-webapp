import { getEmailService } from '@/services/Email/Email.service'
import type { JobHandlers } from '@/jobs/processNextJob'

/**
 * Handlers por tipo de job. Quem registra aqui decide o que o worker sabe fazer.
 * O handler recebe só o payload (e o contexto): dependências vêm dos `get...Service()` (singletons).
 * Deve ser **idempotente o bastante** para rodar de novo (entrega at-least-once).
 */
export function buildJobHandlers(): JobHandlers {
	return {
		'email.send': async (payload) => {
			// Falha do provedor lança: o worker faz retry com backoff.
			await getEmailService().send(payload)
		},
	}
}
