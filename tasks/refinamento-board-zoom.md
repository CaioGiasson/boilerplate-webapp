# Planejamento: Board zoom

> Gerado em 2026-08-13. Revise e confirme antes da criação das issues.

## Objetivo

Permitir que o usuário ajuste a densidade do mosaico (número de colunas) via controle no canto superior direito do board, com persistência por tela para usuários autenticados.

## Contexto técnico atual

- Board = `MosaicGrid` na home (`src/app/[locale]/page.tsx`) e em `/images` (`ImagesPageClient`).
- Colunas hoje: só responsivas por largura (`useMosaicColumns` + `getMosaicColumnCount`); referência Full HD = 6.
- Persistência de preferências: `SettingsManager` + `PATCH /api/v1/users/:id/settings` + `setUserSettingRequest`. Sem UI de zoom em `/config`.
- Não existe Slider no DS; há `IconButton`, `DropdownMenu` (Radix) e ícones Lucide. Breakpoint mobile já usado: `max-width: 767px`.

## Regras de negócio

1. Controle só nas telas com board nesta issue: **home** e **`/images`**. Outras telas: fora de escopo (sob demanda).
2. Botão no **canto superior direito do board**, ícone Lucide `ZoomIn`; clique abre dropdown com **slider**.
3. Valor do slider = **número de colunas** (1 = tiles maiores; máximo = mosaico mais denso).
4. Faixas: **desktop 1–12**; **mobile 1–4** (`max-width: 767px`).
5. Defaults sem setting: **desktop 4**, **mobile 2**.
6. Keys em `User.settings` (não aparecem em `/config`):
    - `homeZoomLevel` — home
    - `imagesZoomLevel` — `/images`
7. **Autenticado:** ler setting da tela; ao mudar o slider, persistir via `setUserSettingRequest` (best-effort, como tema/idioma).
8. **Visitante:** zoom só na sessão; **não** cookie. Persistência só depois de autenticar (mudanças posteriores vão para settings).
9. No resize / troca mobile↔desktop: **clamp** o valor à faixa atual para render; ao salvar, gravar o valor efetivo usado.
10. Com zoom manual ativo, `columnCount` do mosaico vem do slider (não mais só do `ResizeObserver` de largura). O auto-fit por largura deixa de mandar nestas telas enquanto o controle existir (substituído pelo nível de zoom).
11. Empty state de `/images` sem grid: sem botão de zoom (não há board).

## Critérios de aceite

- [ ] Botão zoom-in no topo-direita do board na home e em `/images`.
- [ ] Dropdown com slider; desktop 1–12 (default 4), mobile 1–4 (default 2).
- [ ] Alterar o slider muda imediatamente o `columnCount` do mosaico.
- [ ] Autenticado: persiste `homeZoomLevel` / `imagesZoomLevel` em `User.settings` sem UI em `/config`.
- [ ] Visitante: não persiste; após login, novos ajustes persistem.
- [ ] Componente `Slider` no design-system (base Radix/shadcn), usado pelo controle.
- [ ] Textos i18n (aria-label / tooltip) em pt/en/es.
- [ ] Testes do clamp/defaults e, se couber, do mapeamento das settings keys.

## Fluxo principal

1. Usuário abre home ou `/images`.
2. Sistema lê zoom: setting da nuvem (se autenticado) ou default (4 desktop / 2 mobile).
3. Mosaico renderiza com N colunas.
4. Usuário clica no botão ZoomIn no canto superior direito do board.
5. Dropdown abre com slider; ao mover, `columnCount` atualiza imediatamente.
6. Se autenticado → `PATCH` settings (`homeZoomLevel` ou `imagesZoomLevel`).
7. Se visitante → só estado local da sessão.

## Edge cases

- Setting fora da faixa (ex. `12` no mobile): clamp para max da faixa.
- Valor inválido / não numérico: fallback default (4 / 2).
- Falha no PATCH: UI mantém o zoom local (best-effort).
- Troca de breakpoint: reclamp sem exigir reabrir o dropdown.
- Home guest → login: sessão guest não é obrigatoriamente migrada; pós-auth usa setting da nuvem ou default, e daí persiste.

## Repositórios afetados

### vitraux

- **O que muda:** controle de zoom no mosaico; Slider no DS; keys em `SETTINGS_KEYS`; wiring home + `/images`.
- **Módulos/endpoints afetados:** `MosaicGrid`, novo `BoardZoomControl` (ou equivalente), `useMosaicColumns` / constantes em `mosaic.ts`, `Settings.manager.ts`, `src/design-system/Slider.tsx` + primitive `src/components/ui/slider.tsx`, catálogos i18n; `PATCH /api/v1/users/:id/settings` (já existente).
- **Dependências:** nenhuma entre repositórios; adicionar `@radix-ui/react-slider` se ainda não estiver no `package.json`.
- **Cuidados técnicos:** não mostrar zoom em `/config`; não exigir zoom em telas futuras; debounce leve no PATCH opcional; a11y (aria-label, teclado no slider).

## Dependências entre repositórios

Nenhuma — só `vitraux`.

## Escopo de implementação (prompt)

1. Adicionar Slider (shadcn/Radix) no design-system.
2. Introduzir `SETTINGS_KEYS.HOME_ZOOM_LEVEL` / `IMAGES_ZOOM_LEVEL`.
3. Hook/estado de zoom por tela (`settingKey`) + clamp por breakpoint.
4. Overlay do botão no canto superior direito do board em `MosaicGrid` (prop `zoomSettingKey?: 'homeZoomLevel' | 'imagesZoomLevel'`).
5. Passar a key na home e em `ImagesPageClient`.
6. i18n + testes de utilitário de clamp/default.
