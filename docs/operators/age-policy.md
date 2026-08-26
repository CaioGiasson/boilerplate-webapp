# Política de idade (PRIV-C06)

## Decisão de produto

O Vitraux **não opera contas de menores de 18 anos**.

- No cadastro, a data de nascimento é **obrigatória**.
- Idade < 18 → cadastro **recusado** (HTTP 400).
- **Não** há fluxo de consentimento parental / responsável legal nesta versão.
- Motivo: um fluxo parental incompleto seria pior, juridicamente, do que o bloqueio explícito (LGPD art. 14; GDPR art. 8).

## Cálculo de idade (UTC date-only)

- O cliente envia `birthDate` no formato `YYYY-MM-DD`.
- Persistimos `dateOfBirth` como `DateTime` em `00:00:00.000Z` daquele dia civil.
- A idade é calculada comparando **ano/mês/dia UTC** de “hoje” com a data de nascimento (sem fuso local).
- No dia civil UTC em que a pessoa completa 18 anos, o cadastro é **permitido**.

## Dados persistidos

| Campo           | Uso                                                                                |
| --------------- | ---------------------------------------------------------------------------------- |
| `dateOfBirth`   | Auditoria do age gate (PII; **não** entra em `PublicUser` / payloads de terceiros) |
| `ageVerifiedAt` | Momento em que o age gate passou no cadastro                                       |

Ver também: `docs/operators/csam.md` (canal de denúncia).
