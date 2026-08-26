# Planejamento: Login e cadastro com Google

> Gerado em 2026-08-26. Revise e confirme antes da criação das issues no GitHub.

## Objetivo

Permitir entrar e criar conta no Vitraux via **Google OAuth**, reutilizando a sessão JWT em cookie (ADR-001), com vínculo explícito a contas e-mail/senha existentes, onboarding legal (termos + privacidade + idade ≥18), e definição opcional de senha no perfil.

## Regras de negócio

1. Botão **“Continuar com Google”** nas telas de **login** e **cadastro**, só se o sistema estiver apto (credenciais/config OK — ver health/readiness).
2. Fluxo OAuth (Authorization Code + state anti-CSRF); callback cria sessão Vitraux (mesmo cookie/JWT/ActiveSession).
3. **Identidade:** casamento sempre pelo **e-mail** retornado pelo Google (string exata; sem normalizar aliases Gmail).
4. Conta com o mesmo e-mail (ativa) = mesma conta.
5. Conta **excluída** (fluxo atual: anonimização + Spaces) não é restaurável; e-mail livre → trata como **conta nova**.
6. **Conta nova via Google:** tela intermediária com aceite de termos + privacidade + data de nascimento (≥18). Nickname inicial = local-part do e-mail, sanitizado (símbolos inválidos → `_`, truncate 32); se ocupado, truncar mais 9 e sufixo `_` + 8 letras aleatórias; repetir até livre. Importar **nome** e **foto** (download → Spaces; falha de foto → segue sem foto). Sem nome Google → usar nickname. `passwordHash` ausente.
7. **Conta existente com senha e ainda sem vínculo Google:** mensagem pedindo confirmação + **senha Vitraux atual**; só então vincula. Não sobrescrever `photoUrl`/`name` se já preenchidos.
8. **Conta já vinculada ao Google:** login direto (sem pedir senha de vínculo).
9. **`email_verified` do Google:**
    - `true` → pode marcar `emailVerifiedAt` (se ainda não).
    - `false` → **não** marcar como verificado; se a conta Vitraux **já** estava verificada, informar que a conta Google não está verificada e que será necessário verificar de novo (limpar/`emailVerifiedAt` conforme fluxo de reenvio).
10. Login e-mail/senha em conta **sem** senha (só Google): mensagem pedindo login pelo Google (sem oráculo excessivo além do necessário).
11. **Senha no perfil:**
    - Tipo A (Google, sem senha): “senha atual” pode ficar em branco; hint no campo.
    - Tipo B (já tem senha): exige senha atual.
    - Sem Google e sem senha: rejeitar e pedir contato com suporte.
    - Ao definir a primeira senha, passa a ser tipo B.
12. Troca de e-mail com Google vinculado: avisar que **desvincula** o Google (vínculo era pelo e-mail antigo).
13. Login Google com e-mail **atual** ou **pending** durante troca: **cancela** o fluxo de troca; informar o usuário.
14. `returnUrl`: após sucesso, redirecionar para a URL original (apenas path relativo same-origin seguro).
15. Alerta de novo login (SEC-I15-C): **sempre** no login Google (mesma heurística de device / e-mail verificado conforme implementação atual — disparar sempre conforme aceite).
16. Corrida no callback: um cria a conta; o outro faz login na conta criada.
17. Idade mínima permanece **18**.
18. Sem UI de desvincular Google (desvínculo só via troca de e-mail, com aviso).
19. Contratos HTTP (`.http` + OpenAPI), i18n pt/en/es, testes de use cases, RoPA (Google como suboperador de auth).

## Critérios de aceite (épico)

- [ ] Login e cadastro via Google funcionam ponta a ponta (conta nova + existente).
- [ ] Vínculo a conta com senha exige confirmação + senha atual; não sobrescreve nome/foto existentes.
- [ ] Conta só-Google pode definir senha no perfil com senha atual em branco; depois exige senha atual.
- [ ] Botão Google oculto se readiness falhar; health expõe sonda Google.
- [ ] Onboarding legal (termos/privacidade/idade) no primeiro cadastro Google.
- [ ] `returnUrl` seguro respeitado.
- [ ] Troca de e-mail pendente cancelada no login Google (com mensagem); troca de e-mail desvincula Google (com aviso).
- [ ] Foto Google copiada para Spaces (best-effort).
- [ ] OpenAPI + `requests/*.http` + testes + i18n + RoPA atualizados.
- [ ] Uma PR única; cada sub-issue = um commit; PR revisada (label `Reviewed`).

## Fluxo principal

### Conta nova

1. Login ou Cadastro → Continuar com Google → OAuth Google.
2. Callback: e-mail sem User ativo → onboarding (termos + privacidade + birthDate).
3. Cria User (nick gerado, name/foto opcionais, google vinculado, senha ausente, verified se Google verified).
4. Sessão + redirect (`returnUrl` ou `/`).

### Conta existente (senha, sem Google)

1. OAuth → e-mail encontrado → UI de vínculo (“já tem conta e senha… Deseja vincular?”) + senha atual.
2. Valida senha → marca vínculo Google; não sobrescreve name/foto se presentes.
3. Sessão + redirect.

### Conta já com Google

1. OAuth → e-mail encontrado + já vinculado → sessão + redirect.

## Edge cases (fechados)

