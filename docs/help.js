/* Contextual education layer. Add data-help="<key>" to any section/card. */
(function(){
"use strict";

var TOPICS={
  "kpis":{
    title:"Resumo do Gamma Exposure",
    what:"Os cartões resumem o estado da leitura ativa: preço do EWZ, GEX líquido, Gamma Flip quando existe, Call Wall, Put Wall e outros níveis estruturais.",
    interpret:"Use-os como fotografia rápida do regime. GEX positivo/negativo fala principalmente sobre dinâmica potencial de hedge e volatilidade; Walls e Flip são referências estruturais.",
    caution:"Não trate um KPI isolado como sinal de compra ou venda. A leitura depende do vencimento selecionado, da qualidade do snapshot e das premissas do modelo."
  },
  "snapshots":{
    title:"Gamma Exposure por dia e horário",
    what:"Permite voltar a uma fotografia histórica da cadeia de opções. Cada snapshot preserva os níveis e, nas versões mais recentes, detalhes por vencimento.",
    interpret:"A leitura marcada com ★ é a coleta disponível mais próxima da abertura normal do WIN. Compare horários para observar deslocamentos de Walls, GEX e concentração por strike.",
    caution:"O horário exibido é o momento da coleta. A fonte pública é delayed; isso não significa que todos os contratos tenham negociado exatamente naquele segundo."
  },
  "quality":{
    title:"Estado dos dados",
    what:"Mostra cobertura da chain, idade técnica do timestamp, quantidade de contratos, expiries, strikes, validade de IV/bid-ask/OI e avisos dos candles EWZ/WIN.",
    interpret:"OK indica que as verificações técnicas principais passaram. Atenção pede cautela; Crítico indica que alguma parte relevante da chain está incompleta ou muito antiga.",
    caution:"Idade técnica pequena não transforma um feed delayed em real-time. Este painel mede qualidade do material recebido, não entitlement ou latência comercial do fornecedor."
  },
  "gex-strike":{
    title:"Gamma Exposure por strike",
    what:"Mostra GEX de calls, puts e líquido por strike. Linhas verticais indicam spot, Flip, Walls e outros níveis ativos.",
    interpret:"Barras maiores em |GEX| indicam maior concentração estrutural no modelo. Compare o spot com Call Wall, Put Wall e Flip e observe se a concentração está próxima ou distante.",
    caution:"Calls positivas e puts negativas são uma convenção do modelo. GEX não revela diretamente a carteira real dos dealers."
  },
  "gex-heatmap":{
    title:"Heatmap Strike × Vencimento",
    what:"Distribui o GEX por strike e por expiry. Cor indica sinal; intensidade indica magnitude de |GEX|.",
    interpret:"Use-o para descobrir qual vencimento realmente está gerando uma Wall ou concentração que parecia importante na visão agregada.",
    caution:"Expiries muito longos e muito curtos podem ter escalas econômicas diferentes. Intensidade é relativa à visualização atual."
  },
  "snapshot-compare":{
    title:"Comparação de snapshots",
    what:"Coloca duas leituras históricas lado a lado e compara spot, Net GEX, Walls, Flip e perfil por strike.",
    interpret:"Observe não apenas o valor absoluto, mas deslocamentos: uma Wall que muda de strike ou um GEX que cresce/reduz pode ser mais informativo que uma fotografia isolada.",
    caution:"Comparar dois horários do mesmo dia não transforma OI em dado intradiário. Para mudança de OI use a seção ΔOI entre sessões."
  },
  "time-map":{
    title:"Mapa temporal Horário × Strike",
    what:"Heatmap intradiário em que o eixo X é horário e o eixo Y é strike. Mostra como concentrações de GEX migram durante o dia.",
    interpret:"Procure persistência, surgimento/desaparecimento de blocos e mudanças de Walls. A coluna ★ destaca o snapshot mais próximo da abertura do WIN.",
    caution:"Uma mudança de cor pode vir de preço/gamma/IV, não necessariamente de novo open interest intradiário."
  },
  "maxpain-em":{
    title:"Max Pain + Expected Move",
    what:"Max Pain é o strike que minimiza o payout intrínseco agregado no expiry. Expected Move estima a amplitude precificada pelas opções.",
    interpret:"Use Max Pain como referência estrutural e Expected Move como faixa de volatilidade esperada. Compare ambos com Walls e preço.",
    caution:"Nenhum dos dois é alvo garantido. Max Pain é sensível ao OI; Expected Move depende de preços/IV e do vencimento."
  },
  "advanced-greeks":{
    title:"DEX · Vanna · Charm",
    what:"DEX representa notional delta do proxy. Vanna estima mudança do delta com IV; Charm estima mudança do delta com passagem do tempo.",
    interpret:"Eles ajudam a separar três mecanismos: exposição direcional, sensibilidade à volatilidade e deterioração temporal do hedge.",
    caution:"São proxies sob hipótese simplificada de dealer short das opções. Não são posições observadas."
  },
  "iv-skew":{
    title:"IV Skew + Term Structure",
    what:"Mostra IV de calls/puts por strike, IV ATM por expiry, 25Δ Risk Reversal, Butterfly e estrutura a termo.",
    interpret:"RR25 negativo significa puts 25Δ mais caras em IV que calls 25Δ. Term structure em backwardation indica IV curta acima da mais longa; contango, o oposto.",
    caution:"Skew e term structure descrevem preços relativos de volatilidade. Não são, sozinhos, previsão de direção."
  },
  "oi-delta":{
    title:"ΔOI por Strike",
    what:"Compara open interest de calls e puts entre duas sessões consecutivas e mostra onde posições abertas cresceram ou diminuíram.",
    interpret:"Aumento de OI perto de uma Wall pode reforçar a relevância estrutural daquele strike. Redução pode indicar desmontagem de inventário.",
    caution:"OI não é fluxo assinado e não identifica comprador/vendedor. O painel não usa dois horários do mesmo dia como substituto."
  },
  "stress-lab":{
    title:"Stress Lab · Market Wind Tunnel",
    what:"Simula choques de spot, IV e passagem do tempo usando o snapshot e o expiry de referência. Recalcula GEX, Walls, Flip, DEX, Vanna e Charm.",
    interpret:"Use-o para perguntas do tipo: ‘se EWZ subir 2% e a IV cair 3 pontos, quais níveis permanecem relevantes?’. Compare base e cenário, não apenas o resultado final.",
    caution:"O cenário usa dados agregados por strike e é aproximado. Não prevê o mercado, não inclui mudanças futuras de OI e não modela todas as microestruturas."
  },
  "pinning":{
    title:"Pinning / Gamma Gravity",
    what:"Ranking heurístico de strikes que combina concentração de gamma, OI, proximidade do spot e tempo até o vencimento.",
    interpret:"Scores altos indicam strikes estruturalmente mais relevantes para estudar como possíveis zonas de atração/contenção, especialmente perto do expiry.",
    caution:"Score 100 significa apenas o maior score relativo daquele vencimento. Não é probabilidade de o preço fechar naquele strike."
  },
  "scorecard":{
    title:"Scorecard histórico de Walls",
    what:"Verifica o que aconteceu depois de snapshots antigos: toque, rejeição, rompimento e tempo até interação com Call/Put Walls no EWZ e na projeção do WIN.",
    interpret:"Use taxas e tamanho de amostra para avaliar se os níveis funcionam melhor em certos contextos. Quanto maior a amostra, mais útil a comparação.",
    caution:"O scorecard usa apenas dados disponíveis após cada snapshot e evita look-ahead, mas a amostra atual depende do histórico que o projeto já acumulou."
  },
  "receipts":{
    title:"Recibos de análise",
    what:"Registra snapshot, expiry, versão do modelo, parâmetros e resultado de um cenário do Stress Lab.",
    interpret:"Use recibos para repetir uma análise, comparar hipóteses ou documentar exatamente o que foi testado naquele momento.",
    caution:"Os recibos ficam no navegador até serem exportados. Limpar dados do navegador pode removê-los; exporte JSON para arquivo externo."
  },
  "display-settings":{
    title:"Configuração dos overlays",
    what:"Controla níveis principais, faixas de intensidade de GEX e overlays opcionais de DEX/Vanna/Charm nos gráficos de preço.",
    interpret:"Comece com níveis principais. Adicione faixas/Greeks somente quando quiser investigar uma hipótese específica para evitar excesso de informação.",
    caution:"Mais overlays não significam mais qualidade de decisão. Camadas diferentes podem usar hipóteses diferentes."
  },
  "price-ewz":{
    title:"Gráfico de preço do EWZ",
    what:"Candles do EWZ com níveis calculados diretamente a partir das próprias opções do EWZ.",
    interpret:"É o gráfico de validação mais direto para Walls, Flip, Expected Move e demais níveis porque não exige conversão para outro ativo.",
    caution:"Os candles vêm de feed público e podem ser delayed. Níveis fora da escala atual não aparecem até reduzir o zoom ou mover a escala."
  },
  "price-win":{
    title:"Gráfico de preço do WIN",
    what:"Projeta níveis derivados do EWZ sobre o WIN1! usando uma razão de preços alinhados temporalmente.",
    interpret:"Use como referência operacional para estudar como o WIN reage a regiões estruturais originadas das opções do EWZ.",
    caution:"EWZ e WIN não são economicamente equivalentes. Câmbio, basis, horários e composição criam diferenças; a projeção é uma aproximação."
  },
  "levels-table":{
    title:"Leitura EWZ ↔ WIN",
    what:"Tabela consolidada dos níveis estruturais no EWZ, sua projeção para WIN e distância em relação ao spot.",
    interpret:"Ajuda a priorizar quais níveis estão próximos o suficiente para serem relevantes no horizonte analisado.",
    caution:"O ajuste manual do WIN altera a razão de conversão. Use preço compatível com o horário do snapshot selecionado."
  },
  "regions-explainer":{
    title:"Como ler as regiões",
    what:"Resumo conceitual de gamma positivo/negativo, Call Wall e Put Wall.",
    interpret:"Gamma positivo tende a ser associado a hedge amortecedor; gamma negativo pode favorecer amplificação. Walls são concentrações, não barreiras.",
    caution:"Esses efeitos são probabilísticos e dependem da hipótese de posicionamento dealer e de outras forças de mercado."
  },
  "volume-anomaly":{
    title:"Volume anômalo por contrato lógico",
    what:"Compara o volume acumulado atual de cada expiry + strike + lado (call/put) com sessões anteriores no mesmo horário aproximado.",
    interpret:"Robust z alto significa que o volume atual está muito acima da distribuição histórica daquele contrato lógico. A tabela prioriza casos com robust z ≥ 3 e magnitude material.",
    caution:"Volume é cumulativo durante o dia. Por isso o sistema só compara sessões diferentes e horários semelhantes. Com menos de três sessões anteriores compatíveis, nenhuma anomalia é declarada."
  },
  "put-call":{
    title:"Put / Call Ratios",
    what:"Mostra a razão puts/calls por open interest e por volume, tanto agregada quanto por vencimento e ao longo do dia.",
    interpret:"Valor acima de 1 significa mais puts que calls na métrica escolhida; abaixo de 1, mais calls. OI descreve estoque de posições abertas; volume descreve atividade.",
    caution:"Put/Call alto não significa automaticamente queda, e baixo não significa alta. Estrutura, vencimento, moneyness e motivo das operações importam."
  },
  "gex-smoothing":{
    title:"Net GEX suavizado",
    what:"Aplica um filtro de Kalman opcional à série temporal de Net GEX, mantendo a linha bruta sempre visível.",
    interpret:"A linha suavizada ajuda a enxergar tendência e reduzir ruído entre snapshots. Responsividade lenta filtra mais; rápida acompanha mais de perto o valor bruto.",
    caution:"O filtro é apenas visual. Ele não altera GEX, Walls, Flip ou outros cálculos e pode atrasar mudanças reais quando a suavização é forte."
  },
  "auto-context":{
    title:"Contexto automático",
    what:"Transforma métricas já calculadas em frases simples sobre regime, distância às Walls, Put/Call, IV, pinning, mudanças desde a abertura e qualidade dos dados.",
    interpret:"Use como roteiro de leitura para entender o que merece atenção antes de examinar os gráficos em detalhe.",
    caution:"O texto é determinístico, não uma previsão de IA. Ele descreve o estado atual e não recomenda compra, venda ou direção futura."
  },
  "price-confluence":{
    title:"ATR, RSI e Bandas de Bollinger",
    what:"Calcula indicadores clássicos apenas sobre os candles de EWZ ou WIN selecionados. ATR mede amplitude média, RSI mede força relativa e Bollinger mostra preço em relação à média e dispersão recente.",
    interpret:"Use como confluência independente: ATR ajuda a dimensionar volatilidade realizada, RSI mostra posição relativa do momentum e Bollinger mostra compressão/expansão e distância da média.",
    caution:"Nenhum indicador entra no cálculo de GEX. Sobrecompra/sobrevenda não significa reversão automática, e bandas não são suportes/resistências garantidos."
  },
  "weighting-models":{
    title:"OI-weighted × Volume-weighted Gamma",
    what:"Compara duas lentes diferentes: GEX por open interest representa inventário aberto; o proxy por volume pondera gamma pela atividade acumulada da sessão.",
    interpret:"Compare principalmente a forma, os strikes dominantes e a correlação entre os perfis. Divergência pode indicar atividade recente concentrada em regiões diferentes do estoque de OI.",
    caution:"Volume não é posição aberta e não deve ser somado ao OI. O proxy volume-weighted não identifica comprador/vendedor nem posição dealer real."
  },
  "guide-delta":{
    title:"Delta",
    what:"Delta mede a sensibilidade do preço da opção a uma pequena variação do ativo e funciona também como aproximação de exposição direcional.",
    interpret:"Calls normalmente têm delta positivo; puts, negativo. Valores mais próximos de ±1 indicam maior sensibilidade ao movimento do ativo.",
    caution:"Delta muda com preço, IV e tempo. Ele não é constante — justamente por isso gamma é importante."
  },
  "guide-gamma":{
    title:"Gamma",
    what:"Gamma mede quanto o delta muda quando o preço do ativo se move.",
    interpret:"Gamma alto significa que a necessidade de ajuste do hedge delta pode mudar rapidamente conforme o ativo se desloca.",
    caution:"Gamma é apenas uma sensibilidade. O efeito real no mercado depende do tamanho das posições e de quem está comprado/vendido nas opções."
  },
  "guide-gex":{
    title:"Gamma Exposure",
    what:"GEX agrega gamma, open interest, multiplicador do contrato e preço para estimar a relevância potencial do hedge por strike.",
    interpret:"Use GEX para mapear concentração estrutural e pensar em regimes de volatilidade, não como previsão direcional isolada.",
    caution:"A posição real dos dealers não é pública; o sinal depende de convenções de modelagem."
  },
  "guide-regimes":{
    title:"Gamma positivo e negativo",
    what:"Compara dois regimes teóricos de hedge: um potencialmente amortecedor e outro potencialmente amplificador.",
    interpret:"Gamma positivo costuma ser associado a venda na alta/compra na baixa por hedge; gamma negativo pode exigir compra na alta/venda na baixa.",
    caution:"É um mecanismo potencial, não uma regra. Fluxo, liquidez, macro e posicionamento real podem dominar o efeito."
  },
  "guide-chart":{
    title:"Leitura do gráfico de GEX",
    what:"O gráfico organiza a exposição por strike e separa calls, puts e resultado líquido.",
    interpret:"Concentre-se em magnitude relativa, proximidade do spot e persistência dos níveis entre snapshots.",
    caution:"Barras grandes não significam necessariamente que o preço será atraído ou rejeitado por aquele strike."
  },
  "guide-callwall":{
    title:"Call Wall",
    what:"Strike com maior concentração de GEX de calls no modelo.",
    interpret:"Pode funcionar como região estrutural importante acima ou perto do preço, especialmente quando persiste entre snapshots.",
    caution:"Não é teto garantido e pode se deslocar com preço, IV e mudanças de posicionamento."
  },
  "guide-putwall":{
    title:"Put Wall",
    what:"Strike com maior magnitude de GEX de puts no modelo.",
    interpret:"Pode atuar como região estrutural relevante abaixo ou perto do preço.",
    caution:"Não é suporte garantido. Rompimentos são possíveis e devem ser estudados no scorecard histórico."
  },
  "guide-flip":{
    title:"Gamma Flip",
    what:"Preço teórico em que o GEX agregado cruza zero.",
    interpret:"Ajuda a pensar em mudança de regime entre hedge potencialmente amortecedor e amplificador.",
    caution:"O Flip depende da modelagem de gamma e IV. Se não houver cruzamento na faixa calculada, ele pode ficar ausente."
  },
  "guide-maxgex":{
    title:"Maior |GEX|",
    what:"Strike com a maior exposição líquida absoluta.",
    interpret:"Destaca a concentração estrutural mais forte independentemente do sinal.",
    caution:"Maior magnitude não equivale a maior probabilidade de toque ou fechamento."
  },
  "guide-projection":{
    title:"Projeção EWZ → WIN",
    what:"Converte níveis do EWZ para pontos do WIN usando uma razão de preços alinhados no tempo.",
    interpret:"Serve para transportar referências estruturais do mercado de opções do EWZ para o ativo que queremos observar operacionalmente.",
    caution:"É uma aproximação. Câmbio, basis, horários e diferenças econômicas entre EWZ e WIN impedem equivalência perfeita."
  },
  "guide-routine":{
    title:"Rotina de uso",
    what:"Organiza uma sequência de leitura: snapshot, regime, níveis, posição do preço e confirmação pelo comportamento real do mercado.",
    interpret:"Trate GEX como contexto. Uma boa leitura combina estrutura das opções com preço, volatilidade e outros dados disponíveis.",
    caution:"Evite transformar uma sequência didática em sistema mecânico de entrada sem validação histórica."
  },
  "guide-misreads":{
    title:"Erros comuns",
    what:"Reúne interpretações que parecem intuitivas, mas não são suportadas pelo modelo.",
    interpret:"Use a seção como checklist mental antes de concluir que GEX positivo significa alta ou que uma Wall nunca rompe.",
    caution:"Modelos estruturais ficam perigosos quando convertidos em certezas. A principal defesa é separar hipótese, dado e conclusão."
  },
  "guide-glossary":{
    title:"Glossário",
    what:"Resume os termos mínimos necessários para navegar no dashboard.",
    interpret:"Use-o como referência rápida enquanto aprende Delta, Gamma, OI, strikes e snapshots.",
    caution:"Definições curtas simplificam conceitos. Consulte a metodologia para fórmulas e premissas completas."
  },
  "guide-sources":{
    title:"Fontes conceituais",
    what:"Aponta materiais externos e a metodologia própria do projeto para aprofundamento.",
    interpret:"Compare explicações de diferentes fontes e dê preferência às fórmulas/documentação do projeto para entender exatamente o que o dashboard calcula.",
    caution:"Projetos e fornecedores diferentes podem usar convenções de GEX distintas; resultados não são automaticamente comparáveis."
  }
};

function buildModal(){
  var overlay=document.createElement("div");overlay.className="info-modal-backdrop";overlay.hidden=true;overlay.id="infoModal";
  overlay.innerHTML='<div class="info-modal" role="dialog" aria-modal="true" aria-labelledby="infoModalTitle"><button type="button" class="info-modal-close" aria-label="Fechar">×</button><p class="section-kicker">Ajuda contextual</p><h2 id="infoModalTitle"></h2><div class="info-modal-block"><h3>O que esta seção mostra</h3><p id="infoWhat"></p></div><div class="info-modal-block"><h3>Como interpretar</h3><p id="infoInterpret"></p></div><div class="info-modal-block caution"><h3>Cuidados e limitações</h3><p id="infoCaution"></p></div><a class="info-more" href="entenda-gex.html">Abrir o guia didático completo →</a></div>';
  document.body.appendChild(overlay);
  var close=overlay.querySelector(".info-modal-close");
  function hide(){overlay.hidden=true;document.body.classList.remove("modal-open")}
  close.addEventListener("click",hide);
  overlay.addEventListener("click",function(e){if(e.target===overlay)hide()});
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!overlay.hidden)hide()});
  return{overlay:overlay,hide:hide}
}

var modal=buildModal();
function openTopic(key){
  var t=TOPICS[key];if(!t)return;
  document.getElementById("infoModalTitle").textContent=t.title;
  document.getElementById("infoWhat").textContent=t.what;
  document.getElementById("infoInterpret").textContent=t.interpret;
  document.getElementById("infoCaution").textContent=t.caution;
  modal.overlay.hidden=false;document.body.classList.add("modal-open");
  modal.overlay.querySelector(".info-modal-close").focus()
}

document.querySelectorAll("[data-help]").forEach(function(section){
  var key=section.getAttribute("data-help");if(!TOPICS[key])return;
  var btn=document.createElement("button");btn.type="button";btn.className="info-icon";btn.textContent="i";
  btn.setAttribute("aria-label","Informações sobre "+TOPICS[key].title);
  btn.title="Como interpretar esta seção";
  btn.addEventListener("click",function(){openTopic(key)});
  var heading=section.querySelector("h2");
  if(heading){heading.classList.add("heading-with-info");heading.insertAdjacentElement("afterend",btn)}
  else{btn.classList.add("info-icon-float");section.appendChild(btn)}
});

window.GEX_HELP_TOPICS=TOPICS;
})();
