# Lições aprendidas — Vitraux

Entradas curtas pós-incidente ou bug não óbvio. Formato: **sintoma → causa → fix/prevenção**.

Atualize este arquivo após correções que um agente poderia repetir. Processo: [`AGENTS.md`](../AGENTS.md#memória-de-lições-taskslessonsmd).

---

## TX em todo use case (master port)

**Sintoma:** Latência alta em listagens (`ListUserImages`, GET perfil); contenção no Mongo sem writes.

**Causa:** `UseCaseMasterPort.run()` sempre chama `DbCommander.startTransaction()` — inclusive para leituras puras.

**Prevenção:** Novos use cases de leitura devem evitar TX desnecessária (épico DATA-05). Repositories de mutação usam `injectables.prisma` (TX client); não usar `DbCommander.getClient()` no meio de uma TX.

---

## Root Prisma client fora da transação

**Sintoma:** Dados inconsistentes ou writes invisíveis dentro do mesmo use case; difícil de reproduzir.

**Causa:** Código chama `DbCommander.getClient()` ou `new PrismaClient()` enquanto o use case já está em `$transaction` — writes vão para conexão diferente.

**Prevenção:** Repositories recebem apenas `Prisma.TransactionClient` do master port. Services não acessam Prisma. Ver [`docs/architecture.md`](../docs/architecture.md).

---

## Keys legadas no Spaces (`dev/images/…`)

**Sintoma:** Objetos públicos com prefixo `dev|prod|test`; URLs previsíveis; ACL inconsistente.

**Causa:** Formato antigo `{env}/{category}/{hash}` antes do padrão `{ownerId}/{category}/{hash}`.

**Prevenção:** Uploads novos via `Storage.service` com key `{ownerId}/…`. Migração: `npm run spaces:migrate-keys -- --dry-run` antes de `--confirm`. Doc: [`docs/operators/spaces-key-migration.md`](../docs/operators/spaces-key-migration.md).

---

## i18n — string só em um catálogo

**Sintoma:** Build ou runtime falha; UI em branco para locale `es`; TypeScript reclama de chave faltando.

**Causa:** Chave adicionada em `pt.ts` mas não em `en.ts` / `es.ts` ou em `types.ts`.

**Prevenção:** Sempre editar os três catálogos + tipos. Checklist em [`AGENTS.md`](../AGENTS.md#i18n--checklist).

---

## Scripts de operador em produção

**Sintoma:** Vazamento de e-mails mascarados, mutação acidental de bucket, ou crash por env de prod.

**Causa:** Rodar `list-users`, `export-from-pinterest`, backfills ou migrações Spaces no host de produção.

**Prevenção:** Scripts usam `refuseIfProduction()` quando aplicável. Preferir `--dry-run`. Nunca operar no mesmo host que `next start` sem flag explícita do mantenedor.

---

## Cookie de sessão em dev vs prod

**Sintoma:** Login OK mas sessão não persiste em HTTPS; ou cookie rejeitado em localhost.

**Causa:** Em produção o cookie usa prefixo `__Host-` e exige `Secure`. Em dev usa nome simples `vitraux-session`.

**Prevenção:** Testar auth com o mesmo `NODE_ENV`/proxy do ambiente alvo. Ver `src/utils/session.ts` e ADR-001.

---

## Documentação só no board do GitHub

**Sintoma:** Feature “fechada” na issue, mas ninguém encontra contrato HTTP, ADR ou runbook no repo; agentes reimplementam ou quebram API.

**Causa:** Aceite cumprido só no código + comentário na issue, sem atualizar `docs/`, `requests/`, ADR ou README quando o escopo exige.

**Prevenção:** Toda feature mergeada deve deixar rastro no repositório conforme o aceite (ex.: rota nova → `requests/` + checklist DTO; decisão → ADR; operação → `docs/operators/`). O board rastreia _trabalho_; o repo é a _fonte de verdade_ do produto.

---

## Soft delete — `deletedAt` ausente no documento

**Sintoma:** Registros “deletados” ou duplicados aparecem em listagens; contagem errada após soft delete antigo.

**Causa:** Filtro `deletedAt: null` só — no MongoDB o campo pode **não existir** em documentos criados antes do soft delete ou migrados.

**Prevenção:** Em queries de entidades com soft delete, usar condição equivalente a “não deletado”, por exemplo `OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }]` ou helper compartilhado no repository. Nunca assumir que `deletedAt` está sempre presente.

---

## Google OAuth — match só via `pendingEmail`

**Sintoma:** Conta alheia recebe sessão Google sem senha durante troca de e-mail.

**Causa:** Lookup por `pendingEmail` + `googleLinkedAt` (vínculo do e-mail _atual_) levava a `session` sem prova de posse do endereço pendente.

**Prevenção:** Em `decideGoogleOAuthCallback`, se `matchedBy === 'pendingEmail'`, sempre `pending_link` (senha). Nunca tratar `googleLinkedAt` como identidade do e-mail pendente.
