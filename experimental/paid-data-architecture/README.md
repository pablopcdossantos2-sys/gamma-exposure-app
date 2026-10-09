# Arquitetura experimental para dados pagos/entitled

Este diretório é **isolado do projeto principal**. Nada aqui é carregado por `docs/` ou pelos coletores gratuitos atuais.

Objetivo: preparar interfaces e decisões de arquitetura para funcionalidades que, em geral, exigem dados em tempo real licenciados, conta de corretora, entitlement específico ou backfill histórico pago.

## Casos de uso reservados

1. **Stream oficial/real-time de opções do EWZ**
   - bid/ask/last em baixa latência;
   - volume e greeks atualizados continuamente;
   - reconexão e controle de entitlement.

2. **Fluxo assinado de opções**
   - classificação agressor comprador/vendedor fornecida ou inferida a partir de feed adequado;
   - delta-weighted flow / hedge pressure;
   - tratamento de spreads e combo legs.

3. **Backfill histórico profundo**
   - cadeias antigas completas;
   - ticks/trades históricos;
   - snapshots anteriores ao início do nosso coletor.

4. **Microestrutura nativa do WINFUT**
   - trades/ticks oficiais;
   - eventualmente Market-by-Price / Market-by-Order;
   - integração futura com feed B3/broker/Nelogica ou outro fornecedor licenciado.

## Regra arquitetural

Todo provider futuro deve entrar por um **adapter**. O motor analítico não deve conhecer Schwab, dxFeed, Databento, Tastytrade ou qualquer outro fornecedor diretamente.

Fluxo esperado:

```
Provider/API
   ↓
Provider Adapter
   ↓
Normalized Market Event / Snapshot
   ↓
Validation + Quality
   ↓
Storage
   ↓
Analytics Engine
   ↓
Dashboard / Replay / Research
```

Veja:
- `PROVIDER_ADAPTER_CONTRACT.md`
- `REALTIME_OPTIONS_STREAM.md`
- `SIGNED_OPTIONS_FLOW.md`
- `HISTORICAL_BACKFILL.md`
- `WINFUT_MICROSTRUCTURE.md`

## Fontes de inspiração arquitetural

- EzOptions-Schwab: stream/chain via Schwab e histórico de exposições.
- Futures-Options-SD-Dashboard: stream + snapshot, stress engine e flow decomposition.
- Darthreign/gex-dashboard: fallback gratuito vs feed broker/dxFeed, backfill Databento separado.
- gex-terminal: adapters provider-neutral, replay, source quality e provider readiness.
- 0DTE-dealer-gamma: provider registry, WebSocket/backend persistente e snapshot quality.

Nenhum código desses projetos é copiado aqui.
