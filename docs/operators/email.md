# E-mail transacional (Brevo)

Infra: `EmailService` (fachada) + `BrevoService` (adapter HTTP). Use cases chamam só `EmailService`.

## Setup

1. Conta em [Brevo](https://www.brevo.com/) (plano free ~300 e-mails/dia).
2. Verificar o remetente/domínio no painel Brevo.
3. Criar API key (SMTP & API → API keys).
4. No `.env`:

```bash
EMAIL_PROVIDER=brevo
EMAIL_FROM="noreply@seudominio.com"
EMAIL_FROM_NAME="App"
BREVO_API_KEY="..."
# EMAIL_TIMEOUT_MS=10000
# BREVO_API_BASE_URL="https://api.brevo.com"
# BREVO_SANDBOX=true   # opcional: não entrega (header X-Sib-Sandbox: drop)
# APP_BASE_URL="http://localhost:3000"  # origem pública nos links de verificação
```

Em development, `EMAIL_PROVIDER=none` (ou omitido) desliga o envio (noop). Em production-like (`ENVIRONMENT=prod` ou `NODE_ENV=production`), `none`/`disabled` são recusados.

Smoke local (recusa production):

```bash
npm run test-email -- destinatario@exemplo.com
```

Envia assunto `Hello World` / corpo `Teste de envio de e-mail` usando `EMAIL_FROM` (e `EMAIL_FROM_NAME` se definido) como remetente. Exige `BREVO_API_KEY`; o remetente precisa estar verificado na Brevo.

## Contas já existentes

Usuários criados **antes** deste fluxo ficam com `emailVerifiedAt = null` (accordion amarelo). Para “grandfather” em ambientes já em uso:

```bash
npm run email:backfill-verified
```

Marca `emailVerifiedAt = createdAt` onde ainda é null e não há challenge pendente.

Para voltar uma conta ao estado “não verificada” (testes locais; recusa production):

```bash
npm run unconfirm-account -- user@example.com
```

Limpa `emailVerifiedAt`, `pendingEmail` e challenges de token.

Upgrade free→pago na Brevo **não** exige mudança de código.
