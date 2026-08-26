# ADR-010 — Login Google OAuth (Authorization Code)

- **Status:** Aceito
- **Data:** 2026-08-26

## Contexto

O produto precisa de login/cadastro social sem abandonar a sessão JWT em cookie (ADR-001). Contas existentes com o mesmo e-mail devem poder vincular Google com confirmação de senha.

## Decisão

- OAuth 2.0 Authorization Code com Google Identity; env `GOOGLE_OAUTH_*` (opcional — botão oculto se incompleto).
- Identidade Vitraux casa pelo **e-mail** exato; flag `googleLinkedAt`; `passwordHash` opcional.
- State e pending flows em cookies HttpOnly assinados (jose); callback redireciona para UI de onboarding ou vínculo.
- Sessão pós-sucesso reutiliza JWT + `ActiveSession` (ADR-001).

## Consequências

### Positivas

- Mesmo modelo de sessão do login clássico.
- Feature degradável sem vars Google.

### Negativas

- Google torna-se suboperador de auth (RoPA).
- Troca de e-mail desvincula Google (match por e-mail).

## Referências

- `tasks/refinamento-login-google.md`
- `src/services/GoogleOAuth/`
- Issues #184–#191
