# ROADMAP — Gamma Exposure · EWZ → WIN

Este roadmap mantém o escopo principal em **EWZ + WINFUT** e prioriza dados gratuitos. Recursos que exigem feeds pagos, entitlement de corretora ou backfill licenciado permanecem separados em `experimental/paid-data-architecture/`.

## Concluído

### A1 — Heatmap Strike × Vencimento
**Status:** implementado.

- matriz de GEX líquido por strike e vencimento;
- intensidade visual proporcional a `|GEX|`;
- tooltip com GEX líquido, calls, puts e DTE;
- destaque da coluna do vencimento atualmente filtrado;
- funciona com os novos snapshots que preservam decomposição por expiry.

### A2 — Comparação de snapshots
**Status:** implementado.

- escolha de dois snapshots históricos;
- comparação de Spot, Net GEX, Call Wall, Put Wall e Gamma Flip;
- gráfico sobreposto dos perfis de GEX;
- barras de diferença `B − A` por strike;
- troca rápida A ↔ B.

### A5 — Filtros por vencimento
**Status:** implementado.

- opção “Todos os vencimentos”;
- seleção de expiry individual;
- KPIs, Walls, Flip, gráfico por strike e overlays de EWZ/WIN passam a usar o expiry escolhido;
- snapshots legados continuam funcionando em modo agregado.


#---

## B2 — IV Skew + Term Structure
**Prioridade:** alta.

Adicionar:
- curva de IV por strike;
- skew puts/calls;
- IV ATM por vencimento;
- term structure;
- comparação histórica;
- sinalização de contango/backwardation de volatilidade como descrição, não previsão.

## B3 — Stress Lab / Market Wind Tunnel
**Prioridade:** alta.

Página própria para alterar:
- spot EWZ;
- deslocamento de IV;
- passagem do tempo;
- vencimento analisado.

Mostrar como mudariam:
- GEX;
- Gamma Flip;
- Call/Put Walls;
- DEX;
- Vanna;
- Charm.

Deve permitir salvar um “recibo” do cenário com snapshot e parâmetros usados.

## B4 — Pinning / Gamma Gravity
**Prioridade:** média.

Criar ranking de strikes com maior atração teórica próximo ao vencimento usando OI, gamma, distância do spot, IV e tempo.

**Aviso obrigatório:** modelo probabilístico/heurístico, não previsão garantida.

## B5 — ΔOI entre sessões
**Prioridade:** alta.

Comparar OI entre dias:
- maiores aumentos;
- maiores reduções;
- alteração por strike/expiry;
- mudança nas Walls associada ao novo inventário.

Priorizar comparação diária, já que OI não é uma variável intradiária continuamente atualizada.

## B6 — Volume anômalo por contrato
**Prioridade:** média.

Construir baseline histórico por contrato/strike/expiry e destacar:
- volume muito acima da própria média;
- concentração por calls/puts;
- proximidade de Walls/Flip.

Evitar thresholds absolutos universais.

## B7 — Put/Call Ratios
**Prioridade:** média.

Exibir:
- Put/Call por OI;
- Put/Call por volume;
- por vencimento;
- agregado;
- histórico dos ratios.

---

# Validação e qualidade

## C1 — Scorecard de validação histórica
**Prioridade:** alta.

Medir historicamente:
- toques em Call/Put Wall;
- rejeições;
- rompimentos;
- tempo até toque;
- comportamento do WIN após aproximação;
- desempenho por regime de GEX;
- distância inicial até níveis;
- comportamento do snapshot de abertura.

Evitar look-ahead: cada sessão deve usar apenas dados disponíveis naquele momento.

## C2 — Painel de qualidade / freshness
**Prioridade:** alta.

Mostrar explicitamente:
- horário da coleta;
- timestamp da fonte;
- atraso estimado;
- snapshot incompleto;
- ausência de um lado da cadeia;
- IV inválida/corrompida;
- GEX extremamente desequilibrado;
- mercado fechado;
- falha de coleta.

## C3 — GEX suavizado opcional
**Prioridade:** média.

Adicionar filtro de Kalman ou suavização semelhante para a série temporal de Net GEX.

**Regra:** sempre mostrar ou permitir consultar o valor bruto; o filtro nunca substitui silenciosamente o dado original.

## C4 — Contexto automático em linguagem simples
**Prioridade:** média.

Gerar frases determinísticas como:
- “EWZ acima do Gamma Flip”;
- “Call Wall a 0,8% do spot”;
- “Put Wall se deslocou 1 strike desde a abertura”;
- “Net GEX aumentou 22% desde o snapshot de referência”.

Não usar linguagem de certeza ou “IA preditiva” quando for apenas regra descritiva.

## C5 — Indicadores de preço como confluência opcional
**Prioridade:** média/baixa.

Adicionar ATR, RSI e Bollinger como camadas opcionais nos gráficos EWZ/WIN.

Possíveis estudos:
- GEX negativo + expansão acima de ATR;
- aproximação de Wall + compressão de volatilidade;
- distância do preço às bandas vs zonas de GEX.

Não misturar os indicadores com o cálculo de GEX.

---

# Ideias adicionais da pesquisa

## D1 — Comparação OI-weighted × Volume-weighted
Manter dois modelos separados:
- OI = inventário/posicionamento aberto;
- Volume = atividade intradiária.

Nunca somar ou substituir um pelo outro sem identificação explícita.

## D2 — Replay reproduzível / recibo de análise
Para cada estudo ou Stress Lab, registrar:
- snapshot;
- versão do modelo;
- expiry selecionado;
- parâmetros;
- timestamp;
- resultado calculado.

Útil para pesquisa e validação posterior.

---

# Arquitetura futura — dados pagos/entitled

Não integrar ao projeto principal enquanto não houver fonte legalmente adequada e orçamento.

Diretório existente:

`experimental/paid-data-architecture/`

Componentes planejados:

1. **Stream oficial de opções EWZ**
   - quotes/trades de baixa latência;
   - WebSocket;
   - entitlement;
   - reconnect/freshness.

2. **Signed Options Flow**
   - agressor comprador/vendedor;
   - delta-weighted flow;
   - gamma-weighted flow;
   - hedge pressure;
   - identificação de combos quando possível.

3. **Backfill histórico profundo**
   - cadeias completas antigas;
   - trades/ticks;
   - validação em centenas de sessões;
   - cost guard obrigatório.

4. **Microestrutura WINFUT**
   - Times & Trades;
   - agressão;
   - bid/ask;
   - Market by Price;
   - Market by Order/DOM, quando disponível e licenciado.

---

# Sequência sugerida

### Próximo bloco recomendado
**B2 + B5 + C2**
- IV skew/term structure;
- ΔOI entre sessões;
- qualidade/freshness.

### Depois
**B3 + B4 + C1 + D2**
- Stress Lab / Wind Tunnel;
- pinning;
- validação histórica;
- replay reproduzível.

### Camadas opcionais
**B6 + B7 + C3 + C4 + C5 + D1**

O roadmap deve ser revisado sempre que uma funcionalidade for integrada, movendo-a para a seção “Concluído”.
