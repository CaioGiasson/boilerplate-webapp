# Issues conhecidas — escalabilidade

Snapshot: **2026-10-26**. Limitações **aceitas de propósito**; não são bugs a corrigir antes de existir a necessidade.

## Premissa

O boilerplate roda em **uma instância Node (um processo)** atrás de um proxy, com um MongoDB. **Não há previsão** de que um sistema derivado rode com N réplicas. Vários mecanismos guardam estado em memória do processo e, com mais de uma instância, se comportam de forma diferente do documentado. Quem precisar escalar horizontalmente deve resolver os itens abaixo **antes** de subir a segunda réplica.

O que **já** funciona com N réplicas: sessão JWT sem afinidade (sticky session), persistência no Mongo, Spaces como armazenamento compartilhado e `ActiveSession` no banco. Smoke: [`docs/operators/multi-instance-smoke.md`](../operators/multi-instance-smoke.md). Dimensionamento do pool: [`docs/operators/database-pool.md`](../operators/database-pool.md).

## Resumo

| ID     | Item                                        | Efeito com N réplicas                               | Gravidade |
| ------ | ------------------------------------------- | --------------------------------------------------- | --------- |
| ESC-01 | Rate limit em memória                       | Limite efetivo vira N× o configurado                | Alta      |
| ESC-02 | `Idempotency-Key` em memória                | Replay e deduplicação deixam de valer               | Alta      |
| ESC-03 | Cache de feature flags (30 s)               | Flag demora até 30 s para propagar                  | Baixa     |
| ESC-04 | Circuit breakers por processo               | Cada réplica abre/fecha o circuito sozinha          | Baixa     |
| ESC-05 | Cota de storage não atômica                 | Uploads simultâneos podem passar da cota            | Média     |
| ESC-06 | `retention-purge` sem trava de concorrência | Duas execuções simultâneas disputam os mesmos dados | Média     |
| ESC-07 | Transação em todo use case                  | Leituras puras pagam TX; contenção no Mongo         | Média     |
| ESC-08 | Polling de notificações a cada 60 s         | Carga cresce linearmente com abas abertas           | Baixa     |
| ESC-09 | Processamento de imagem no processo web     | CPU/memória do `sharp` compete com requests         | Média     |
| ESC-10 | E-mail e push enviados dentro do request    | Latência e falha do provedor afetam a resposta      | Baixa     |
| ESC-11 | Worker de jobs no processo web              | Disputa CPU/memória com as requisições              | Baixa     |

## Detalhes

### ESC-01 — Rate limit em memória

`src/middleware/rateLimit.middleware.ts` guarda os contadores num `Map` por processo (`InMemoryRateLimiter`). Reinicia junto com o processo. Com 2 réplicas, o limite de login (5 por minuto) vira ~10; o lockout progressivo também é por instância.

- **Impacto:** enfraquece a proteção contra força bruta (login, `forgot-password`, confirmação de código).
- **Caminho:** aplicar o limite no gateway/proxy (preferido) ou trocar o store por um compartilhado (Mongo com índice TTL, ou Redis) atrás de um port. O contrato `RateLimiter.consume` hoje é síncrono e passaria a ser assíncrono.
- **Teste de prova:** `npm run smoke:multi-instance` deve exigir 429 somando as duas instâncias.

### ESC-02 — `Idempotency-Key` em memória

`src/utils/idempotency.ts` guarda as respostas por 24 h e as requisições em andamento em dois `Map`. Usado em `register`, `resetPassword` e `uploadPhoto`.

- **Impacto:** a mesma chave enviada a réplicas diferentes executa duas vezes (cadastro/upload duplicado); o replay some a cada reinício.
- **Caminho:** coleção `IdempotencyKey` com índice único e TTL; a primeira requisição reserva a chave, as seguintes aguardam ou reaproveitam a resposta.

### ESC-03 — Cache de feature flags

`FeatureFlag.manager.ts` mantém o valor vigente por 30 s (`FEATURE_FLAG_CACHE_TTL_MS`) em cada processo.

- **Impacto:** `toggle-feature-flag` leva até 30 s para valer em cada instância. O script roda em outro processo, então mesmo com instância única a mudança só aparece depois do TTL.
- **Caminho:** reduzir o TTL ou invalidar por evento, se a latência incomodar.

### ESC-04 — Circuit breakers por processo

