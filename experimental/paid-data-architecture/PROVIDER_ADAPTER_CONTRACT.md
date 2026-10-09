# Provider Adapter Contract

## Objetivo

Permitir trocar ou combinar fornecedores sem alterar o motor de análise.

## Capacidades declaradas

Cada adapter deve declarar explicitamente:

```text
provider_id
mode: delayed | realtime | historical
supports:
  ewz_options_chain
  ewz_option_trades
  signed_option_flow
  winfut_quotes
  winfut_trades
  winfut_orderbook
  historical_backfill
latency_class
redistribution_policy
requires_credentials
requires_paid_entitlement
```

## Snapshot normalizado de opções

Campos mínimos por contrato:

```text
provider
received_at
source_timestamp
symbol
option_symbol
expiration
strike
option_type
bid
ask
last
volume
open_interest
implied_volatility
delta
gamma
vega?
theta?
trade_side?          # apenas se a fonte realmente fornecer
quality_flags[]
```

## Evento normalizado de WINFUT

```text
provider
received_at
source_timestamp
symbol
event_type: quote | trade | book
price
size
bid?
ask?
bid_size?
ask_size?
aggressor_side?
book_levels?
quality_flags[]
```

## Regras

- Nunca inferir que uma fonte é real-time apenas porque atualiza com frequência.
- Preservar `source_timestamp` e `received_at` separadamente.
- Dados licenciados não devem ser redistribuídos sem permissão.
- Credenciais ficam fora do repositório.
- O adapter deve falhar de forma explícita quando entitlement estiver ausente.
- Dados gratuitos e pagos não devem ser fundidos sem provenance.
- Toda saída deve permitir replay offline.
