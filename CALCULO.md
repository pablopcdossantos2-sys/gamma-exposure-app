# Como os níveis são calculados

Código: `collector/gex_core.py`. Entrada: a resposta original do CBOE (preservada em `data/raw/`).

## 1. GEX por contrato (em EWZ)
Só contratos com open interest > 0:

    GEX = gamma × OI × 100 × preço² × 0,01        (US$ por 1% de movimento)

- `gamma`: informado pelo CBOE para o contrato
- `OI`: open interest; `100`: ações por contrato
- `preço² × 0,01`: converte para dólares por 1% de movimento do EWZ

Convenção: **calls somam (+), puts subtraem (−)** (suposição padrão de mercado, não a posição real dos dealers).
Por strike: `call` (soma das calls), `put` (soma das puts, negativa) e `net = call + put`. O GEX líquido total é a soma de todos os `net`.

## 2. Níveis
- **Call Wall**: strike com o maior `call`. Resistência provável.
- **Put Wall**: strike com o `put` mais negativo. Suporte provável.
- **Maior |GEX|**: strike com maior `|net|` (ímã).
- **Gamma Flip**: o gamma é recalculado por Black-Scholes (IV de cada contrato, r = 0) para 161 preços hipotéticos entre 80% e 120% do EWZ; soma-se o GEX de todos os contratos em cada preço (a curva do site) e interpola-se linearmente o cruzamento por zero mais próximo do preço atual. Sem cruzamento na faixa, fica vazio.

Leitura: preço acima do flip = gamma positivo (movimentos tendem a ser amortecidos); abaixo = gamma negativo (amplificados).

## 3. Conversão para WIN (feita no navegador)

    razão    = WIN informado ÷ preço do EWZ no dado
    nível WIN = nível EWZ × razão   (arredondado a múltiplos de 5)

Exemplo: WIN 180.000, EWZ 30,00 → razão 6.000; Call Wall em 33 → 198.000.
A razão embute dólar e base do futuro, então varia ao longo do dia; use o WIN do mesmo horário do dado. Os JSON guardam apenas valores em EWZ, de modo que a conversão pode ser refeita a qualquer momento.

## 4. Dados guardados
- `docs/data/latest.json`: última coleta (níveis, GEX por strike, curva) — valores em EWZ.
- `docs/data/history.json`: uma linha por coleta (preço, GEX líquido, flip, walls).
- `data/raw/*.json.gz`: resposta original do CBOE, sem alteração.

## 5. Limitações
CBOE com ~15 min de atraso; OI atualizado uma vez por dia; EWZ é proxy do Ibovespa em dólares; o modelo supõe a posição dos dealers.


## 6. Max Pain

Calculado **por vencimento**.

Para cada strike candidato de liquidação `S*`, somamos o payout intrínseco de todas as opções daquele expiry:

    payout_calls = Σ max(S* - strike, 0) × OI × 100
    payout_puts  = Σ max(strike - S*, 0) × OI × 100

O **Max Pain** é o strike candidato com o menor payout agregado.

Interpretação: é uma referência estrutural baseada no open interest do vencimento. Não é uma previsão nem implica que o preço vá convergir para esse nível.

Quando a interface está em “Todos os vencimentos”, o painel usa o **expiry mais próximo** como referência; não misturamos vencimentos diferentes em um único Max Pain.

## 7. Expected Move

Método preferencial, por vencimento:

    Expected Move ≈ mid da call ATM + mid da put ATM

onde o mid é `(bid + ask) / 2`. O strike ATM é o strike comum a call/put mais próximo do spot.

Faixa exibida:

    limite inferior = spot - Expected Move
    limite superior = spot + Expected Move

Quando um straddle ATM utilizável não está disponível, usamos o fallback:

    Expected Move ≈ spot × IV_ATM × sqrt(T)

com `T` em anos.

A utilização do preço do straddle ATM como aproximação do movimento esperado é uma convenção educacional comum; a própria Options Industry Council descreve o preço do straddle ATM dividido pelo preço do ativo como uma estimativa aproximada do movimento esperado.

## 8. DEX, Vanna e Charm

Essas métricas são mantidas **separadas da convenção de sinal do GEX**.

### 8.1 DEX

Proxy de dealer delta exposure:

    DEX = posição_assumida × delta × OI × 100 × spot

Nesta versão:

    posição_assumida = -1

ou seja, usamos uma hipótese simplificada de dealer **short das opções** dos dois lados.

Isso produz:
- calls: contribuição DEX normalmente negativa;
- puts: como o delta da put é negativo, a contribuição normalmente fica positiva.

O DEX representa notional de delta sob essa hipótese — não uma observação da carteira real dos dealers.

### 8.2 Vanna Exposure

Vanna mede a sensibilidade do delta a mudanças de volatilidade:

    Vanna = ∂Delta / ∂σ

