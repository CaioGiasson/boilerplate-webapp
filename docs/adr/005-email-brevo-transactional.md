# ADR-005 — E-mail transacional via Brevo

- **Status:** Aceito
- **Data:** 2026-08-23

## Contexto

Fluxos de verificação de e-mail, troca de e-mail e reset de senha precisam de entrega confiável sem operar SMTP próprio.

## Decisão

- Adapter `Brevo.service` implementa `EmailDeliveryPort`.
- `Email.service` é a fachada usada pelos use cases (verify, change, forgot password).
- API HTTPS Brevo v3 (`/v3/smtp/email`); API key via env.
- Tokens de desafio armazenados como **hash SHA-256** — nunca o token cru no Mongo.
- Timeout configurável; logs mascaram e-mail (`maskEmail`).

## Consequências

### Positivas

- Sem infra SMTP; métricas no painel Brevo.
- Use cases desacoplados do provedor.

### Negativas

- Dependência externa e custo por volume.
- Dev local pode usar `test-email` script ou mock.

## Referências

- `src/services/Email/Brevo.service.ts`
- `src/services/Email/Email.service.ts`
- `src/useCases/sendEmailVerification.usecase.ts`
- PRIVACY-REPORT (PRIV-I05, PRIV-I09)
