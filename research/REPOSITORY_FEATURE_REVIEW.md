# Revisão de funcionalidades — projetos GEX de referência

Objetivo desta revisão: extrair ideias aplicáveis ao `gamma-exposure-app` mantendo o escopo em **EWZ + WINFUT** e priorizando **dados gratuitos**. Conceitos foram analisados; não há cópia de código de terceiros.

## Fontes analisadas

- silverlion2/my-trading-app + site Vercel associado
- Hewkaw02/Futures-Options-SD-Dashboard
- gammagrid/gammagrid
- Darthreign/gex-dashboard
- EazyDuz1t/EzOptions-Schwab
- zrack/gex-terminal
- puneet-chandna/0DTE-dealer-gamma

## O que já podemos obter gratuitamente

A cadeia pública delayed do CBOE usada para EWZ contém, por contrato, dados suficientes para muito mais que GEX: bid, ask, IV, open interest, volume, delta, gamma e último preço. Com os snapshots que já armazenamos e os candles gratuitos de EWZ/WIN, várias análises podem ser calculadas localmente.

## Ideias recomendadas — dados gratuitos

| ID | Funcionalidade | Origem das ideias | Dados necessários | Valor para EWZ/WIN | Complexidade |
|---|---|---|---|---|
| F01 | **Heatmap Strike × Vencimento** | GammaGrid, EzOptions, Darthreign | CBOE EWZ | Mostra onde o GEX se concentra por strike e expiry; evita esconder diferenças ao agregar todos os vencimentos | Média |
| F02 | **Filtros de vencimento**: próximo, semana, mês, todos | GammaGrid, Darthreign, EzOptions | CBOE EWZ | Permite comparar 0/curto prazo contra estrutura mais longa | Baixa |
| F03 | **Comparar dois snapshots** | GammaGrid, gex-terminal | Histórico já salvo | Exibe deslocamento de Call Wall, Put Wall, Flip, GEX líquido e perfil por strike entre dois horários | Média |
| F04 | **Mapa temporal Time × Strike** | EzOptions, GammaGrid | Snapshots intradiários | Heatmap que mostra como as concentrações de GEX se deslocaram durante o dia | Média |
| F05 | **Max Pain** | my-trading-app, GammaGrid, Futures Dashboard | OI CBOE | Nível adicional, especialmente útil perto de vencimentos | Baixa |
| F06 | **Expected Move / bandas ±1σ** | Darthreign, Futures Dashboard | IV CBOE + tempo até vencimento | Contextualiza Walls e GEX dentro da amplitude que opções estão precificando | Baixa/Média |
| F07 | **IV Skew + Term Structure** | GammaGrid, Futures Dashboard, Darthreign | IV CBOE por strike/expiry | Mostra assimetria de puts/calls e mudança de regime de volatilidade | Média |
| F08 | **DEX, Vanna e Charm por strike** | Futures Dashboard, EzOptions, Darthreign | OI + IV + spot + expiry | Complementa GEX com exposição direcional, sensibilidade à IV e passagem do tempo | Média |
| F09 | **Stress Lab / “Wind Tunnel”** | gex-terminal, Futures Dashboard | Snapshot atual | Usuário desloca spot, IV e tempo e vê como Walls, GEX/DEX/Vanna/Charm mudam | Média/Alta |
| F10 | **Pinning / Gamma Gravity** | Futures Dashboard, GammaGrid | OI + gamma + IV + expiry | Ranqueia strikes com maior potencial de “atração” perto do vencimento; deve ser rotulado como modelo | Média |
| F11 | **OI Delta entre sessões** | GammaGrid, Darthreign | Snapshots de dias diferentes | Mostra onde posições cresceram ou foram desmontadas; mais confiável em comparação diária que intradiária | Baixa/Média |
| F12 | **Volume anômalo por contrato** | GammaGrid | Volume CBOE + histórico | Detecta contratos cujo volume está muito acima da própria linha de base histórica | Média |
| F13 | **Put/Call ratios** por OI e volume | GammaGrid, Darthreign | OI + volume CBOE | Métrica simples de composição da cadeia, com histórico | Baixa |
| F14 | **Exposição ponderada por Volume vs OI** como modo experimental | EzOptions, gex-terminal | Volume + OI | Permite comparar “inventário” (OI) com atividade intradiária (volume), mantendo os dois modelos separados | Baixa/Média |
| F15 | **Scorecard de validação histórica** | Futures Dashboard, Darthreign, gex-terminal | Snapshots + candles EWZ/WIN | Mede frequência de toque/rompimento/rejeição nas Walls, comportamento por regime de GEX e deslocamento após abertura | Média |
| F16 | **Painel de qualidade/freshness** | GammaGrid, gex-terminal, 0DTE-dealer-gamma | Metadados de coleta | Diferencia mercado fechado, dado atrasado, coleta falha, cadeia incompleta e snapshot suspeito | Baixa |
| F17 | **Smoothing opcional do GEX** | 0DTE-dealer-gamma | Série histórica de snapshots | Kalman simples para visualizar tendência do GEX sem substituir o valor bruto; sempre mostrar raw + smooth | Média |
| F18 | **Contexto automático em linguagem simples** | my-trading-app, Darthreign | Métricas já calculadas | Resumo do tipo “acima do Flip, perto da Call Wall, GEX líquido positivo”, sem chamar isso de previsão | Baixa |
| F19 | **Indicadores de preço em confluência** (ATR/RSI/Bollinger opcionais) | 0DTE-dealer-gamma | Candles EWZ/WIN | Ajuda a estudar GEX vs volatilidade/preço, sem misturar os modelos | Baixa |
| F20 | **Replay reproduzível / recibo de cenário** | gex-terminal | Snapshot + parâmetros | Salva exatamente quais dados e premissas geraram uma análise do Stress Lab | Média |

## Sugestão de ordem de implementação

### Bloco A — maior retorno / menor risco
F01, F02, F03, F05, F06, F11, F13, F16.

### Bloco B — evolução analítica
F04, F07, F08, F12, F15, F18.

### Bloco C — laboratório quantitativo
F09, F10, F14, F17, F19, F20.

## Observações metodológicas

1. **OI e Volume não devem ser misturados silenciosamente.** OI representa posições abertas; volume representa atividade. Se houver modo “Volume-weighted exposure”, ele deve aparecer como modelo experimental separado.
2. **Pinning, Max Pain e Walls são níveis estruturais, não garantias.**
3. **Vanna e Charm dependem de IV e tempo.** Devem registrar claramente a fórmula e as premissas usadas.
4. **Backtests precisam evitar look-ahead.** Cada análise histórica deve usar apenas dados que já estavam disponíveis naquele timestamp.
5. **EWZ → WIN é uma projeção.** Os níveis devem continuar sendo calculados no EWZ e depois transformados para WIN pelo método de alinhamento temporal já usado pelo projeto.
6. **O histórico é um ativo central.** GammaGrid e gex-terminal reforçam que guardar snapshots permite construir análises que um feed “ao vivo” isolado não oferece.

## Funcionalidades que não entram no projeto principal por enquanto

Recursos que precisam de stream oficial, entitlement de corretora ou histórico pago foram isolados em:

`experimental/paid-data-architecture/`

A arquitetura é provider-neutral e não é importada pelo dashboard atual.
