# Planejamento: Exclusão de conta com quarentena de 30 dias

> Gerado em 2026-08-26. Revise e confirme antes da criação das issues.

## Objetivo

Substituir a exclusão **imediata e irreversível** de conta por um fluxo de **quarentena (soft delete)** de 30 dias, reversível por login + decisão explícita do titular, com **hard delete** automático após o prazo (LGPD — eliminação irrecuperável). O titular é avisado na UI e por e-mail, com data limite clara.

## Regras de negócio

1. Ao solicitar exclusão no perfil (confirmada), a conta recebe `deletedAt` = instante da **primeira** solicitação (não sobrescrever se já existir — edge: pedido repetido não deve ocorrer com sessões revogadas).
2. **Não** anonimizar, **não** alterar `passwordHash`, **não** apagar Objects no Spaces no momento do pedido.
3. **Não** soft-deletar imagens em massa na quarentena. Conteúdo some das listagens/mosaicos porque o **dono** está em quarentena (`User.deletedAt` set).
4. Revogar **todas** as sessões (`sessionsRevokedAt` + limpar cookie da sessão atual).
5. Enviar **e-mail** completo (pt/en/es conforme locale) explicando: pedido em data/hora X; quarentena 30 dias; data limite para cancelar; login + cancelamento restaura; após o prazo, exclusão **IRRECUPERÁVEL** (LGPD).
6. Após sucesso da API: deslogar e redirecionar para **`/account-delete`** com o mesmo conteúdo informativo do e-mail (sem botões MANTER/CANCELAR nessa visita pós-pedido — só explicação).
7. **Confirmação do pedido:**
    - Conta **com senha:** palavra de confirmação (`EXCLUIR` / `DELETE` / `ELIMINAR`) **+** senha atual.
    - Conta **só-Google** (`passwordHash` ausente, Google vinculado): **apenas** a palavra de confirmação (opção B), estando autenticado.
8. **Durante a quarentena:** e-mail e nickname permanecem (únicos reservados); ninguém registra a mesma identidade; conteúdo público/privado do titular **não é exibido de forma alguma**.
9. **Re-login na quarentena (&lt; 30 dias):** autenticação válida (senha ou Google) **não** entra no app direto. Abre tela informando: exclusão solicitada em data/hora X pelo próprio usuário; fazer login implica poder cancelar; se não cancelar em 30 dias, apagamento permanente. Dois botões, com a **primeira palavra em caixa alta**:
    - `MANTER exclusão do perfil`
    - `CANCELAR exclusão do perfil`
10. **CANCELAR:** limpa `deletedAt`; restaura acesso e visibilidade do conteúdo (imagens que o usuário já tinha soft-deletado **individualmente** antes do pedido de conta **continuam** deletadas).
11. **MANTER:** permanece em quarentena; usuário fica / volta a ficar deslogado.
12. **Após 30 dias** (cron): hard delete — anonimizar stub (`deleted_{id}@invalid.local` / `deleted_{id}`), soft-delete de **todo** o conteúdo do usuário, `DeleteObject` no Spaces dos arquivos do titular (alinhado ao wipe atual + retenção de imagens soft-deleted).
13. Conta com `deletedAt` ≥ 30 dias ainda não purgada pelo cron: tratar como não restaurável (login falha ou mensagem de conta já encerrada — sem CANCELAR).
14. Atualizar política de privacidade (pt/en/es) e docs operacionais: deixar de dizer “exclusão imediata sem graça”.
15. Imagens soft-deletadas **individualmente** (fluxo atual do mosaico) continuam com seu próprio `deletedAt` e o passo existente do `retention-purge` (30d → Spaces); independente da quarentena de conta.

## Critérios de aceite

- [ ] `DELETE /api/v1/users/me` coloca a conta em quarentena (`deletedAt`), revoga sessões, **não** apaga Spaces nem anonimiza nem troca senha.
- [ ] Conta com senha: exige palavra + senha; conta só-Google: exige só a palavra (autenticado).
- [ ] E-mail de quarentena enviado com data/hora do pedido, prazo 30 dias, data limite e aviso LGPD de exclusão irrecuperável.
- [ ] Client redireciona para `/account-delete` com o mesmo teor do e-mail.
- [ ] Conteúdo do titular some imediatamente de mosaicos/listagens/perfil público; Objects no Spaces permanecem até o hard delete.
- [ ] Login (senha/Google) em conta em quarentena (&lt; 30d) abre tela de decisão com botões `MANTER exclusão do perfil` e `CANCELAR exclusão do perfil`.
- [ ] CANCELAR limpa `deletedAt` e restaura a conta; MANTER mantém quarentena e deixa deslogado.
- [ ] Cron (estender `retention-purge` ou job dedicado) hard-deleta contas com `deletedAt` &gt; 30 dias (anonimizar + soft-delete conteúdos + Spaces).
- [ ] Docs: `account-deletion.md`, `retention.md`, `cron.md`; privacy pt/en/es; OpenAPI + `requests/*.http`; i18n pt/en/es; testes de use cases.
- [ ] Imagens já soft-deletadas individualmente antes da quarentena **não** reaparecem no CANCELAR.

