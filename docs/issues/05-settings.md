## Contexto

Tela de configurações acessível pelo ícone da sidebar. Usa o **mesmo AppShell** (sidebar compartilhada). Preferências via **cookies** (`CookiesManager`).

## Objetivo

Criar a rota localizada de configurações (ex.: `/pt/config`) com seção **Geral** contendo tema e idioma.

## Escopo

- Página `/[locale]/config` (next-intl).
- Layout: mesmo `AppShell` / sidebar compartilhada.
- Seção **Geral** (`SettingsSection` do DS) com:
    1. **Ativar tema escuro** — `Switch`/toggler.
        - Liga/desliga classe dark.
        - Persiste em cookie via `CookiesManager`.
        - Sem cookie prévio: respeitar `prefers-color-scheme` (já na foundation); ao usuário alterar, grava cookie.
    2. **Idioma** — `Select` com Português / Inglês / Espanhol.
        - Persiste locale em cookie.
        - Atualiza a UI navegando para o prefixo correspondente (`/pt/config`, `/en/config`, `/es/config`).
- Todos os textos via catálogos i18n (`src/constants/texts`).
- Componentes do design-system (não HTML cru).

## Fora de escopo

- Outras seções de configuração.
- Conta/usuário/auth.
- Sync com backend.

## Critérios de aceite

- [ ] `/pt/config` (e en/es) renderiza seção Geral com Switch e Select.
- [ ] Tema persiste em cookie e sobrevive a reload.
- [ ] Idioma persiste em cookie e troca o prefixo + textos da UI.
- [ ] Sem sidebar própria — usa o shell compartilhado.
- [ ] Responsivo mobile / tablet / desktop.

## Dependências

Bloqueada por: **layout** (shell), **design-system** (Switch/Select/Section), **i18n**, **foundation** (CookiesManager/tema).

## Notas para o agente

Garantir que SSR/hidratação não pisque tema incorreto quando houver cookie.