Usamos Black-Scholes com `r = 0`, consistente com o cálculo de gamma hipotético já usado no projeto.

A exposição mostrada é aproximada para **+1 ponto de volatilidade**:

    Vanna Exposure =
        posição_assumida × Vanna × 0,01 × OI × 100 × spot

### 8.3 Charm Exposure

Charm mede a alteração do delta com a passagem do tempo. Usamos a convenção trader de **um dia decorrido**.

    Charm Exposure =
        posição_assumida × Charm_por_dia × OI × 100 × spot

Interpretação:
- DEX: direção/magnitude do notional delta do proxy;
- Vanna: quanto esse notional delta tende a mudar se a IV variar;
- Charm: quanto tende a mudar mecanicamente com a passagem de um dia.

Cboe descreve Delta, Gamma, Vega e Theta como sensibilidades distintas de risco; Vanna e Charm são Greeks de ordem superior derivados do mesmo arcabouço de sensibilidade. No dashboard, eles são contexto estrutural, não sinais de entrada.

## 9. Mapa temporal Time × Strike

Cada snapshot preserva o perfil de GEX por strike. O mapa temporal:

- eixo X = horário de coleta;
- eixo Y = strike;
- cor = sinal do GEX líquido;
- intensidade = `|GEX|` relativo dentro da visualização;
- borda azul = Call Wall do snapshot;
- borda laranja = Put Wall do snapshot;
- coluna destacada = snapshot mais próximo da abertura normal do WIN.

Se um vencimento específico estiver selecionado, o mapa usa apenas snapshots que já possuam decomposição daquele expiry. Snapshots antigos sem `expiry_profiles` não são silenciosamente misturados.

## 10. Dados guardados após snapshot v3

Além dos campos anteriores, novos snapshots preservam:

- perfis de GEX por vencimento;
- DEX, Vanna e Charm por strike;
- totais Net DEX / Net Vanna / Net Charm;
- Max Pain por expiry;
- Expected Move, fonte do cálculo e limites superior/inferior.

Snapshots anteriores continuam compatíveis, porém essas métricas podem aparecer como indisponíveis.


## 11. IV Skew e Term Structure

Para cada vencimento:

- **IV ATM**: média entre IV da call e da put no strike comum mais próximo do spot.
- **Call 25Δ**: contrato call cuja delta está mais próxima de +0,25.
- **Put 25Δ**: contrato put cuja |delta| está mais próxima de 0,25.
- **Risk Reversal 25Δ**:

    RR25 = IV(Call 25Δ) - IV(Put 25Δ)

  Valor negativo significa puts 25Δ mais caras em volatilidade que calls 25Δ.

- **Butterfly 25Δ**:

    BF25 = (IV(Call 25Δ) + IV(Put 25Δ))/2 - IV_ATM

A **Term Structure** usa a IV ATM de cada expiry. Para um resumo comparável, calculamos uma inclinação normalizada em vol points por 30 dias entre o vencimento mais próximo e o vencimento disponível mais próximo de 30 DTE:

    slope_30d = (IV_ref - IV_front) / (DTE_ref - DTE_front) × 30

Classificação descritiva:
- acima de +0,5 vol point/30d: contango;
- abaixo de −0,5: backwardation;
- entre os limites: flat.

Isso descreve a forma da curva de IV, não prevê direção do EWZ/WIN.

## 12. ΔOI entre sessões

A partir do snapshot v4, cada strike/expiry guarda separadamente:

- OI calls;
- OI puts;
- volume calls;
- volume puts;
- IV e delta por lado.

Para duas sessões consecutivas:

    ΔOI_call = OI_call_atual - OI_call_anterior
    ΔOI_put  = OI_put_atual  - OI_put_anterior
    ΔOI_net  = ΔOI_call - ΔOI_put

O painel **não calcula ΔOI entre dois horários do mesmo dia**. A comparação é feita somente entre sessões/datas diferentes, porque open interest é um estoque de posições abertas, não uma medida intradiária contínua.

Se uma das sessões foi gravada antes do snapshot v4 e não possui OI por strike, o painel informa indisponibilidade em vez de estimar valores.

## 13. Qualidade e freshness dos dados

Cada snapshot v4+ contém um objeto `quality` com:

- timestamp da fonte;
- timestamp da coleta;
- idade técnica em segundos;
- sessão de mercado em Nova York;
- quantidade de contratos/calls/puts;
- expiries e strikes;
- cobertura de IV;
- cobertura bid/ask;
- percentual da chain com OI positivo;
- flags de qualidade;
- status `ok`, `warning` ou `critical`.

### Idade técnica ≠ real-time

A idade técnica mede apenas:

    momento da coleta - timestamp informado pela fonte

