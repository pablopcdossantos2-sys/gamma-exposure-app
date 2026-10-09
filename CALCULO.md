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
