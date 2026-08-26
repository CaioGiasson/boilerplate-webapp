# ADR-001 — Sessão JWT em cookie HTTP-only

- **Status:** Aceito
- **Data:** 2026-08-23

## Contexto

A API precisa autenticar requests stateless (Next.js serverless-friendly) sem expor tokens em localStorage (XSS). Sessões devem ser revogáveis server-side (`ActiveSession`).

## Decisão

- Emitir JWT (via `jose`) com claims mínimas: `userId`, `device`, `jti`.
- Armazenar em cookie **HTTP-only**, `SameSite=Lax`, `Secure` em produção.
- Nome do cookie: `vitraux-session` (dev) / `__Host-vitraux-session` (prod, exige HTTPS).
- Cookie auxiliar `vitraux-device` (UUID) para alerta de novo login.
- TTL configurável via env; hash de `jti` persistido para revogação.

## Consequências

### Positivas

- Mitiga XSS roubando token via JS.
- Compatível com App Router e rotas API.

### Negativas

- Exige TLS correto em produção (`__Host-` prefix).
- CSRF mitigado com `assertSameOrigin` em mutações auth.

## Referências

- `src/utils/session.ts`
- `src/useCases/loginUser.usecase.ts`
- SECURITY-REPORT (SEC-I13, SEC-I15)
