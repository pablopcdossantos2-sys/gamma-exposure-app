# ROADMAP — Gamma Exposure · EWZ → WIN

Este roadmap mantém o escopo principal em **EWZ + WINFUT** e prioriza dados gratuitos. Recursos que exigem feeds pagos, entitlement de corretora ou backfill licenciado permanecem separados em `experimental/paid-data-architecture/`.

## Concluído

### A1 — Heatmap Strike × Vencimento
- matriz de GEX líquido por strike e vencimento;
- intensidade visual proporcional a `|GEX|`;
- tooltip com GEX líquido, calls, puts e DTE.

### A2 — Comparação de snapshots
- escolha de dois snapshots históricos;
- comparação de Spot, Net GEX, Walls e Flip;
- perfis sobrepostos e diferença `B − A`.

### A3 — Mapa temporal Time × Strike
- heatmap intradiário horário × strike;
- destaque da abertura do WIN;
- Walls marcadas dentro da matriz.

### A4 — Max Pain + Expected Move
- Max Pain por vencimento;
- Expected Move pelo straddle ATM, com fallback por IV;
- faixa EWZ e projeção para WIN.

### A5 — Filtros por vencimento
- visão agregada ou expiry individual;
- KPIs, Walls, Flip, gráficos e overlays seguem o filtro.

### B1 — DEX + Vanna + Charm
- exposições por strike/expiry;
- totais agregados;
- overlays opcionais.

### B2 — IV Skew + Term Structure
- IV calls/puts por strike;
- IV ATM por expiry;
- RR25, BF25 e term structure;
- slope em vol points/30 dias.

### B3 — Stress Lab / Market Wind Tunnel
- choques configuráveis de spot, IV e passagem do tempo;
- recálculo aproximado de GEX, Walls, Flip, DEX, Vanna e Charm;
- recibo reproduzível.

### B4 — Pinning / Gamma Gravity
- ranking Top 10 por expiry;
- score combina gamma, OI, proximidade e DTE;
- tratado como heurística, não previsão.

### B5 — ΔOI entre sessões
- OI call/put por strike e expiry;
- comparação somente entre sessões/dias;
- ΔOI calls, puts e líquido.

### B6 — Volume anômalo por contrato lógico
**Status:** implementado.

- contrato lógico = expiry + strike + lado call/put;
- compara volume cumulativo com sessões anteriores em horário semelhante;
- baseline usa até 20 sessões anteriores e exige no mínimo 3 compatíveis;
- janela de horário comparável de ±60 minutos;
- robust z baseado em mediana e MAD;
- sinalização exige robust z ≥ 3 e filtro adicional de magnitude;
- não usa snapshots do mesmo dia como baseline;
- volume considera toda a chain válida, inclusive contratos com OI = 0;
- enquanto o histórico ainda não possui 3 sessões, o painel informa baseline insuficiente em vez de criar falso sinal.

### B7 — Put / Call Ratios
**Status:** implementado.

- P/C por open interest;
- P/C por volume;
- visão agregada e por expiry;
- histórico intradiário;
- linha de referência em 1;
- volume considera toda a chain válida, inclusive contratos com OI = 0;
- OI e volume permanecem conceitualmente separados.

### C1 — Scorecard de validação histórica
- toque, rejeição, rompimento e tempo até interação;
- EWZ e projeção para WIN;
- janelas de 60, 120 e 240 minutos;
- sem look-ahead.

### C2 — Painel de qualidade / freshness
- idade técnica, cobertura da chain e flags;
- estado de candles EWZ/WIN;
- distinção entre freshness técnico e feed delayed.

### C3 — GEX suavizado opcional
**Status:** implementado.

- série temporal de Net GEX bruto sempre visível;
- filtro de Kalman opcional;
- responsividade lenta, média ou rápida;
- funciona com a visão agregada ou expiry selecionado quando o snapshot possui esse detalhe;
- suavização é somente visual e não altera KPIs, Walls, Flip ou dados originais.

### C4 — Contexto automático em linguagem simples
**Status:** implementado.

- texto determinístico sobre regime de gamma;
- distâncias para Call/Put Wall;
- Put/Call Ratios;
- IV, RR25 e term structure;
- Gamma Gravity;
- mudança desde o snapshot da abertura;
- qualidade dos dados;
- nenhuma linguagem de certeza, sinal ou recomendação.


### C5 — Indicadores de preço como confluência opcional
**Status:** implementado.

- ATR(14), RSI(14) e Bollinger(20, 2σ);
- seleção entre EWZ e WIN1!;
- indicadores calculados somente a partir dos candles;
- camada independente do cálculo de opções;
- nenhum efeito sobre GEX, Walls, Flip, Stress Lab ou scorecards.

### D1 — OI-weighted × Volume-weighted Gamma
**Status:** implementado.

- GEX por open interest permanece o modelo estrutural principal;
- proxy separado de atividade gamma ponderado pelo volume da sessão;
- totais, strikes dominantes e correlação por strike;
- perfis normalizados para comparar a forma sem misturar escalas;
- contratos com OI zero podem contribuir para atividade por volume;
- OI e volume nunca são somados como se representassem a mesma grandeza.

### D2 — Replay reproduzível / recibo de análise
- snapshot, versão, expiry, parâmetros e resultados;
- replay e exportação JSON.

### Educação contextual — ícones de informação
- todas as principais seções possuem ajuda contextual;
- pop-up com o que mostra, como interpretar e limitações;
- catálogo reutilizável em `docs/help.js`.

---

# Arquitetura futura — dados pagos/entitled

Diretório: `experimental/paid-data-architecture/`

**Status arquitetural:** laboratório isolado implementado com mocks/testes; nenhum provider pago real conectado.

Trilhas:
1. **P1 — stream oficial/real-time de opções EWZ**: adapter contract, modelos normalizados, provenance, quality e pipeline preparados.
2. **P2 — signed options flow**: classificação provider/proxy, signed delta flow, signed gamma flow e hedge-notional proxy implementados para eventos normalizados.
3. **P3 — backfill histórico profundo**: interface historical, event store/replay e cost guard provider-neutral implementados.
4. **P4 — microestrutura WINFUT**: eventos quote/trade/book, trade pressure e imbalance implementados para dados normalizados.

CI próprio: `.github/workflows/paid-lab-selftest.yml`.

Nada dessa arquitetura é importado pelo sistema gratuito ativo.

---

# Próxima fase

O conjunto gratuito planejado até D1 está implementado. A próxima fase é **acumular histórico e validar** os módulos já existentes, enquanto a arquitetura de funcionalidades que exigem dados pagos/licenciados evolui isoladamente em `experimental/paid-data-architecture/`.

O laboratório pago deve permanecer fora do runtime ativo até que exista:
- provider escolhido;
- entitlement/licença adequados;
- política de armazenamento/redistribuição confirmada;
- orçamento;
- testes com dados mock/replay aprovados.

O roadmap deve ser revisado sempre que uma funcionalidade for integrada.