Ela **não remove nem estima o atraso de distribuição/licenciamento do feed público**. O dashboard continua rotulando a fonte CBOE como delayed.

### Flags atuais

Podem incluir:

- `chain_incomplete`;
- `low_contract_count`;
- `low_iv_coverage`;
- `partial_iv_coverage`;
- `source_timestamp_missing`;
- `source_timestamp_old`;
- `source_timestamp_very_old`.

O front-end também incorpora avisos do coletor de preços quando EWZ/WIN estão stale ou apresentam erro.


## 14. Stress Lab / Market Wind Tunnel

O Stress Lab usa o **snapshot e o vencimento ativos** como base e aplica três choques configuráveis:

- deslocamento percentual do spot do EWZ;
- deslocamento uniforme da IV em pontos de volatilidade;
- passagem de dias.

Como os snapshots guardam dados agregados por strike/lado, o cenário cria dois pseudo-contratos agregados por strike: call e put, usando:

- OI call/put;
- IV call/put ponderada;
- strike;
- tempo restante.

O OI permanece fixo durante o cenário.

Para o novo spot/IV/tempo, recalculamos por Black-Scholes:

- gamma e GEX por strike;
- delta e DEX;
- vanna;
- charm;
- Call Wall;
- Put Wall;
- maior |GEX|;
- Gamma Flip por varredura de preços hipotéticos entre 80% e 120% do spot do cenário.

### Limitação

Esse laboratório é um **teste de sensibilidade**. Ele não tenta prever nova demanda por opções, mudança futura de OI, smile dinâmico completo, juros/carry, fluxo assinado ou microestrutura.

A versão do modelo é registrada como:

    stress-v1-aggregate

## 15. Pinning / Gamma Gravity

O ranking é calculado por vencimento e combina quatro componentes:

1. magnitude absoluta do gamma/GEX no strike;
2. OI total;
3. proximidade entre strike e spot;
4. tempo até o vencimento.

A forma atual é:

    gamma_component = |GEX_call| + |GEX_put|
    proximity = exp( - |strike/spot - 1| / 0,03 )
    time_weight = 1 / sqrt(max(DTE, 0,5))

    raw_score =
        gamma_component^0,60
        × sqrt(OI_total + 1)
        × proximity
        × time_weight

Os scores são normalizados dentro do expiry:

    score = raw_score / maior_raw_score × 100

O maior strike recebe 100 e os demais valores relativos.

### Interpretação correta

O score identifica strikes que merecem atenção estrutural. Ele **não** representa:

- probabilidade de fechamento;
- chance de toque;
- suporte/resistência garantidos;
- previsão direcional.

## 16. Scorecard histórico de Walls

O scorecard avalia Call Wall e Put Wall usando apenas dados que já existiam no timestamp do snapshot.

### Elegibilidade

Um snapshot entra na análise somente se:

- possui Wall e spot;
- existem candles posteriores;
- toda a janela futura selecionada está disponível.

Horizontes atuais:

- 60 minutos;
- 120 minutos;
- 240 minutos.

### Toque

Uma Wall é considerada tocada quando um candle posterior satisfaz:

    mínima <= nível <= máxima

### Rejeição e rompimento

Após o primeiro toque, observamos até três candles adicionais.

Para Call Wall:

    rompimento: fechamento >= Wall × 1,0015
    rejeição:   fechamento <= Wall × 0,9985

Para Put Wall:

    rompimento: fechamento <= Wall × 0,9985
    rejeição:   fechamento >= Wall × 1,0015

Se houver rompimento, ele prevalece sobre rejeição na janela avaliada.

### WIN

Para o WIN, o nível histórico é projetado usando a razão EWZ/WIN de candles coincidentes próximos ao timestamp do snapshot. Apenas pares suficientemente próximos no tempo são usados.

### Métricas

O painel apresenta:

- amostras elegíveis;
- taxa de toque;
- taxa de rejeição entre toques;
- taxa de rompimento entre toques;
- mediana de minutos até o primeiro toque.

O objetivo é **validar o comportamento histórico do modelo**, não otimizar parâmetros para encaixar o passado.

## 17. Recibos reproduzíveis

Cada recibo do Stress Lab salva:

- tipo de análise;
- versão do modelo;
- data/hora de criação;
- snapshot de origem;
- versão do snapshot;
- expiry;
- parâmetros de spot/IV/tempo;
- métricas-base;
- resultado do cenário.

Os recibos são guardados em `localStorage` do navegador, com limite atual de 50 registros, e podem ser:

- reproduzidos;
- exportados individualmente em JSON;
- exportados em lote.

Limpar os dados do navegador pode apagar os recibos locais. Exportação JSON é a forma persistente recomendada.

## 18. Ajuda contextual

O dashboard usa `docs/help.js` como catálogo educativo.

