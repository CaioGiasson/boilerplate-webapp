# ADR-009 — `<img>` nativo no mosaico vs `next/image`

- **Status:** Aceito
- **Data:** 2026-08-25
- **Relacionado:** PERFORMANCE FE-03 / FE-03-doc

## Contexto

URLs do mosaico são **presigned** (Spaces), com host/query dinâmicos e TTL curto. `next/image` exige `remotePatterns` estáveis e otimização no servidor Next — incompatível com signed URLs sem proxy próprio ou CDN autenticado.

## Decisão

Manter `<img>` nativo em `MosaicImage.tsx` (com eslint-disable pontual) enquanto o content URL for presign direto. Não migrar para `next/image` sem:

1. endpoint de conteúdo sob domínio próprio, ou
2. CDN/edge com authz que preserve PRIVATE/SECRET.

## Consequências

- Sem srcset/resize automático do Next no mosaico (trade-off documentado).
- Reavaliar se SCALE-03 (CDN PUBLIC) ou proxy de conteúdo for implementado.
