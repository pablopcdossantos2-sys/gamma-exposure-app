# Arquitetura experimental para dados pagos/entitled

Este diretório é **isolado do projeto principal**. Nada aqui é carregado por `docs/`, `collector/` ou pelo workflow de coleta gratuita.

Objetivo: desenvolver e testar a arquitetura necessária para funcionalidades que exigem dados licenciados, baixa latência, conta de corretora, entitlement específico ou backfill histórico pago **antes de contratar qualquer provider**.

## O que já existe

```text
experimental/paid-data-architecture/
  src/paidlab/
    models.py          modelos normalizados + provenance
    provider.py        contrato abstrato/capabilities
    flow.py            signed-flow + hedge pressure proxies
    storage.py         event store append-only JSONL
    replay.py          replay determinístico
    mock_provider.py   provider sintético para testes
  schemas/
    option_event.schema.json
    win_event.schema.json
    session_manifest.schema.json
  tests/
    test_paidlab.py
  selftest.py
  IMPLEMENTATION_STATUS.md
  SECURITY_ENTITLEMENT.md
  *.md                 especificações por trilha
```

CI isolado: `.github/workflows/paid-lab-selftest.yml`.

## Trilhas

### P1 — Stream oficial/real-time de opções EWZ
Adapter futuro produz `OptionQuote`/`OptionTrade`, com timestamps, provenance, heartbeat/reconnect e qualidade.

### P2 — Signed Options Flow
`flow.py` já recebe agressor fornecido pelo provider ou, quando ausente, pode usar quote-test rotulado como **proxy**. Calcula signed delta flow, signed gamma flow e hedge-notional proxy.

### P3 — Historical Backfill
`ProviderAdapter.fetch_historical()`, storage JSONL e replay já formam o esqueleto. Um provider real deve adicionar cost guard, cobertura e regras de licença.

### P4 — Microestrutura WINFUT
`WinEvent` comporta quote, trade e book. O feed real permanece ausente até haver licença/entitlement adequado.

## Regra arquitetural

```text
Provider/API
   ↓
Provider Adapter
   ↓
Normalized Event + Provenance
   ↓
Validation / Quality
   ↓
Append-only Store
   ↓
Replay / Analytics
   ↓
Research UI futura
```

O motor nunca deve depender diretamente de um nome de fornecedor.

## Executar sem dados pagos

```bash
python experimental/paid-data-architecture/selftest.py
python -m unittest discover -s experimental/paid-data-architecture/tests -p "test_*.py"
```

## Isolamento obrigatório

- nenhuma credencial no repositório;
- nenhum endpoint pago exigido pelo sistema ativo;
- dados licenciados fora do Git;
- provenance preservada em todos os eventos;
- falha explícita quando entitlement estiver ausente;
- regras de retenção/redistribuição verificadas antes de persistir dados reais;
- integração futura deverá ser opt-in e separada do modo gratuito.

Veja também:
- `IMPLEMENTATION_STATUS.md`
- `SECURITY_ENTITLEMENT.md`
- `PROVIDER_ADAPTER_CONTRACT.md`
- `REALTIME_OPTIONS_STREAM.md`
- `SIGNED_OPTIONS_FLOW.md`
- `HISTORICAL_BACKFILL.md`
- `WINFUT_MICROSTRUCTURE.md`
