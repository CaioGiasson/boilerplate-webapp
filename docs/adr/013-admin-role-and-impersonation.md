# ADR-013 — Papel ADMIN e impersonamento de usuários

- **Status:** Aceito
- **Data:** 2026-10-26

## Contexto

Suporte e operação precisam listar contas e reproduzir o que um usuário vê. O `tribalRPGBot` resolveu isso com um nível `ADMIN` e um link de acesso temporário. O boilerplate não tem planos/níveis, então o papel precisa de um campo próprio.

## Decisão

- **Papel em `User.role`** (`USER` | `ADMIN`), separado de qualquer futuro nível de plano. O campo é **opcional** no schema: no MongoDB, campo obrigatório ausente em documento antigo quebra a leitura. Ausente conta como `USER` (`normalizeUserRole`); `npm run user-role:backfill` uniformiza o dado.
- **Único caminho para criar admin:** `npm run change-user-role -- <email> ADMIN` (exige `--confirm` em produção). Não há rota que promova usuários.
- **Controle de acesso no use case** (`assertAdmin`), em todo caso de uso admin; o `if` do cliente em `/admin` é só UX.
- **Impersonamento:**
    - O admin gera um token em `POST /api/v1/admin/users/{id}/impersonation-token`; o painel monta o link `/?impersonate=<token>`.
    - O link só vale em navegador **sem sessão válida** (409 caso contrário) e é consumido por `POST /api/v1/auth/impersonate` chamado pelo **cliente** (`ImpersonationConsumer`), não pelo `middleware.ts`: o middleware roda na Edge, sem Prisma, e gravar cookie em um GET deixaria o prefetch abrir a sessão.
    - A sessão é o JWT normal com `sessionType: 'IMPERSONATION'` e `impersonatedBy`, **10 minutos, sem renovação**, nunca vira `ActiveSession` (não aparece em Dispositivos do alvo) e não dispara e-mail de novo login.
    - Cai se o alvo trocar a senha (`sessionsRevokedAt`), se o jti for revogado, se o alvo sumir ou se o admin emissor deixar de ser `ADMIN`.
    - Durante o impersonamento, rotas destrutivas e de conta respondem 403 (`assertNotImpersonation`): troca de senha, troca/verificação de e-mail, exclusão e decisão de quarentena, exportação, revogação de sessões e as próprias rotas admin.
    - Não é possível impersonar a si mesmo nem outro admin (endurecimento em relação ao tribal).
    - Uma faixa vermelha com o alvo, o tempo restante e o botão Sair aparece em todas as telas.
- A listagem admin devolve **e-mail mascarado** e nenhum campo sensível.

## Consequências

### Positivas

- Suporte reproduz o problema sem pedir a senha do usuário.
- Superfície pequena: um campo, dois scripts de operador, três rotas.

### Negativas / trade-offs

- **O token é o próprio JWT de sessão.** Quem tem o link vira o alvo por até 10 minutos; não há revogação antes disso além do logout, da troca de senha do alvo ou da demissão do admin. O link não deve ser colado em canais compartilhados.
- **Auditoria só em log de aplicação** (`LogManager.info`: ids, nunca o token). Log é efêmero; persistir a emissão (admin, alvo, instante) é um próximo passo recomendado, fora desta entrega.
- Admin passa a ter acesso a dados de conta durante o suporte: informar na política de privacidade (**revisão jurídica**, o texto legal não foi alterado aqui).
- Conta sem o campo `role` precisa do backfill para aparecer em consultas por papel; o app funciona sem ele.

## Referências

- `src/utils/session.ts`, `src/middleware/auth.middleware.ts`, `src/useCases/{createImpersonationToken,consumeImpersonationToken,listAdminUsers}.usecase.ts`
- `docs/operators/admin.md`, `docs/operators/incident-response.md`