Cada seção marcada com `data-help` recebe um ícone de informação que abre um modal com:

- o que a seção mostra;
- como interpretar;
- cuidados e limitações;
- link para o guia didático completo.

Esse mecanismo é independente dos cálculos e pode ser ampliado para novas seções sem duplicar textos no HTML.

## 19. Snapshot v5

A partir do snapshot v5, os perfis por vencimento também podem preservar o ranking `pinning` calculado no coletor.

Snapshots anteriores continuam compatíveis: o front-end consegue derivar o ranking a partir de GEX/OI armazenados quando necessário.


## 20. Volume anômalo por contrato lógico

A unidade analisada é:

    expiry + strike + lado (call ou put)

O volume é **cumulativo intradiário**, portanto comparar o valor das 10:00 de hoje com o fechamento de ontem seria metodologicamente incorreto.

Para cada snapshot atual:

1. identificamos o horário local da coleta;
2. buscamos, em cada sessão anterior, o snapshot mais próximo daquele horário;
3. aceitamos somente comparações até ±60 minutos;
4. coletamos o volume do mesmo expiry, strike e lado;
5. exigimos no mínimo 3 sessões anteriores compatíveis.

### Baseline robusto

Usamos a mediana:

    baseline = mediana(volumes históricos)

e o MAD:

    MAD = mediana(|volume_i - baseline|)

Escala robusta:

    escala = 1,4826 × MAD

Quando MAD = 0, usamos um fallback proporcional à raiz do baseline para evitar divisão por zero.

O robust z é:

    robust_z = (volume_atual - baseline) / escala

Para sinalizar uma anomalia, exigimos:

    robust_z >= 3

e também magnitude material:

- baseline > 0: volume atual >= 1,5 × baseline;
- baseline = 0: volume atual >= 20.

### OI zero não elimina volume

A cadeia usada no GEX continua filtrando contratos com OI > 0, porque OI zero implica contribuição GEX zero.

A análise de volume, porém, usa uma segunda visão da chain que preserva contratos válidos mesmo com OI = 0. Assim, negociação atual não é descartada apenas porque o contrato não tinha open interest positivo na base anterior.

## 21. Put / Call Ratios

Calculamos duas razões separadas:

    P/C OI = OI_puts / OI_calls

    P/C Volume = Volume_puts / Volume_calls

As razões são calculadas:

- no agregado da chain;
- por expiry;
- ao longo dos snapshots intradiários.

Interpretação puramente descritiva:

- razão > 1: mais puts que calls naquela métrica;
- razão < 1: mais calls que puts;
- razão próxima de 1: composição relativamente equilibrada.

### Importante

OI e volume medem coisas diferentes:

- **OI** = estoque de contratos abertos;
- **volume** = atividade acumulada da sessão.

Por isso o sistema não combina os dois em um único “sentimento”.

O volume usa toda a chain válida, inclusive opções com OI = 0.

## 22. Net GEX suavizado — filtro de Kalman

A série bruta de Net GEX é sempre preservada e exibida.

A suavização é opcional e utiliza um filtro de Kalman escalar:

    P = P + Q
    K = P / (P + R)
    estimativa = estimativa + K × (medida - estimativa)
    P = (1 - K) × P

onde:

- `R` é derivado da variância observada da série;
- `Q` controla a responsividade.

Perfis disponíveis:

- lenta: `Q = 0,002 × R`;
- média: `Q = 0,025 × R`;
- rápida: `Q = 0,15 × R`.

A linha filtrada:

- não substitui `net_gex`;
- não altera Walls;
- não altera Gamma Flip;
- não altera overlays ou scorecards;
- é somente uma ajuda visual para observar tendência temporal.

## 23. Contexto automático determinístico

O sistema gera texto em linguagem simples usando apenas regras explícitas.

As fontes atuais do resumo incluem:

- posição do spot em relação ao Gamma Flip;
- distância percentual para Call Wall e Put Wall;
- P/C por OI e volume;
- IV ATM, RR25 e regime da term structure;
- maior score de Gamma Gravity;
- mudança do Net GEX e Walls desde o snapshot ★ da abertura;
- status de qualidade/freshness.

O texto não usa um modelo generativo, não tenta prever a direção do mercado e não emite recomendação.

Seu objetivo é educativo: transformar números já exibidos em uma sequência legível de perguntas e observações.

## 24. Snapshot v6

Snapshots v6 passam a preservar:

- totais de OI de calls e puts;
- totais de volume de calls e puts;
- Put/Call Ratio por OI;
- Put/Call Ratio por volume;
- volume por strike/lado considerando a chain válida completa.

A separação entre contratos usados em GEX e contratos usados em atividade/volume evita que opções com OI zero distorçam o GEX ao mesmo tempo em que preserva sua negociação atual.
