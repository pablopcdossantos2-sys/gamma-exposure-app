# ROADMAP — Gamma Exposure · EWZ → WIN

Este roadmap mantém o escopo principal em **EWZ + WINFUT** e prioriza dados gratuitos. Recursos que exigem feeds pagos, entitlement de corretora ou backfill licenciado permanecem separados em `experimental/paid-data-architecture/`.

## Concluído

### A1 — Heatmap Strike × Vencimento
- matriz de GEX líquido por strike e vencimento;
- intensidade visual proporcional a `|GEX|`;
- tooltip com GEX líquido, calls, puts e DTE;
- novos snapshots preservam decomposição por expiry.

### A2 — Comparação de snapshots
- escolha de dois snapshots históricos;
- comparação de Spot, Net GEX, Walls e Flip;
- perfis sobrepostos e diferença `B − A`.

### A3 — Mapa temporal Time × Strike
- heatmap intradiário horário × strike;
- destaque da abertura do WIN;
- Walls marcadas dentro da matriz;
- compatível com filtro por expiry.

### A4 — Max Pain + Expected Move
- Max Pain por vencimento;
- Expected Move pelo straddle ATM, com fallback por IV;
- faixa EWZ e projeção para WIN;
- níveis integrados aos gráficos de preço.

### A5 — Filtros por vencimento
- visão agregada ou expiry individual;
- KPIs, Walls, Flip, gráficos e overlays seguem o filtro.

### B1 — DEX + Vanna + Charm
- exposições por strike e expiry;
- totais agregados;
- gráfico selecionável;
- overlays opcionais no EWZ/WIN;
- metodologia separada do GEX.

### B2 — IV Skew + Term Structure
**Status:** implementado.

- IV de calls e puts por strike;
- IV ATM por expiry;
- Put 25Δ e Call 25Δ;
- 25Δ Risk Reversal e Butterfly;
- term structure de IV ATM;
- slope normalizado em vol points/30 dias;
- classificação descritiva em contango, backwardation ou flat;
- filtro de vencimento aplicado à curva de skew.

### B5 — ΔOI entre sessões
**Status:** implementado.

- OI call/put preservado por strike e expiry nos snapshots v4+;
- comparação sempre entre dias/sessões, nunca entre horários intradiários;
- ΔOI calls, puts e líquido por strike;
- visão agregada ou por vencimento;
- painel informa quando ainda não existem duas sessões compatíveis.

### C2 — Painel de qualidade / freshness
**Status:** implementado.

- idade técnica entre timestamp da fonte e coleta;
- sessão de mercado em Nova York;
- contratos/calls/puts/expiries/strikes utilizáveis;
- cobertura de IV, bid/ask e OI;
- flags de chain incompleta, baixa cobertura e timestamp antigo;
- status OK / Atenção / Crítico;
- estado dos candles EWZ/WIN incorporado ao painel;
- indicação explícita de que a fonte pública CBOE é delayed e não real-time.

---

# Próximos blocos — dados gratuitos

## B3 — Stress Lab / Market Wind Tunnel
**Prioridade:** alta.

Página própria para alterar spot, IV, passagem do tempo e expiry e recalcular:
- GEX;
- Flip e Walls;
- DEX;
- Vanna;
- Charm.

Deve salvar um recibo reproduzível do cenário.

## B4 — Pinning / Gamma Gravity
**Prioridade:** média.

Ranking de strikes com maior atração teórica usando OI, gamma, distância do spot, IV e tempo.

**Aviso obrigatório:** heurística/modelo, não previsão garantida.

## B6 — Volume anômalo por contrato
**Prioridade:** média.

Baseline histórico por contrato/strike/expiry e destaque de atividade muito acima da própria linha de base.

## B7 — Put/Call Ratios
**Prioridade:** média.

- Put/Call por OI;
- Put/Call por volume;
- por expiry e agregado;
- histórico.

---

# Validação e qualidade

## C1 — Scorecard de validação histórica
**Prioridade:** alta.

Medir:
- toques, rejeições e rompimentos de Walls;
- tempo até toque;
- comportamento do WIN;
- desempenho por regime de GEX;
- distância inicial até níveis;
- comportamento do snapshot de abertura.

Sempre evitar look-ahead.

## C3 — GEX suavizado opcional
**Prioridade:** média.

Filtro de Kalman ou equivalente para a série histórica, sempre mantendo o valor raw disponível.

## C4 — Contexto automático em linguagem simples
**Prioridade:** média.

Resumo determinístico de distância a Walls, posição relativa ao Flip e mudanças desde a abertura, sem linguagem de certeza.

## C5 — Indicadores de preço como confluência opcional
**Prioridade:** média/baixa.

ATR, RSI e Bollinger opcionais, sem misturá-los ao cálculo de GEX.

---

# Ideias adicionais

## D1 — Comparação OI-weighted × Volume-weighted
Modelos separados: OI descreve inventário; volume descreve atividade intradiária.

## D2 — Replay reproduzível / recibo de análise
Registrar snapshot, modelo, expiry, parâmetros, timestamp e saída de cada análise/cenário.

---

# Arquitetura futura — dados pagos/entitled

Diretório: `experimental/paid-data-architecture/`

Mantém separados:
1. stream oficial/real-time de opções EWZ;
2. signed options flow;
3. backfill histórico profundo;
4. microestrutura WINFUT: trades, agressão e book.

---

# Sequência sugerida

### Próximo bloco recomendado
**B3 + B4 + C1 + D2**
- Stress Lab / Wind Tunnel;
- pinning;
- validação histórica;
- replay reproduzível.

### Depois
**B6 + B7 + C3 + C4**
- volume anômalo;
- Put/Call ratios;
- suavização;
- contexto automático.

### Camadas opcionais
**C5 + D1**

O roadmap deve ser revisado sempre que uma funcionalidade for integrada, movendo-a para “Concluído”.
