# Segurança, entitlement e licenciamento

## Princípio

Conseguir receber um dado tecnicamente não significa ter direito de armazená-lo, redistribuí-lo ou publicá-lo.

Antes de qualquer adapter real, registrar para o provider:

- identidade e plano contratado;
- mercados/símbolos cobertos;
- real-time vs delayed;
- direitos de retenção histórica;
- direitos de uso interno;
- direitos de redistribuição;
- limite de conexões;
- limites de rate/API;
- política de credenciais.

## Credenciais

Credenciais nunca entram no Git.

Adapter real deve ler segredos por variáveis de ambiente ou secret manager. Logs devem redigir tokens, account IDs e headers sensíveis.

## Manifesto de sessão

Toda gravação paga deve produzir um manifesto contendo:

- provider;
- sessão;
- modo;
- timestamps inicial/final;
- streams e símbolos;
- política de retenção/redistribuição conhecida;
- arquivos produzidos;
- hashes;
- flags de qualidade.

O schema inicial está em `schemas/session_manifest.schema.json`.

## Data retention gate

Antes de chamar `JsonlEventStore.append()` com dados reais, o adapter/orquestrador deve confirmar que `retention_allowed = true`.

Se redistribuição não for permitida:
- nenhum raw/licensed event entra em `docs/`;
- nenhum arquivo é commitado;
- UI pública recebe apenas derivados permitidos, quando os termos explicitamente autorizarem.

## Cost guard para backfill

Todo adapter histórico pago deverá implementar:
- dry-run;
- estimativa de bytes/registros/custo;
- teto configurável;
- confirmação explícita acima do teto;
- cache por intervalo;
- hash/manifesto;
- prevenção de re-download.

## Gate de produção

Um provider só pode sair do laboratório quando:
1. testes mock/replay passam;
2. licença foi revisada;
3. credenciais estão fora do código;
4. stale/reconnect/dedup foram testados;
5. custos possuem limites;
6. dados licenciados não vazam para GitHub Pages.