## Fluxo principal

### Pedido de exclusão

1. Perfil → seção excluir conta → confirma (senha se houver + palavra) → `DELETE /api/v1/users/me`.
2. Sistema seta `deletedAt`, revoga sessões, envia e-mail.
3. Client limpa sessão e navega para `/account-delete` (texto = e-mail).

### Quarentena

1. Mosaicos e APIs de listagem ignoram imagens de owners com `deletedAt` set.
2. Registro com mesmo e-mail/nickname permanece bloqueado (unique + conta ainda existe).

### Cancelamento via login

1. Usuário faz login (senha ou Google) com conta em quarentena &lt; 30d.
2. Tela de decisão (conteúdo alinhado ao e-mail + botões MANTER / CANCELAR).
   3a. CANCELAR → `deletedAt = null` → sessão normal → app.
   3b. MANTER → sem limpar `deletedAt` → deslogado.

### Hard delete (cron)

1. Job encontra `User.deletedAt` &lt; now − 30d.
2. Soft-delete imagens do owner; DeleteObject Spaces; anonimiza User (stub); revoga o que restar.
3. Conta deixa de ser restaurável.

## Edge cases

- Conta só-Google sem senha: exclusão só com palavra de confirmação (sessão autenticada).
- Login após prazo (≥ 30d) antes do cron: não oferecer CANCELAR; credenciais tratadas como conta encerrada / inválidas de forma segura.
- Imagem soft-deletada individualmente antes da quarentena: permanece com `deletedAt` próprio após CANCELAR da conta.
- Falha no envio de e-mail: quarentena **mesmo assim** ocorre; logar falha; UI `/account-delete` continua sendo a fonte imediata de informação (e-mail best-effort, padrão dos outros mails).
- Pedido de exclusão com sessão já em quarentena: não aplicável (sessões revogadas; `requireAuth` falha).
- Corrida login vs cron no limite dos 30 dias: se `deletedAt` já passou do prazo, CANCELAR rejeitado.
- Cache da home/mosaico público: invalidar / excluir owners em quarentena (evitar conteúdo stale — alinhar a CACHE-03 se tocado).
- Google OAuth em conta em quarentena: mesmo fluxo de decisão MANTER/CANCELAR (não criar conta nova).

## Repositórios afetados

### vitraux

- **O que muda:** soft delete reversível de User; filtro de conteúdo por owner em quarentena; páginas `/account-delete` + decisão no login; e-mail; cron de hard purge; docs/legal/contratos/i18n/testes.
- **Módulos/endpoints afetados (prováveis):**
    - `deleteUserAccount.usecase.ts` + `deleteAccount.route.ts` + client/UI perfil
    - `loginUser` / Google callback → branch quarentena
    - Novos use cases: cancel/keep account deletion (ou um com ação)
    - `User.repository` (soft delete sem anonimizar; find incluindo deletados para login; restore)
    - `Image.repository` / listagens mosaico (exclude owners com `deletedAt`)
    - `scripts/cron/jobs/retention-purge.mjs` (ou job `account-purge`)
    - `src/utils/emailMessages.ts` + templates i18n
    - `app/.../account-delete` (página)
    - `docs/operators/*`, `content/legal/privacy.*`, OpenAPI, `requests/*`
- **Dependências:** nenhuma externa além de Brevo (e-mail) e Spaces (hard delete).
- **Cuidados técnicos:** filtro Mongo soft-delete (`deletedAt` ausente); ADR-007 (Spaces só no hard delete); i18n nos 3 locales; não expor `deletedAt` em PublicUser desnecessariamente; contratos HTTP obrigatórios.

## Dependências entre repositórios

Nenhuma — mono-repo Vitraux.

## Informações pendentes

Nenhuma — opção B (só-Google: só palavra de confirmação) confirmada.
