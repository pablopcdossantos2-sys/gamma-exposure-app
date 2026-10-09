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

## Heatmap, vencimentos e comparação histórica

O dashboard preserva a decomposição do GEX por vencimento nas novas coletas.

- **Filtro por vencimento:** escolha “Todos os vencimentos” ou uma expiry específica. KPIs, Walls, Flip, gráfico por strike e overlays EWZ/WIN passam a refletir a seleção.
- **Heatmap Strike × Vencimento:** matriz visual do GEX líquido por strike/expiry, com intensidade proporcional a `|GEX|`.
- **Comparador de snapshots:** escolha duas leituras históricas para comparar Spot, Net GEX, Call Wall, Put Wall, Gamma Flip e o perfil de GEX por strike.
- Snapshots antigos, coletados antes dessa estrutura, continuam disponíveis em modo agregado.

O planejamento das próximas funcionalidades está em [ROADMAP.md](ROADMAP.md) quando servido no repositório GitHub, ou diretamente no arquivo `ROADMAP.md` da raiz.

## Mapa temporal, Max Pain / Expected Move e Greeks avançados

O dashboard também inclui:

- **Mapa temporal Horário × Strike:** heatmap intradiário que mostra como o GEX líquido migra entre strikes durante a sessão, com destaque da leitura mais próxima da abertura do WIN.
- **Max Pain por vencimento:** strike que minimiza o payout intrínseco agregado do expiry selecionado.
- **Expected Move:** preferencialmente pelo straddle ATM (mid call + mid put), com fallback por IV ATM quando necessário; os limites são projetados também para o WIN.
- **DEX, Vanna e Charm:** exposições por strike e vencimento, com totais agregados e gráfico selecionável.
- **Overlay avançado opcional:** Top 3 strikes por magnitude de DEX, Vanna ou Charm podem ser projetados nos gráficos EWZ/WIN.

Quando “Todos os vencimentos” está selecionado, Max Pain e Expected Move usam explicitamente o **vencimento mais próximo**. DEX/Vanna/Charm agregam a seleção inteira.

As convenções completas estão em [CALCULO.md](CALCULO.md).

## Visualização configurável das regiões de GEX

Nos gráficos de preço do EWZ e do WIN, o usuário escolhe como as regiões de Gamma Exposure serão mostradas:

- **Somente níveis principais** — padrão da ferramenta. Mostra Call Wall, Put Wall, Gamma Flip quando existir, preço de referência e maior |GEX|.
- **Faixas graduadas por intensidade** — substitui as linhas principais por bandas horizontais cuja opacidade cresce conforme a magnitude de `|GEX|`.
- **Níveis + faixas de intensidade** — combina as duas leituras.

Quando as faixas estiverem ativadas, também é possível escolher:

- quantas regiões de maior `|GEX|` mostrar: Top 3, Top 5, Top 7 ou Top 10;
- intensidade visual: suave, média ou forte.

Essas preferências são salvas no `localStorage` do navegador. O botão **Restaurar padrão** retorna para “Somente níveis principais”, Top 7 e intensidade média.

## Navegação e zoom dos gráficos de preço

Os gráficos de EWZ e WIN têm controles independentes. Em cada um deles o usuário pode:

- **X+ / X−**: aumentar ou reduzir o zoom horizontal, mostrando menos ou mais candles;
- **← / →**: navegar para candles anteriores ou posteriores;
- **Y+ / Y−**: aumentar ou reduzir o zoom vertical da escala de preço;
- **↑ / ↓**: deslocar a janela de preços para cima ou para baixo;
- **Último**: retornar ao candle mais recente sem alterar os demais níveis de zoom;
- **Resetar**: remover todo o zoom e deslocamento, retornando à visualização padrão de 130 candles.

Também há interação direta com o gráfico:

- arrastar com **mouse ou caneta** move simultaneamente a janela horizontal e a escala vertical;
- **Ctrl/⌘ + roda do mouse** controla o zoom horizontal;
- **Shift + roda do mouse** controla o zoom vertical;
- **duplo clique** restaura a visualização padrão.

Em telas touch, os botões permanecem como forma principal de navegação para não bloquear a rolagem normal da página. EWZ e WIN mantêm estados de zoom separados durante a sessão.

Os controles compactos ficam **sobre o próprio gráfico**, no canto superior direito, para aproximar a experiência de plataformas de mercado. O projeto continua usando o renderizador SVG próprio porque as bandas de intensidade de GEX são personalizadas; uma futura migração para TradingView Lightweight Charts pode ser avaliada sem alterar a camada de dados.

## Histórico intradiário de Gamma Exposure

Cada coleta real do CBOE gera agora um snapshot navegável em:

```
docs/data/gex-snapshots/AAAA-MM-DD/HHMMSS.json
```

O arquivo `docs/data/gex-snapshots/index.json` mantém o catálogo das coletas. A página oferece menus de **dia** e **horário da coleta** e, ao selecionar um snapshot:

- o gráfico de GEX usa o GEX por strike daquele momento;
- Call Wall, Put Wall, Gamma Flip e demais níveis passam a refletir aquela coleta;
- a conversão EWZ → WIN usa candles coincidentes mais próximos do horário do snapshot, e não os preços atuais;
- os gráficos de preço são deslocados para a região temporal correspondente;
- uma linha vertical identifica o momento do GEX no gráfico de preço.

A B3 informa abertura normal do WIN às **09:00 (horário de Brasília)**. Em cada dia, o índice histórico identifica automaticamente o snapshot cuja coleta ocorreu mais perto de 09:00 e o menu o destaca como **“★ abertura WIN”**.

Além da grade regular de aproximadamente 15 minutos, o GitHub Actions faz tentativas extras às **08:57** e **09:02 BRT** em dias úteis para aumentar a chance de termos uma fotografia muito próxima da abertura.

Importante: o menu diferencia o **horário em que nossa coleta ocorreu** do timestamp informado pelo CBOE. A fonte é atrasada; portanto, “coleta às 09:02” não significa que todos os dados da cadeia sejam exatamente das 09:02.

## Página didática — Entenda o GEX

A GitHub Page possui uma segunda página, `docs/entenda-gex.html`, acessível pela navegação superior em **Entenda o GEX**. Ela explica de forma progressiva:

- Delta, Gamma e Gamma Exposure;
- diferença entre regimes de gamma positivo e negativo;
- Call Wall, Put Wall, Gamma Flip e maior `|GEX|`;
- como ler o gráfico de GEX por strike;
- como funciona a projeção EWZ → WIN;
- uma rotina prática para usar GEX como contexto;
- erros comuns de interpretação, limitações e glossário.

O guia reforça que GEX é um modelo de estrutura/hedge e regime de volatilidade, não um indicador direcional isolado.

## Autoescala vertical dos gráficos de preço

Por padrão, os gráficos de EWZ e WIN usam apenas a **máxima e a mínima dos candles visíveis** para definir a escala Y. Níveis de GEX são overlays e não ampliam artificialmente a escala.

A visualização inicial:

- mantém a faixa de preço centralizada verticalmente;
- usa uma margem pequena, de aproximadamente 2,5% da amplitude dos candles em cada extremidade;
- deixa máximas e mínimas próximas das bordas superior e inferior para aproveitar melhor a altura do gráfico.

O botão **C·Y** centraliza novamente o preço no eixo vertical sem alterar o zoom horizontal ou o nível de zoom Y selecionado. O botão **Resetar** continua restaurando todos os controles do gráfico.

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
