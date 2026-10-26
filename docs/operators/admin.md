# Administração de contas e impersonamento

Decisão: [ADR-013](../adr/013-admin-role-and-impersonation.md).

## Papéis

| Papel   | Acesso                                                                     |
| ------- | -------------------------------------------------------------------------- |
| `USER`  | Padrão. Conta sem o campo `role` também conta como `USER`                  |
| `ADMIN` | `/admin` (lista de usuários) e geração de links de acesso (impersonamento) |

## Criar ou remover um admin

```bash
npm run change-user-role -- pessoa@example.com ADMIN
# produção
npm run change-user-role -- pessoa@example.com ADMIN --confirm
npm run change-user-role -- pessoa@example.com USER --confirm
```

Confirme a identidade de quem pediu antes de promover. Não existe rota que faça isso. Rebaixar um admin invalida na hora os links de impersonamento que ele emitiu e ainda não expiraram.

## Backfill do campo `role`

```bash
npm run user-role:backfill -- --dry-run
npm run user-role:backfill -- --confirm
```

Grava `USER` nas contas sem o campo. O app funciona sem rodar; o backfill uniformiza o dado.

## Acessar uma conta (suporte)

1. Entre como admin e abra **Administração** no menu da conta.
2. Na linha do usuário, use **Copiar link de acesso**. O link vale **10 minutos** e não pode ser emitido para si mesmo nem para outro admin.
3. Abra o link em uma **janela anônima** (sem sessão ativa; com sessão a resposta é 409 e nada muda).
4. Uma faixa vermelha mostra o alvo e o tempo restante. **Sair** encerra a sessão. Nada do que exige senha ou e-mail está disponível (troca de senha/e-mail, exclusão, exportação, sessões).

Boas práticas: não cole o link em canais compartilhados; use só com o consentimento do titular ou base legal de suporte; registre o motivo no ticket.

## Investigar uso indevido

A emissão é registrada em log de aplicação (`Impersonation token issued`, com `adminId` e `targetUserId`; nunca o token). Procure essa linha no agregador de logs. O consumo não gera registro próprio: a sessão aparece só como requisições do alvo dentro da janela de 10 minutos. Veja também [incident-response.md](incident-response.md).

## Limites conhecidos

- Não há revogação individual do link antes de 10 minutos, exceto: o alvo trocar a senha, o admin ser rebaixado ou o logout.
- A auditoria não é persistida em banco (ADR-013).
