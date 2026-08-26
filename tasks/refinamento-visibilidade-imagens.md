# Planejamento: Visibilidade de imagens

> Gerado em 2026-08-18. Confirmado pelo desenvolvedor antes da criação das issues.

## Objetivo

Controlar quem enxerga cada imagem (PUBLIC, PRIVATE, SECRET, PROTECTED), com setting `showSecretImages` para o dono, edição na modal do dono e validações sempre no backend.

## Regras de negócio

1. Enum Prisma `Visibility`: `PUBLIC`, `PRIVATE`, `SECRET`, `PROTECTED`. Campo `Image.visibility`, default `PUBLIC`.
2. Hierarquia (menor → maior proteção): PUBLIC → PRIVATE → SECRET → PROTECTED. Downgrade só com ação explícita no frontend (Salvar / togglers).
3. `visibility` só muda na criação ou via `setVisibility(id, visibility)`. Update de metadados (título/descrição) não altera visibilidade.
4. Imagens existentes: backfill para `PUBLIC` no deploy (script).
5. Home (`scope=all`): somente `PUBLIC`.
6. `/images` (`scope=mine`): imagens do dono com `PUBLIC` e `PRIVATE`; também `SECRET` se `showSecretImages === true`. Nunca `PROTECTED`.
7. Visitante: só `PUBLIC`. Logado sem secret: `PUBLIC` ou PRIVATE próprias. Logado com secret: isso + SECRET próprias. Nunca imagens PRIVATE/SECRET/PROTECTED de outro usuário.
8. `showSecretImages` (bool, default false se ausente): só usuários logados veem o toggle em `/config`.
9. Menu `/images` só para logados. URL `/images` sem sessão → redirect home (não login).
10. URL `/image/:id` sem permissão → redirect home. `generateMetadata` não vaza título de imagem inacessível.
11. Modal: se o viewer é o dono, a modal é o form (`InputTitle`, `InputTextArea`, togglers, Salvar). Tags só leitura. Não-dono: visualização atual.
12. Salvar desabilitado sem dirty. Fechar com dirty: 1º clique troca o rótulo para “Fechar sem salvar”; 2º clique descarta e fecha. Sem dirty: fecha na hora. Após salvar com sucesso: modal permanece aberta, dirty zera, Fechar volta ao rótulo original.
13. Togglers fazem parte do dirty. No Salvar: update título/descrição + `setVisibility` se a visibilidade mudou.
14. `isPrivate` / `isSecret` (frontend) → enum (backend):
    - PUBLIC + isPrivate true → PRIVATE
    - PRIVATE + isPrivate true → noop
    - PRIVATE + isPrivate false → PUBLIC
    - SECRET/PROTECTED: ignorar isPrivate (exceto SECRET + isSecret false, que consulta isPrivate)
    - PUBLIC/PRIVATE + isSecret true → SECRET
    - SECRET + isSecret true → noop
    - SECRET + isSecret false → PRIVATE se isPrivate, senão PUBLIC
    - PROTECTED: ignorar isSecret
15. `isSecret` só aparece se `showSecretImages`. Cadastro (upload, massa, URL) e Pinterest (sem submit). Massa: um isSecret aplica a todas.
16. SECRET no backend exige `showSecretImages`. PROTECTED não é alvo nem listado nesta issue.
17. UI ao carregar SECRET: `isSecret=true` e `isPrivate=true` (downgrade para PUBLIC exige duas ações explícitas).

## Critérios de aceite

- [ ] Enum `Visibility` e campo no model Image; create persiste; update não mexe; `setVisibility` existe.
- [ ] Script de backfill + instrução de deploy; imagens antigas viram PUBLIC.
- [ ] Home só PUBLIC; `/images` PUBLIC+PRIVATE do dono (+ SECRET se setting).
- [ ] GET por id aplica as mesmas regras; 404 se negado (não vaza existência).
- [ ] `/images` no menu só logado; URL sem sessão → home.
- [ ] Deep link sem permissão → home; metadata sem título vazado.
- [ ] Setting `showSecretImages` em `/config` só para logado.
- [ ] Modal do dono: form seamless, Salvar/Fechar conforme regras, tags só leitura.
- [ ] `InputTitle` e `InputTextArea` no design-system.
- [ ] Togglers no cadastro; Pinterest sem submit.
- [ ] i18n pt/en/es.
- [ ] Testes de use cases de acesso e setVisibility.

## Fluxo principal

1. Usuário cria imagem (default PUBLIC) ou marca isPrivate/isSecret no cadastro.
2. Home mostra só públicas. `/images` mostra as do dono permitidas pela setting.
3. Dono abre a modal, edita título/descrição/visibilidade, Salvar persiste; Fechar com dirty pede confirmação.
4. Visitante ou não-dono só vê PUBLIC (e nunca o form).

## Edge cases

- Acesso negado por URL: redirect home; API 404.
- SECRET com setting off: invisível inclusive para o dono até religar a setting.
- PROTECTED: ignorar togglers; não listar; GET 404.
- `setVisibility(SECRET)` com setting false: rejeitar.
- `setVisibility(PROTECTED)`: rejeitar.
- Fechar 1x com dirty depois salvar: rótulo Fechar volta ao normal.
- Pinterest: togglers visíveis, sem persistência.

## Repositórios afetados

### vitraux

- **O que muda:** persistência, APIs, listagens, settings, modal, cadastro, DS, script de deploy.
- **Módulos:** `prisma/models/image.prisma`, `Image.repository`, use cases Image, rotas `/api/v1/images`, `Settings.manager`, `GeneralSettingsForm`, `ImageDetail`, `ImagesPageClient`, `Sidebar`, forms de create, `InputTitle`/`InputTextArea`.
- **Dependências:** nenhuma.
- **Cuidados:** não vazar PRIVATE/SECRET de outro usuário; update sem visibility; metadata do deep link.

## Dependências entre repositórios

Nenhuma. Ordem interna: Prisma/repository → use cases/rotas → DS (paralelo ao backend) → frontend.

## Informações pendentes

Nenhuma. Tags na modal permanecem só leitura.