| #     | Caso                             | Tratamento                                                                               |
| ----- | -------------------------------- | ---------------------------------------------------------------------------------------- |
| 1     | Mesmo e-mail + senha, sem Google | Confirmar + senha; vincular; preservar name/foto                                         |
| 2     | Google `email_verified: false`   | Não marcar verificado; se já era verificado no Vitraux, avisar e exigir nova verificação |
| 3     | Cadastro Google                  | Tela intermediária: termos + privacidade + idade ≥18                                     |
| 4     | Local-part inválido/longo        | Sanitizar `_`, truncate 32; se ocupado, cortar 9 + `_` + 8 letras; retry                 |
| 5     | Conta deletada (anonimizada)     | Conta nova (sem restore)                                                                 |
| 6     | Troca de e-mail pendente         | Login Google com atual ou pending cancela troca + mensagem                               |
| 7     | Download foto falha              | Segue sem foto                                                                           |
| 8     | Sem nome Google                  | Usa nickname                                                                             |
| 9     | Login senha em conta sem senha   | Pedir login Google                                                                       |
| 10–11 | Senha perfil A→B                 | Branco só em A; depois B                                                                 |
| 12    | returnUrl                        | Paths relativos same-origin                                                              |
| 13    | Sem config Google                | Sem botão; health/readiness                                                              |
| 14    | Verified                         | Só se Google verified                                                                    |
| 15    | Race                             | Um cria, outro login                                                                     |
| 16    | Troca e-mail                     | Desvincula Google + aviso                                                                |
| 17    | Novo login alert                 | Sempre no Google login                                                                   |
| 18    | Aliases `+`                      | Unique exato; OAuth usa e-mail primário Google                                           |

## Repositórios afetados

### vitraux (`CaioGiasson/vitraux`)

- **O que muda:** OAuth Google (API + UI), schema User, perfil/senha, health, contratos, docs LGPD/RoPA, testes.
- **Módulos/endpoints afetados (previsto):**
    - Prisma `User` (`passwordHash` opcional; flag de vínculo Google; exposição segura em PublicUser: `hasPassword`, `googleLinked`)
    - `GET/POST` auth Google (start + callback + complete onboarding + link-with-password)
    - Extensão `/api/health` (e/ou readiness dedicado)
    - `changePassword`, troca de e-mail, login clássico (mensagem só-Google)
    - `LoginForm` / `RegisterForm` / onboarding / vínculo / `ProfilePasswordSection` / aviso e-mail
    - `requests/auth/*.http`, `docs/openapi.yaml`, `docs/operators/subprocessors-ropa.md`, ADR curto se necessário
- **Dependências:** projeto Google Cloud OAuth + env abaixo; documentar em `.env.example` (valores placeholder, nunca secrets reais).
- **Cuidados técnicos (lessons):** cookie sessão ADR-001; i18n 3 idiomas; Prisma só em repository; TX master port; não logar PII; contratos HTTP obrigatórios; CSP pode precisar permitir origins Google no fluxo (revisar headers).

## Variáveis de ambiente

Prefixo `GOOGLE_OAUTH_*` (alinhado a `SPACES_*` / `BREVO_*`). **Não** entram em `REQUIRED_ENV_VARS` — a app sobe sem Google; o botão some se a config estiver incompleta.

| Variável                     | Obrigatória para Google | Descrição                                                                                                                                                                                                                        |
| ---------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_OAUTH_CLIENT_ID`     | Sim                     | Client ID do OAuth 2.0 no Google Cloud Console                                                                                                                                                                                   |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Sim                     | Client Secret do OAuth 2.0                                                                                                                                                                                                       |
| `GOOGLE_OAUTH_REDIRECT_URI`  | Sim                     | URI de callback **exata** cadastrada no Console (ex.: `http://localhost:3000/api/v1/auth/google/callback` em dev; HTTPS em prod). Não derivar só de `APP_BASE_URL` no runtime sem espelhar no Console — mismatch quebra o fluxo. |
| `GOOGLE_OAUTH_TIMEOUT_MS`    | Não                     | Timeout HTTP para token/userinfo (default `10000`)                                                                                                                                                                               |

**Readiness (botão + sonda health):** apto somente se `CLIENT_ID`, `CLIENT_SECRET` e `REDIRECT_URI` estiverem não vazios (após trim). Timeout inválido (≤0 / NaN) → tratar como default, sem derrubar a app.

**Exemplo (`.env.example`):**

```env
# Google OAuth (opcional — sem estas vars o botão "Continuar com Google" não aparece)
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/v1/auth/google/callback
# GOOGLE_OAUTH_TIMEOUT_MS=10000
```

**Segurança:** nunca logar `CLIENT_SECRET`; nunca commitar valores reais.

## Dependências entre repositórios

Nenhuma — monólito Vitraux.

## Ordem de implementação (sub-issues → 1 commit cada)

1. **Schema + PublicUser** — `passwordHash` opcional; `googleLinkedAt` (ou equivalente); DTO `hasPassword` / `googleLinked`; migração/push documentado.
2. **Config Google + health/readiness** — `GOOGLE_OAUTH_*` em `env.ts`, validação, sonda no health; API de readiness para o front esconder botão.
3. **Nickname Google helper** — sanitização + sufixo aleatório + testes unitários.
4. **Use cases OAuth core** — start/callback/session; conta nova vs existente; race; cancelamento de troca de e-mail; verified; alerta novo login; import nome/foto Spaces best-effort.
5. **Link com senha + changePassword + email change** — vínculo autenticado por senha; regras A/B/suporte; desvínculo na troca de e-mail.
6. **UI + i18n** — botões, onboarding legal, modal/página de vínculo, returnUrl, hints de senha/e-mail, pt/en/es.
7. **Contratos, docs, RoPA, OpenAPI, `.http`, testes de integração/controller** — fechar aceite de documentação.

**PR:** uma única PR com os 7 commits (na ordem), `Closes` no épico (e refs nas sub-issues), review do agente + label `Reviewed`, app rodando local para smoke.

## Informações pendentes

- Valores reais de `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_REDIRECT_URI` no `.env` local — o mantenedor preenche na hora do teste (não commitados).
- Label do board: preferência `feature` (já existe).
