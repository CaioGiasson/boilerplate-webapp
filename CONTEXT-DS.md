# Design system — Boilerplate Webapp

Componentes, props e detalhes visuais para agentes de IA. **Leia antes de criar ou alterar tela, componente ou token visual.** Produto: [`CONTEXT.md`](CONTEXT.md). Regras do repositório: [`.cursor/rules/design-system.mdc`](.cursor/rules/design-system.mdc).

Snapshot: **2026-10-26**.

## Onde está

- Componentes: `src/design-system/*.tsx`, exportados por `src/design-system/index.ts` (importe de `@/design-system`).
- Primitivos Radix (shadcn): `src/components/ui/` (`avatar`, `button`, `dropdown-menu`, `label`, `select`, `sheet`, `slider`, `switch`, `tooltip`). Não importe `ui/` em tela quando existir wrapper no design system.
- **Catálogo vivo:** rota `/ds-components` (`src/components/ds-catalog/catalog.ts` = fonte única; exemplos em `DsComponentExample.tsx`). Componente novo entra nos **três**: arquivo, `index.ts` e catálogo (com exemplo).
- Tokens: variáveis CSS em `src/app/globals.css` (`--background`, `--foreground`, `--surface`, `--border`, `--muted`, `--destructive`…), mapeadas para o Tailwind 4. Tema escuro por classe `dark` no `<html>`, aplicada por `public/theme.js` antes da hidratação (cookie `app-theme`).

## Regras para componentes

1. **Sem texto fixo:** rótulos vêm por props ou `useTranslations`; catálogos em `src/constants/texts/{pt,en,es,types}.ts`.
2. **`{...props}` antes dos handlers internos** (`onKeyDown`, `onChange`…) ou componha os handlers: espalhar depois faz o handler do consumidor apagar o do componente.
3. Importe os irmãos pelo arquivo (`@/design-system/Button`), não por `@/design-system`, dentro do próprio design system e em componentes que serão testados em jsdom (o índice puxa `next-intl/navigation`, que o Jest não transforma).
4. Sem referência de domínio (nomes de produto, entidades).
5. Teste em `tests/design-system/` (jsdom + `renderInJsdom`).

## Componentes (por categoria do catálogo)

| Categoria  | Componentes                                                                                                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| actions    | `Button`, `ConfirmActionButton` (confirmação em dois cliques), `ComplexButton` (ícone + título + subtítulo), `IconButton`                                                                                               |
| inputs     | `TextInput`, `TextArea`, `InputPassword`, `InputTitle`, `InputTextArea`, `CodeInput`, `SearchBar`, `TagsInput`, `FileInput`, `FileDropzone`, `AppSelect`, `AppMultiSelect`, `AppSlider`, `Toggle`, `ColorPalettePicker` |
| navigation | `NavIconButton`, `NavIconLink` (com tooltip), `AppDropdownMenu`                                                                                                                                                         |
| feedback   | `Toast`/`ToastProvider`/`useToast`, `HelperBar` (faixa contextual com dispensar), `StorageProgressBar`, `ImageCropModal`, `Tooltip`, `PasswordChecklist`                                                                |
| layout     | `Title`, `SettingsSection`, `AccordionGroup`/`AccordionSection`, `Avatar`                                                                                                                                               |
| icons      | `Icon` (Lucide com tamanho padrão), `MultiIcon` (composição de ícones), `GoogleIcon`                                                                                                                                    |

### Detalhes que costumam importar

- **`StorageProgressBar`** (`percentUsed`): verde < 60 %, âmbar ≥ 60 %, vermelha > 90 % (`storageProgressTone` em `constants/storageQuota.ts`). Calcule o percentual com `storagePercentUsed(bytes, quota)`.
- **`ImageCropModal`**: `open`, `imageSrc`, `aspect`, `title`, `confirmLabel`, `cancelLabel`, `zoomLabel`, `onCancel`, `onConfirm(areaEmPixels)`. Fecha com Escape. O recorte em si é `lib/image/cropToWebp.ts` (`cropToWebpBlob`, lado de saída ≤ 512 px).
- **`HelperBar`** (`children`, `dismissLabel`, `onDismiss`, `testId`): altura fixa `HELPER_BAR_BLOCK_REM`.
- **`AppMultiSelect`** (`options`, `values`, `onValuesChange`, `label`, `placeholder`): resume as escolhidas separadas por vírgula.
- **`Toast`**: `useToast().toast({ variant: 'success' | 'error', title, description? })`; fecha ao clicar; some ao trocar de rota. Não fecha sozinho.
- **`NavIconLink`/`NavIconButton`**: ícone sem fundo, tooltip sem atraso à direita (`side`).

## Layout

`AppShell` (`src/components/layout/`): `Sidebar` à esquerda (64 px; menu em `Sheet` no mobile), `PageTransition`, faixa de impersonamento no topo (altura publicada em `--app-banner-h`; o shell usa `h-[calc(100vh-var(--app-banner-h,0px))]`), `PwaInstallBanner` e `CookieNotice` no rodapé do `main`. Itens de navegação em `src/constants/navigation.ts`; sino de notificações e atalho de admin são montados na `Sidebar` conforme sessão/papel.

## Hooks de UI

`useMediaQuery(query)` (`false` no servidor), `useUnreadNotificationCount(enabled)` (polling de 60 s e ao voltar para a aba).

## Como manter este arquivo

Componente, prop ou regra visual nova → atualize a tabela/seção e a data do snapshot, o catálogo `/ds-components` e o teste.
