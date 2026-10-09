# Status de implementação do laboratório pago

## Princípio

Este laboratório **não faz parte do sistema ativo**. O objetivo é garantir que, quando houver orçamento, licença e entitlement, o projeto já tenha uma arquitetura testável e provider-neutral.

## Já implementado sem dados pagos

- modelos normalizados para quotes/trades de opções e eventos do WIN;
- provenance obrigatório: provider, timestamp da fonte, recebimento, modo e flags;
- contrato abstrato de provider e declaração de capabilities;
- provider mock;
- classificação de agressor: aceita lado fornecido pelo provider e possui quote-test explicitamente rotulado como proxy;
- signed delta flow, signed gamma flow e hedge-notional proxy;
- armazenamento append-only JSONL;
- replay determinístico;
- cost guard provider-neutral para backfill;
- métricas básicas de trade pressure e book imbalance do WIN;
- quality/freshness para streams licenciados;
- pipeline mínimo provider → store → análise;
- schemas JSON para opções, WIN e manifestos;
- testes unitários sem credenciais.

## Trilhas preparadas

### P1 — Stream real-time EWZ
Pronto arquiteturalmente para um adapter WebSocket/streaming que produza `OptionQuote` e `OptionTrade`.

### P2 — Signed Options Flow
O motor recebe trades normalizados, preserva a origem do aggressor side e calcula contribuições assinadas. Ainda falta um feed licenciado real.

### P3 — Historical Backfill
O adapter pode implementar `fetch_historical(request)`; storage/replay e `CostGuard` provider-neutral já estão disponíveis. Falta provider/licença e estimador de custo específico do fornecedor.

### P4 — WINFUT Microstructure
`WinEvent` suporta quote, trade e book. `microstructure.py` já calcula trade pressure, top-of-book imbalance e depth imbalance quando os campos existirem. A implementação real depende de feed B3/broker/Nelogica ou outro fornecedor com direitos adequados.

## O que NÃO foi feito

- nenhuma chave/API credential;
- nenhum endpoint pago hard-coded;
- nenhuma compra/download;
- nenhuma redistribuição de dados licenciados;
- nenhuma importação do laboratório pelo dashboard ativo.

## Gate para ativação futura

Antes de conectar qualquer provider real:

1. confirmar termos de uso e direitos de retenção;
2. definir orçamento máximo;
3. criar adapter específico;
4. executar testes em replay;
5. validar timestamps, sequência, stale feed e reconexão;
6. revisar armazenamento/criptografia de credenciais;
7. somente então considerar uma integração opt-in separada do modo gratuito.
