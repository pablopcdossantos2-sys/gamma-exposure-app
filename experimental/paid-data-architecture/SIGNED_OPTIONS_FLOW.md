# Fluxo assinado de opções e hedge pressure

## Funcionalidade

Construir métricas de fluxo que diferenciem compra/venda agressora e convertam trades em pressão teórica de hedge.

Exemplos futuros:
- call/put signed flow;
- delta-weighted signed flow;
- gamma-weighted trade activity;
- hedge pressure por strike;
- mudança de regime de fluxo;
- separação de legs de combos/spreads quando a fonte permitir.

## Por que não entra agora

A cadeia delayed pública não informa com confiabilidade o lado agressor de cada trade. Volume acumulado não substitui signed order flow.

## Pipeline

```text
Option Trade Feed
  → normalize trade
  → classify/accept aggressor side
  → identify combo/complex order if possible
  → attach greeks at event time
  → signed delta/gamma contribution
  → rolling aggregation
  → EWZ flow state
  → projected context on WIN
```

## Métricas candidatas

```text
signed_delta_flow = side × contracts × delta × multiplier
signed_gamma_flow = side × contracts × gamma × multiplier
hedge_notional_proxy = signed_delta_flow × EWZ_price
```

## Regras metodológicas

- Se o lado agressor não vier da fonte, qualquer inferência deve ser rotulada como proxy.
- Não somar legs de combo como trades independentes sem identificação.
- Não interpretar signed flow como posição dealer observada.
- Guardar eventos brutos/licenciados apenas conforme termos do provider.
