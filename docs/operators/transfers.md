# Transferências internacionais (PRIV-C05)

Documento operacional. O titular lê a política de privacidade (`content/legal/privacy.*.md`); este arquivo orienta o operador.

## Mapa de fluxos

| Etapa                  | Onde                         | Região / país                                                 | Dados típicos                                            |
| ---------------------- | ---------------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| 1. Browser             | Dispositivo do titular       | Variável                                                      | Cookie de sessão (JWT), tema/locale; uploads em trânsito |
| 2. App host            | Servidor Next.js / runtime   | **TBD** — documentar quando o deploy de produção for definido | Conta, metadados, lógica de auth; processa uploads       |
| 3. MongoDB             | Banco de aplicação           | **TBD** (compose local = localhost; produção a definir)       | Perfil, hashes, metadados de imagens, settings           |
| 4. DigitalOcean Spaces | Object storage S3-compatível | **nyc3 = Estados Unidos** (`SPACES_ENDPOINT`)                 | Objetos de imagem, avatares, Files                       |

Fluxo resumido: **browser → app host → Mongo (metadados) + Spaces (bytes)**.

## Spaces nyc3 (EUA)

- Endpoint default do projeto: `nyc3.digitaloceanspaces.com` (datacenter **New York 3**, EUA).
- Implica **transferência internacional** de dados pessoais/conteúdo do titular para os EUA (LGPD arts. 33–35; GDPR Cap. V).
- Alternativas operacionais futuras (não migradas nesta issue): `gru1` (Brasil), `fra1` (Frankfurt). Qualquer mudança de país exige atualizar **política + este doc antes** de apontar o endpoint.

## Base contratual (DPA / SCC) — **fechada**

Registro do operador (2026-08-21): o **Data Processing Agreement** da DigitalOcean **faz parte dos Terms of Service** (incorporado por referência) e foi **aceito na criação da conta** DO usada pelo App.

O TOS oficial declara que documentos adicionais, incluindo o DPA, “are incorporated by reference as if they were written here and form part of the overall TOS”:

- [Terms of Service Agreement (2023)](https://www.digitalocean.com/legal/terms-of-service-agreement-2023)
- [Data Processing Agreement](https://www.digitalocean.com/legal/data-processing-agreement) (versão corrente)
- [DPA — January 2026](https://www.digitalocean.com/legal/data-processing-agreement-january-2026) (arquivo versionado)
- [GDPR FAQ](https://www.digitalocean.com/legal/gdpr-faq)

**SCC / titulares EEE/UK:** o DPA da DO incorpora cláusulas de transferência para cenários GDPR. O público-alvo atual do App não é a UE; se isso mudar, reavaliar SCCs/addendum UK com assessoria.

Não afirmar adequação UE–EUA inexistente ou não verificada; a salvaguarda documentada aqui é **ToS + DPA incorporado** (LGPD art. 33 / GDPR art. 46 quando aplicável).

## O que tipicamente não vai para os EUA via Spaces

- JWT de sessão no cookie do browser (fica no cliente; o servidor valida localmente).
- Preferências de tema/idioma em cookies funcionais.
- Código-fonte e secrets de deploy (não são dados do titular no Spaces).

Metadados de conta e de imagens **podem** estar no Mongo na região do DB (TBD) — distinto do destino Spaces.

## Checklist do operador

- [x] DPA DigitalOcean aceito via ToS na criação da conta; documentado em issue [#82](https://github.com/CaioGiasson/boilerplate-webapp/issues/82) (2026-08-21).
- [x] Política de privacidade (pt/en/es) declara nyc3/EUA.
- [x] `SPACES_ENDPOINT` e este arquivo alinhados à região real (`nyc3`).
- [ ] Região do app host e do Mongo preenchidas neste doc quando deixarem de ser TBD.
- [ ] (Opcional) Avaliar migração para `gru1` ou `fra1` + Mongo alinhado — follow-up, não bloqueante.

## Fora de escopo deste doc

- Migração de bucket (follow-up).
- ACL / signed URL (SEC-C01) — eixo de confidencialidade distinto.
- RoPA completo de todos os suboperadores (PRIV-I07).
