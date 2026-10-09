# Gamma Exposure · EWZ → WIN

GitHub Page para visualizar o **Gamma Exposure (GEX) do EWZ** e projetar os níveis derivados das opções nos gráficos de preço do **EWZ** e do **mini-índice WIN1!**.

## O que a página mostra

A interface é centrada em três gráficos:

1. **Gamma Exposure por strike**, com GEX de calls, puts e líquido, além de Gamma Flip, Call Wall, Put Wall e preço do EWZ.
2. **EWZ em candles de 5 minutos**, com as principais zonas de GEX sobrepostas ao preço.
3. **WIN1! em candles de 5 minutos**, com as zonas do EWZ convertidas automaticamente para pontos do WIN.

A conversão usa:

```
razão = último WIN1! / último EWZ
nível WIN = nível EWZ × razão
```

O valor é arredondado ao múltiplo de 5 mais próximo. A página também permite um ajuste manual opcional do WIN.

## Visualização configurável das regiões de GEX

Nos gráficos de preço do EWZ e do WIN, o usuário escolhe como as regiões de Gamma Exposure serão mostradas:

- **Somente níveis principais** — padrão da ferramenta. Mostra Call Wall, Put Wall, Gamma Flip quando existir, preço de referência e maior |GEX|.
- **Faixas graduadas por intensidade** — substitui as linhas principais por bandas horizontais cuja opacidade cresce conforme a magnitude de `|GEX|`.
- **Níveis + faixas de intensidade** — combina as duas leituras.

Quando as faixas estiverem ativadas, também é possível escolher:

- quantas regiões de maior `|GEX|` mostrar: Top 3, Top 5, Top 7 ou Top 10;
- intensidade visual: suave, média ou forte.

Essas preferências são salvas no `localStorage` do navegador. O botão **Restaurar padrão** retorna para “Somente níveis principais”, Top 7 e intensidade média.

## Fontes

- **Gamma Exposure:** chain de opções do CBOE, com cálculo próprio em `collector/gex_core.py`.
- **Preço do EWZ:** `AMEX:EWZ`.
- **Preço do WIN contínuo:** `BMFBOVESPA:WIN1!`.
- Os candles são obtidos pelo feed público/anônimo do TradingView. Esse acesso é não oficial, pode ser atrasado e pode mudar; por isso a coleta de preços fica isolada em `collector/collect_prices.py`.

## Estrutura

```
collector/
  collect.py          coleta a chain do CBOE
  gex_core.py         calcula GEX, Gamma Flip e Walls
  collect_prices.py   coleta candles de EWZ e WIN1!
docs/
  index.html
  app.js
  style.css
  data/
    latest.json       último GEX
    history.json      histórico do GEX
    prices.json       candles de EWZ e WIN1!
data/raw/             respostas originais compactadas do CBOE
.github/workflows/
  collect-and-deploy.yml
CALCULO.md
```

## Atualização automática

O GitHub Actions roda em dias úteis, aproximadamente a cada 15 minutos durante a janela que cobre o pregão brasileiro e o mercado americano. Ele:

1. coleta o GEX do EWZ;
2. coleta candles de EWZ e WIN1!;
3. atualiza os JSON em `docs/data/`;
4. publica novamente a GitHub Page.

Os commits automáticos de dados **não disparam outra execução**, evitando loops do workflow.

## Rodar localmente

```
pip install -r collector/requirements.txt
python collector/collect.py --save-raw
python collector/collect_prices.py
python -m http.server 8000 --directory docs
```

Depois abra `http://localhost:8000`.

## Limitações

- O CBOE e o feed público de preços podem ter atraso.
- Open interest não é uma medida intradiária contínua; normalmente é atualizado uma vez por sessão.
- A transformação EWZ → WIN é uma **projeção de referência**, não uma equivalência econômica perfeita entre os ativos.
- GEX é um modelo de posicionamento/hedge e não revela diretamente a carteira real dos dealers.
- O feed websocket do TradingView usado para candles não é uma API oficial pública e pode exigir manutenção futura.

Conteúdo para estudo de mercado; não constitui recomendação de investimento.
