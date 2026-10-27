# 2FA (TOTP) e códigos de recuperação

Segundo fator **opcional por conta**, com app autenticador (Google Authenticator, Authy, 1Password…). Desligado por padrão: só existe no servidor que tem a chave de cifra.

## Ligar

1. `npm run two-factor:key` e coloque `TWO_FACTOR_ENCRYPTION_KEY` no `.env`/secret store.
2. **Faça backup da chave.** Ela cifra o segredo TOTP no banco (AES-256-GCM). Sem ela, quem ativou o 2FA **não consegue entrar** (o login pede o TOTP, e os códigos de recuperação só valem no lugar do TOTP, não substituem a chave).
3. Reinicie. A seção "Verificação em duas etapas" aparece no perfil. Chave presente porém inválida (não é 32 bytes em base64) recusa o boot.
4. `npm run prisma:push`: o model novo `TwoFactorRecoveryCode` e os campos `User.twoFactor*` precisam existir.

Sem a variável o app funciona normal, a seção some e **ninguém consegue ativar**. Conta que já tem 2FA e servidor sem a chave: o login responde **503** (falha fechada); nunca "pula" o 2FA.

## Como funciona

| Passo         | Rota                                         | O que acontece                                                                                                       |
| ------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Iniciar       | `POST /users/me/2fa/setup`                   | Gera o segredo (160 bits), guarda **cifrado como pendente** e devolve `secret` + `otpauthUri`. Exige senha na conta. |
| Ativar        | `POST /users/me/2fa/enable`                  | Confere o código com o segredo pendente, ativa e devolve **10 códigos de recuperação, uma única vez**.               |
| Login         | `POST /auth/login` → `POST /auth/2fa/verify` | Senha certa devolve `twoFactorRequired` + `challengeToken` (5 min, **sem sessão**). O verify abre a sessão.          |
| Novos códigos | `POST /users/me/2fa/recovery-codes`          | Exige o código do app (recuperação não serve). Os antigos deixam de valer.                                           |
| Desativar     | `POST /users/me/2fa/disable`                 | Exige **senha e** um código (app ou recuperação). Apaga segredo e códigos.                                           |

Detalhes que importam:

- **TOTP:** RFC 6238 (SHA-1, 6 dígitos, 30 s), janela de ±1 passo para relógio descalibrado. Verificado contra os vetores da RFC nos testes.
- **Sem replay:** o último passo aceito (`twoFactorLastStep`) é gravado de forma atômica; o mesmo código (ou anterior) não vale duas vezes.
- **Códigos de recuperação:** 10, formato `XXXXX-XXXXX` (50 bits), **só o hash SHA-256 fica no banco**, uso único (consumo atômico). O uso de um deles no login é auditado (`user.two_factor_recovery_used`, com quantos restam).
- **Desafio do login:** JWT de 5 minutos com **audiência própria**: nunca vale como sessão, e sessão nunca vale como desafio.
- **Força bruta:** `POST /auth/2fa/verify` limita a 5 tentativas/min por IP, com bloqueio progressivo (mesmo limitador do login; é por processo, ver [`known-issues/scalability.md`](../known-issues/scalability.md) ESC-01).
- **Sessão de impersonamento** não configura nem desativa 2FA (403).
- Tudo é **auditado** ([`audit-log.md`](audit-log.md)): ativar, desativar, gerar códigos, usar código de recuperação, e o reset do operador.

## Celular perdido e sem códigos de recuperação

```bash
npm run two-factor:reset -- <email> --confirm
```

Apaga o segredo e os códigos, **derruba as sessões** e grava `operator.two_factor_reset`. A conta volta a entrar só com a senha e pode ativar o 2FA de novo. **Confirme a identidade de quem pediu** antes: o script remove uma proteção da conta.

## O que o 2FA não cobre

- **Login com Google** não passa pelo 2FA do app: quem entra por OAuth depende da segurança da conta Google (que costuma ter a própria verificação em duas etapas).
- **Recuperação de senha por e-mail** continua existindo; ela troca a senha, mas o login seguinte ainda pede o segundo fator.
- Conta **sem senha** (só Google) não pode ativar 2FA.
- **Sem QR code:** a tela mostra a chave para digitar e um link `otpauth://` que abre o app no celular. QR exigiria uma biblioteca de QR (dependência nova); fica como melhoria.
- **Rotação da chave:** não há. Trocar `TWO_FACTOR_ENCRYPTION_KEY` invalida todos os segredos (equivale a todos perderem o app). Se precisar, rode `two-factor:reset` para cada conta ou limpe os campos `User.twoFactor*` e a coleção `TwoFactorRecoveryCode`.

## LGPD

Segredo cifrado e hashes são dado de autenticação: **não** entram na exportação. Na exclusão definitiva da conta o `retention-purge` apaga o segredo e os códigos de recuperação. Os eventos de auditoria seguem as regras de [`audit-log.md`](audit-log.md).
