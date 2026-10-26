import { runWithoutTransaction } from '@/managers/Db.manager'
import AiLogRepository from '@/repositories/AiLog.repository'
import type { AiLogRecorderPort } from '@/services/AI/ai.port'
import type { AiLogEntry } from '@/services/AI/ai.types'

/**
 * Grava o `AiLog` fora de qualquer transação de use case: o registro de uma chamada paga
 * precisa sobreviver mesmo que o use case que a fez seja revertido (ADR-012).
 */
export default class AiLogRecorder implements AiLogRecorderPort {
	async record(entry: AiLogEntry): Promise<void> {
		await runWithoutTransaction((client) => new AiLogRepository(client).create(entry))
	}
}
