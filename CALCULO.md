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
