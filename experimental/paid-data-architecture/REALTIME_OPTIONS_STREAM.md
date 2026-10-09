# Stream oficial/real-time de opções do EWZ

## Por que manter separado

A fonte gratuita atual do CBOE é suficiente para estrutura delayed, mas não garante baixa latência nem fluxo de trades assinado. Providers como Schwab/dxFeed/Tradier/Tastytrade podem exigir conta, credenciais ou entitlement.

## Arquitetura proposta

```text
WebSocket / streaming API
  → reconnect manager
  → provider adapter
  → contract identity resolver
  → snapshot assembler
  → quality validator
  → append-only event store
  → current-state cache
  → analytics engine
```

## Requisitos

- reconexão com backoff;
- heartbeat;
- detecção de stale feed;
- deduplicação de eventos;
- sequência/timestamp monotônico quando disponível;
- snapshot inicial + updates incrementais;
- cache de contratos por expiry;
- isolamento por provider;
- capacidade de gravar uma sessão para replay.

## Migração futura

O dashboard deve consumir o mesmo schema normalizado que o coletor CBOE. Assim, trocar delayed por real-time será mudança de adapter, não reescrita do motor.
