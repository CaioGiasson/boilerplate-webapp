# Trocar a senha de uma conta (operador)

Uso: suporte a titular que perdeu acesso e não consegue o fluxo de "esqueci a senha".

```bash
NEW_PASSWORD='<nova-senha>' npm run change-user-password -- usuario@example.com --confirm
```

- `--confirm` é obrigatório (também fora de produção).
- Prefira `NEW_PASSWORD`: argumento de linha de comando fica no histórico do shell. O script aceita a senha como segundo argumento, mas não é recomendado.
- A senha segue a política do app (8–128 caracteres, ao menos 3 entre minúscula, maiúscula, número e símbolo) e é gravada com argon2. Nunca é impressa.
- O script grava `sessionsRevokedAt`: todas as sessões já emitidas passam a responder 401.
- Só atua em conta ativa (não em quarentena de exclusão). O e-mail aparece mascarado no log.
- Pode rodar em produção a partir de uma máquina de operador com `DATABASE_URL` válida; **não** rode no host de `next start` (regra do `AGENTS.md` para scripts de operador).

A política do script está em `scripts/lib/passwordPolicy.cjs` e é comparada com `src/utils/passwordPolicy.ts` por `tests/scripts/passwordPolicy.test.ts`.
