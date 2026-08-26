# RoPA / suboperadores (PRIV-I07)

Registro interno das operações de tratamento (LGPD art. 37; GDPR art. 30) e cadeia de operadores (LGPD art. 39; GDPR art. 28). DPA Spaces: ver PRIV-C05 / `docs/operators/transfers.md`. Revisão jurídica permanece recomendada.

**Encarregado / contato de privacidade:** **Caio Felipe Giasson** — `cainitech@gmail.com` (PRIV-I08).

## Controlador

| Campo                   | Valor                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Controlador             | Vitraux (operado por Caio Felipe Giasson)                                                                        |
| Contato                 | Caio Felipe Giasson — `cainitech@gmail.com`                                                                      |
| Finalidades principais  | Conta; armazenamento e exibição de imagens; autenticação/segurança; denúncias e obrigações legais                |
| Bases (rascunho)        | Contrato; consentimento no cadastro; segurança / obrigação legal quando couber — ver política pública            |
| Categorias de titulares | Usuários cadastrados; eventualmente denunciantes                                                                 |
| Categorias de dados     | Conta (nome, nick, e-mail, foto); hash de senha; sessão; imagens e metadados; settings; logs técnicos; denúncias |

## Suboperadores / infraestrutura

| Ator                                               | Papel                                                              | Localização                                                                        | Dados / atividade                                                                                                                                                                                | Contrato / DPA                                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **DigitalOcean Spaces**                            | Operador (object storage)                                          | Região **nyc3** (EUA)                                                              | Objetos de imagem/avatar; keys `{ownerId}/…`                                                                                                                                                     | [x] DPA via ToS DO ([ToS 2023](https://www.digitalocean.com/legal/terms-of-service-agreement-2023)) · SCC no DPA se titulares UE |
| **MongoDB**                                        | Infra própria **ou** operador cloud                                | **Local/TBD** (Compose com auth em dev; produção a definir — managed ou self-host) | Contas, imagens (metadados), SessionEvents, settings                                                                                                                                             | [ ] Self-host documentado **ou** DPA do provedor cloud                                                                           |
| **Hosting da app**                                 | Operador                                                           | **TBD** (Vercel / VPS / outro — preencher ao fechar deploy)                        | Runtime Next.js; logs de request; cookies de sessão no edge/host                                                                                                                                 | [ ] DPA / termos do host                                                                                                         |
| **E-mail transacional**                            | Operador (futuro)                                                  | TBD                                                                                | Verificação / avisos de conta (PRIV-I05 / SEC-I04)                                                                                                                                               | [ ] DPA quando houver provedor                                                                                                   |
| **next/font (Geist)**                              | **Não** é suboperador de runtime                                   | Build-time                                                                         | Fonte carregada via `next/font/google` e **self-hospedada no bundle** Next (arquivos servidos pela app). Fetch Google no build de CI pode ocorrer; **runtime do usuário não chama Google Fonts** | N/A — documentar se o pipeline de build aceitar fetch externo                                                                    |
| **Google Identity (OAuth 2.0)**                    | Operador (IdP)                                                     | Global (Google)                                                                    | Login/cadastro: e-mail, nome, foto de perfil e `email_verified` no Authorization Code; Vitraux não armazena refresh token Google                                                                 | [ ] DPA / termos Google Cloud + aviso na política quando OAuth estiver em produção                                               |
| **Script Pinterest** (`export-from-pinterest.mjs`) | **Ferramenta do operador** (CLI local), **não** runtime do produto | Máquina do operador                                                                | Cookies/sessão Pinterest só no ambiente do operador; **a app web não envia dados de titulares ao Pinterest**                                                                                     | N/A — não listar Pinterest como suboperador do SaaS                                                                              |

## Atividades de tratamento (resumo)

| Atividade                      | Sistemas                              | Observação                                                    |
| ------------------------------ | ------------------------------------- | ------------------------------------------------------------- |
| Cadastro / login / sessão      | App + Mongo (+ Google OAuth opcional) | Cookie HttpOnly; JWT com `jti`; IdP Google quando configurado |
| Upload / leitura de imagens    | App + Spaces (+ Mongo metadados)      | Bucket privado; leitura via URL assinada (SEC-C01)            |
| Exportação de dados do titular | App                                   | JSON da conta (PRIV-I01)                                      |
| Exclusão de conta              | App + Spaces + Mongo                  | Imediata no online (PRIV-C04)                                 |
| Health / scripts admin         | App / CLI                             | Scripts admin recusados em production (SEC-I16)               |
| Import Pinterest               | Só CLI                                | Fora da cadeia do produto web                                 |

## Transferência internacional

Spaces em **nyc3** implica transferência para os EUA. Transparência na política pública; medidas contratuais = PRIV-C05 (mitigado: ToS/DPA na conta DO).

## Retenção

Ver `docs/operators/retention.md` (PRIV-I03).

## DPIA / incidentes

- DPIA de imagens: `docs/operators/dpia-images.md` (PRIV-C03 residual).
- Playbook de incidente / ANPD: `docs/operators/incident-response.md` (PRIV-I08).

## Revisão

Atualizar esta tabela quando o host de produção, o Mongo gerenciado ou o provedor de e-mail forem escolhidos. Contratos assinados ficam fora do git (marcar checkboxes acima).
