# DPIA resumida — imagens de usuário (PRIV-C03 residual)

Avaliação de impacto **curta** (LGPD arts. 46 e 48; GDPR arts. 32 e 35). Complementa a mitigação técnica já entregue em SEC-C01 / SEC-C02 / exclusão (PRIV-C04). **Não é parecer jurídico.**

## Contexto do tratamento

O Vitraux armazena imagens enviadas por usuários, inclusive com visibilidade PRIVATE/SECRET. Metadados ficam no Mongo; objetos binários no **DigitalOcean Spaces** (`nyc3`). Leitura autenticada/autorizada usa URL assinada após `canViewImage`.

## Ameaça principal

**Vazamento em massa de fotos** — enumeração ou listagem do bucket, ACL pública legada, keys previsíveis, URLs permanentes compartilháveis, ou comprometimento das credenciais Spaces — expondo conteúdo íntimo ou privado de muitos titulares de uma vez.

## Medidas técnicas atuais (pós-SEC-C01/C02)

| Medida                                                                 | Evidência                                          |
| ---------------------------------------------------------------------- | -------------------------------------------------- |
| Bucket **privado** (sem `public-read` no upload)                       | `Storage.service.ts`; script `spaces:make-private` |
| Leitura via **URL assinada (presigned GET)** após autorização          | `StorageUrl.service.ts`                            |
| Keys com **entropia alta** + prefixo **`ownerId`**                     | `File.manager.ts`; migração `spaces:migrate-keys`  |
| Exclusão real de objetos (`DeleteObject`) em fluxos de produto / conta | `File.manager.ts`; PRIV-C04                        |
| Autorização por dono / visibilidade na API                             | use cases de imagem                                |

## Risco residual

| Residual                                    | Comentário                                                        |
| ------------------------------------------- | ----------------------------------------------------------------- |
| Credenciais Spaces ou host comprometidas    | Bypass dos controles de ACL da app                                |
| Orphans / objetos órfãos sem purge contínuo | Job `retention-purge` (`docs/operators/cron.md`); agendar no host |
| Transferência EUA (`nyc3`)                  | DPA via ToS DO (PRIV-C05 mitigado); política declara EUA          |
| JWT / sessão longa (7d)                     | Janela de abuso se cookie vazar (produto)                         |
| Encarregado e playbook ANPD                 | Processos em `incident-response.md`; nomeação formal pendente     |
| Revisão jurídica da DPIA / política         | Fora do escopo de código                                          |

**Conclusão operacional:** o risco de exposição _pela ACL pública do objeto_ foi **mitigado** no código. O risco residual de incidente de confidencialidade em massa **não é zero** — depende de segredos, ops e contratos. Produção com dados reais exige manter bucket privado, não reintroduzir `public-read`, e seguir o playbook de incidente se houver suspeita de vazamento.

## Decisão / reavaliação

- Reavaliar esta DPIA após: mudança de região Spaces, novo CDN público, incidente real, ou fechamento de PRIV-C05 / purge automatizado de orphans.
- Comunicação ANPD/titulares: `docs/operators/incident-response.md`.

## Referências

- Issues: [PRIV-C03 #80](https://github.com/CaioGiasson/vitraux/issues/80), SEC-C01 #46, SEC-C02 #47
- RoPA: `docs/operators/subprocessors-ropa.md`
- Retenção: `docs/operators/retention.md`
