# Jobs em background

Fila no próprio MongoDB para trabalho que **não deve acontecer dentro do request**: e-mail, push em lote, chamadas lentas a terceiros. Tem retry com backoff, trava, retomada de job travado e retenção. Sem Redis, sem processo extra.

## Como enfileirar

Dentro de um use case, com o client da **transação**:

```ts
await new JobRepository(injectables.prisma).enqueue('email.send', { to, subject, text })
```

Como o job nasce na mesma transação da mudança de negócio (padrão _outbox_), **se a transação desfaz o job nunca existe**; se confirma, o job existe mesmo que o processo caia logo depois. Opções: `runAt` (agendar) e `maxAttempts` (padrão 5).

## Job novo

1. Uma linha em `JobPayloads` (`src/jobs/types.ts`): tipo → payload.
2. Um handler em `src/jobs/registry.ts` (`buildJobHandlers`). Ele recebe `(payload, { jobId, attempt })`, **lança** para pedir nova tentativa e deve tolerar rodar de novo.
3. Teste do handler. O tipo vira dado persistido: não renomeie um tipo que ainda tem job pendente.

Já existe: `email.send` (payload = `EmailSendInput`; falha do provedor → retry).

## Ciclo de vida

`pending` → (worker pega) `running` → `succeeded` | volta a `pending` com backoff | `failed`.

| Situação                           | O que acontece                                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Handler lança, ainda há tentativas | `pending` com `runAt` = agora + `30 s × 2^(tentativa-1)` (teto 1 h, ±20 % de variação).                   |
| Esgotou `maxAttempts`              | `failed`; `lastError` guarda o erro (≤ 500 caracteres, **sem payload**); o payload fica para diagnóstico. |
| Tipo sem handler                   | `failed` na hora (não há o que tentar).                                                                   |
| Sucesso                            | `succeeded` e **`payload` zerado** (pode ter dado pessoal).                                               |
| Worker morreu no meio              | A trava (`lockedUntil`, 5 min) vence e o job é retomado por qualquer worker.                              |

## Garantias (e o que **não** é garantido)

- **At-least-once.** Se o worker cair depois do efeito (e-mail enviado) e antes de marcar `succeeded`, o job roda de novo. Handler precisa ser idempotente ou aceitar a repetição.
- **Sem execução simultânea do mesmo job:** o consumo é atômico (`updateMany` condicional); mais de um worker ou réplica não duplica.
- **Sem ordem estrita:** pega o `runAt` mais antigo, mas retry e agendamento reordenam.
- **Sem prioridade, sem rate limit por tipo, sem dedupe por chave.**
- O handler **precisa terminar antes da trava vencer** (5 min). Não há heartbeat.

## Worker

Roda **no processo web**, iniciado por `registerNodeInstrumentation` (`src/instrumentation-node.ts`): pega um job por vez; quando a fila esvazia, consulta de novo a cada `JOBS_POLL_INTERVAL_MS` (padrão 5000, mínimo 500). Para no shutdown ([graceful shutdown](graceful-shutdown.md)): termina o job em andamento antes de desconectar o Prisma.

| Variável                        | Efeito                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `JOBS_WORKER=off`               | Desliga o worker neste processo (ex.: réplica só HTTP). Padrão: ligado. Nunca liga em `NODE_ENV=test`. |
| `JOBS_POLL_INTERVAL_MS`         | Intervalo entre consultas com a fila vazia.                                                            |
| `JOBS_SUCCEEDED_RETENTION_DAYS` | Retenção de jobs concluídos (padrão 7).                                                                |
| `JOBS_FAILED_RETENTION_DAYS`    | Retenção de jobs falhos (padrão 30).                                                                   |

**Por que não um `npm run worker` separado:** o worker usa os serviços do app em TypeScript (e-mail, push…), e os scripts de operador são `.mjs` puros, sem como importar `src/`. Um processo próprio exigiria um passo de compilação (ou `tsx`) que o boilerplate não tem. Como o consumo é atômico, quando esse passo existir basta subir outro processo com `JOBS_WORKER=off` nos que atendem HTTP.

## Operação

```bash
npm run jobs:status                              # contagem por estado + últimos falhos (sem payload)
npm run jobs:status -- --retry <jobId> --confirm # devolve um job falho para a fila
```

Reenfileirar zera as tentativas e o job roda de novo (pode repetir o efeito). O `retention-purge` apaga jobs concluídos e falhos vencidos (passo 8).

- **Fila crescendo:** `pending` alto e `running` zero = worker desligado ou o banco indisponível (procure `Job worker tick failed` nos logs).
- **Muitos `failed` do mesmo tipo:** provedor fora ou handler com bug; corrija e use `--retry` (ou reenfileire pelo código).
- Monitore as linhas de log `Job failed, retry scheduled` e `Job failed permanently` (têm `jobId` e `type`, nunca o payload).

## Limites conhecidos

- Os fluxos que já enviam e-mail/push **dentro do request** (cadastro, recuperação de senha, alerta de novo login, notificações) **não** foram migrados: o mecanismo existe, a migração é decisão de cada fluxo (ver ESC-10 em [`known-issues/scalability.md`](../known-issues/scalability.md)).
- Worker no processo web compete por CPU com as requisições (ESC-11).
- Deploy: `npm run prisma:push` cria a coleção `Job` e os índices.