`src/utils/circuitBreaker.ts` e `services/resilience/externalBreakers.ts` (Brevo, Spaces, OpenAI) guardam o estado em memória.

- **Impacto:** cada réplica descobre sozinha que o provedor caiu; mais chamadas falhas antes de abrir.
- **Caminho:** aceitável na maioria dos casos. Compartilhar estado só se o custo de falhas repetidas justificar.

### ESC-05 — Cota de storage não atômica

A leitura do uso (`File.sizeBytes` publicados) e a gravação do novo arquivo não são atômicas, e o upload acontece fora da transação (ADR-007).

- **Impacto:** dois uploads simultâneos do mesmo usuário podem ultrapassar a cota em um arquivo. Vale também em instância única; com N réplicas a janela aumenta.
- **Caminho:** reserva de cota (campo contador com `updateMany` condicional) antes do upload, liberada se a fase falhar.

### ESC-06 — `retention-purge` sem trava de concorrência

`scripts/cron/jobs/retention-purge.mjs` não registra execução em andamento. O `CronJob` de `deploy/cron/` deve usar `concurrencyPolicy: Forbid`.

- **Impacto:** duas execuções ao mesmo tempo tentam apagar os mesmos objetos/linhas; os erros são toleráveis, mas geram ruído.
- **Caminho:** `concurrencyPolicy: Forbid` no manifesto, ou lock em coleção (`lockedUntil`) quando os jobs em background existirem.

### ESC-07 — Transação em todo use case

`UseCaseMasterPort.run()` abre `DbCommander.startTransaction()` mesmo em leituras puras (ver `tasks/lessons.md`).

- **Impacto:** latência e contenção em listagens com muito tráfego; piora com mais réplicas disputando o mesmo Mongo.
- **Caminho:** use cases de leitura com `transactional = false`.

### ESC-08 — Polling de notificações

`useUnreadNotificationCount` consulta a API a cada 60 s por aba aberta.

- **Impacto:** carga proporcional ao número de usuários conectados, independente de haver notificação.
- **Caminho:** aumentar o intervalo, pausar com a aba oculta, ou SSE/WebSocket (exige hub compartilhado entre réplicas; ver `docs/issues/porte-tribal-backlog.md`, item 10).

### ESC-09 — Processamento de imagem no processo web

`SharpImageProcessor` roda no mesmo processo que atende HTTP (limite de 40 milhões de pixels por imagem).

- **Impacto:** vários uploads grandes simultâneos disputam CPU e memória com as demais rotas.
- **Caminho:** limitar a concorrência do `sharp`, ou mover o processamento para um job (o worker de jobs roda no mesmo processo; mover o `sharp` de verdade exige um processo separado, ver ESC-11).

### ESC-10 — E-mail e push dentro do request

Brevo e Web Push são chamados no ciclo da requisição (depois do commit). Falhas de push são engolidas; as de e-mail passam por retry com jitter.

- **Impacto:** latência do provedor soma à resposta; sem reenvio se o processo cair no meio.
- **Caminho:** o mecanismo já existe ([`docs/operators/jobs.md`](../operators/jobs.md): `JobRepository.enqueue` na transação do use case + worker com retry/backoff e o handler `email.send`). **Falta migrar** os fluxos que ainda enviam inline (cadastro, recuperação de senha, alerta de novo login, notificações/push); a migração é decisão de cada fluxo.

### ESC-11 — Worker de jobs no processo web

O worker de [jobs em background](../operators/jobs.md) roda dentro do mesmo processo Node que atende HTTP (um job por vez, consulta a cada 5 s com a fila vazia).

- **Impacto:** um handler pesado ou lento disputa CPU e memória com as requisições; um handler que trava (sem terminar antes da trava de 5 min) ocupa o worker até a trava vencer.
- **Caminho:** processo separado (exige compilar `src/` ou usar `tsx`, que o boilerplate não tem) com `JOBS_WORKER=off` nos processos HTTP. O consumo atômico já permite mais de um worker.

## Checklist antes de subir a segunda réplica

1. Resolver ESC-01 e ESC-02 (ou garantir equivalente no gateway).
2. Definir `concurrencyPolicy: Forbid` para o CronJob (ESC-06).
3. Dimensionar `connection_limit` pela fórmula de `database-pool.md`.
4. Rodar `npm run smoke:multi-instance` e conferir sessão, limite e upload.
5. Reavaliar ESC-05 e ESC-07 com carga real (`tests/load/`).
