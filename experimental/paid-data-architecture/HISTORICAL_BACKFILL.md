# Backfill histórico profundo

## Objetivo

Permitir análises e validações anteriores ao início do nosso arquivo próprio de snapshots.

## Casos de uso

- reconstruir cadeias antigas do EWZ;
- testar GEX/DEX/Vanna/Charm em centenas de sessões;
- medir comportamento do WIN após Walls/Flip;
- validar pinning e expected move;
- treinar/avaliar classificadores sem usar dados futuros.

## Providers potenciais

Databento e outros fornecedores históricos/licenciados devem ser tratados como adapters opcionais. Nenhum provider é obrigatório na arquitetura.

## Cost guard

Qualquer implementação paga deve exigir:

1. estimativa de custo antes do download;
2. limite máximo configurável;
3. cache local imutável;
4. hash do arquivo baixado;
5. índice de cobertura por símbolo/data;
6. nunca baixar novamente um intervalo já armazenado;
7. modo `dry-run`.

## Estrutura futura

```text
experimental-data/
  raw/<provider>/<symbol>/<date>/
  normalized/<symbol>/<date>/
  manifests/
  coverage-index.json
```

Os dados pagos não devem ser versionados no GitHub.
