# ADR-004 — i18n com next-intl e catálogos TypeScript

- **Status:** Aceito
- **Data:** 2026-08-23

## Contexto

Produto multilíngue (pt, en, es). Strings espalhadas quebram consistência e tipagem.

## Decisão

- `next-intl` no App Router com segmento `[locale]`.
- Catálogos tipados em `src/constants/texts/{pt,en,es,types}.ts`.
- Locale default `pt`; setting `language` sincroniza preferência do usuário.
- Mensagens de e-mail separadas em `src/utils/emailMessages.ts` por purpose.

## Consequências

### Positivas

- TypeScript garante paridade de chaves entre locales.
- SEO e URLs localizadas.

### Negativas

- Toda string de UI exige 3 arquivos + types (checklist em AGENTS.md).
- Conteúdo legal pode duplicar entre locales.

## Referências

- `src/constants/texts/`
- `src/app/[locale]/`
- ADR-005 (e-mails)
