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
**Status:** implementado.

- choques configuráveis de spot, IV e passagem do tempo;
- recálculo aproximado de GEX, Walls, Flip, DEX, Vanna e Charm;
- comparação base × cenário;
- gráfico dos perfis de GEX;
- usa o snapshot/expiry ativos;
- deixa explícito que OI permanece fixo e que o modelo usa agregados por strike.

### B4 — Pinning / Gamma Gravity
**Status:** implementado.

- ranking Top 10 por expiry;
- score combina concentração absoluta de gamma, OI, proximidade do spot e tempo até vencimento;
- score normalizado 0–100;
- projeção dos strikes para WIN;
- tratado explicitamente como heurística estrutural, não probabilidade de fechamento.

### B5 — ΔOI entre sessões
- OI call/put por strike e expiry;
- comparação apenas entre sessões/dias;
- ΔOI calls, puts e líquido.

### C1 — Scorecard de validação histórica
**Status:** implementado.

- avalia Call Wall e Put Wall em snapshots históricos;
- mede toque, rejeição, rompimento e tempo até interação;
- calcula métricas separadas para EWZ e níveis projetados no WIN;
- horizontes configuráveis de 60, 120 e 240 minutos;
- exclui snapshots sem toda a janela futura disponível;
- rejeição/rompimento usam regra explícita de 0,15% após o toque;
- amostra cresce automaticamente com o histórico.

### C2 — Painel de qualidade / freshness
- idade técnica, cobertura da chain e flags;
- estado de candles EWZ/WIN;
- distinção entre freshness técnico e feed delayed.

### D2 — Replay reproduzível / recibo de análise
**Status:** implementado.

- recibo do Stress Lab com snapshot, versão, expiry, parâmetros, base e resultado;
- persistência local no navegador;
- replay de um cenário salvo;
- exportação individual ou consolidada em JSON;
- limite local de 50 recibos.

### Educação contextual — ícones de informação
**Status:** implementado.

- cada seção do dashboard possui ícone `i`;
- pop-up padronizada com “o que mostra”, “como interpretar” e “cuidados/limitações”;
- suporte a teclado/Esc e clique fora;
- link para o guia didático completo;
- arquitetura reutilizável em `docs/help.js` para futuras seções.

---

# Próximos blocos — dados gratuitos

## B6 — Volume anômalo por contrato
**Prioridade:** média.

Baseline histórico por contrato/strike/expiry e destaque de atividade acima da própria linha de base.

## B7 — Put/Call Ratios
**Prioridade:** média.

- Put/Call por OI;
- Put/Call por volume;
- por expiry e agregado;
- histórico.

## C3 — GEX suavizado opcional
**Prioridade:** média.

Filtro de Kalman ou equivalente para a série histórica, sempre mantendo o valor bruto visível.

## C4 — Contexto automático em linguagem simples
**Prioridade:** média.

Resumo determinístico de distância a Walls, posição relativa ao Flip e mudanças desde a abertura, sem linguagem de certeza.

## C5 — Indicadores de preço como confluência opcional
**Prioridade:** média/baixa.

ATR, RSI e Bollinger opcionais, sem misturá-los ao cálculo de GEX.

## D1 — Comparação OI-weighted × Volume-weighted
**Prioridade:** média.

Manter dois modelos separados:
- OI = inventário/posições abertas;
- volume = atividade intradiária.

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
**B6 + B7 + C3 + C4**
- volume anômalo;
- Put/Call ratios;
- GEX suavizado;
- contexto automático.

### Depois
**C5 + D1**
- indicadores de preço opcionais;
- OI-weighted × Volume-weighted.

O roadmap deve ser revisado sempre que uma funcionalidade for integrada, movendo-a para “Concluído”.
