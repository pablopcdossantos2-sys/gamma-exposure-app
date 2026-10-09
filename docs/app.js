/* Dashboard GEX EWZ -> WIN. Sem bibliotecas externas. */
(function(){
"use strict";
var NS="http://www.w3.org/2000/svg",WIN_TICK=5;
var state={gex:null,liveLatest:null,prices:null,snapshotIndex:null,selectedSnapshot:null,range:.15,expiryFilter:"all",manualWin:null,viewMode:"levels",zoneCount:7,zoneOpacity:"medium",advancedMetric:"dex",advancedOverlay:"none",chartViews:{ewz:null,win:null},compareA:null,compareB:null,timeMapCache:{},timeMapLoading:null,oiCache:{},oiLoading:null,stressScenario:null,receipts:[],scorecard:null,analysisDayCache:{},volumeBaselineCache:{},smoothEnabled:false,smoothSpeed:"medium"};
var dragState=null,dragRAF=null;
var fmt0=new Intl.NumberFormat("pt-BR",{maximumFractionDigits:0});
var fmt2=new Intl.NumberFormat("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
var fmtPct=new Intl.NumberFormat("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1,signDisplay:"exceptZero"});
function $(id){return document.getElementById(id)}
function svgEl(tag,a,p){var e=document.createElementNS(NS,tag);Object.keys(a||{}).forEach(function(k){e.setAttribute(k,a[k])});if(p)p.appendChild(e);return e}
function svgText(p,x,y,s,a){var e=svgEl("text",Object.assign({x:x,y:y},a||{}),p);e.textContent=s;return e}
function cssVar(n){return "var("+n+")"}
function usd(v){if(v==null)return"—";var a=Math.abs(v),s=v<0?"−":"";if(a>=1e9)return s+"US$ "+fmt2.format(a/1e9)+" bi";if(a>=1e6)return s+"US$ "+fmt2.format(a/1e6)+" mi";if(a>=1e3)return s+"US$ "+fmt0.format(a/1e3)+" mil";return s+"US$ "+fmt0.format(a)}
function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){}}
function lastBars(key){var p=state.prices&&state.prices[key];return p&&p.bars&&p.bars.length?p.bars:[]}
function lastClose(key){var b=lastBars(key);return b.length?b[b.length-1].c:null}
function targetGexTime(){
  var t=state.gex&&Date.parse(state.gex.generated_at);
  return isFinite(t)?Math.floor(t/1000):null
}
function nearestAlignedPair(target){
  var eb=lastBars("ewz"),wb=lastBars("win");
  if(!eb.length||!wb.length)return null;
  var winByTime={};wb.forEach(function(b){winByTime[b.t]=b});
  var best=null,bestDist=Infinity;
  eb.forEach(function(e){
    var w=winByTime[e.t];if(!w)return;
    var dist=target==null?Math.abs(e.t-eb[eb.length-1].t):Math.abs(e.t-target);
    if(dist<bestDist){bestDist=dist;best={t:e.t,ewz:e,win:w,dist:dist}}
  });
  return best
}
function conversionRatio(){
  var pair=nearestAlignedPair(targetGexTime());
  var ewz=pair?pair.ewz.c:lastClose("ewz");
  if(!ewz)return null;
  if(state.manualWin&&state.manualWin>0)return state.manualWin/ewz;
  if(pair)return pair.win.c/pair.ewz.c;
  var win=lastClose("win");
  return win?win/ewz:null
}
function toWin(v){var r=conversionRatio();return v==null||!r?null:Math.round(v*r/WIN_TICK)*WIN_TICK}
function activeGex(){
  if(!state.gex)return null;
  if(state.expiryFilter==="all"||!Array.isArray(state.gex.expiry_profiles))return state.gex;
  var p=state.gex.expiry_profiles.find(function(x){return x.expiration===state.expiryFilter});
  if(!p)return state.gex;
  return Object.assign({},state.gex,p,{expiry_profiles:state.gex.expiry_profiles,generated_at:state.gex.generated_at,symbol:state.gex.symbol,demo:state.gex.demo})
}
function structureProfile(){
  if(!state.gex||!Array.isArray(state.gex.expiry_profiles)||!state.gex.expiry_profiles.length)return null;
  if(state.expiryFilter!=="all"){
    return state.gex.expiry_profiles.find(function(p){return p.expiration===state.expiryFilter})||null
  }
  return state.gex.expiry_profiles.slice().sort(function(a,b){return (a.dte||0)-(b.dte||0)})[0]
}
function metricLabel(metric){return metric==="dex"?"DEX":metric==="vanna"?"Vanna":"Charm"}
function metricColor(metric){return metric==="dex"?cssVar("--cyan"):metric==="vanna"?cssVar("--purple"):cssVar("--green")}
function niceTicks(min,max,n){var span=max-min||1,step=Math.pow(10,Math.floor(Math.log10(span/n))),err=span/n/step;step*=err>=7.5?10:err>=3.5?5:err>=1.5?2:1;var out=[],v=Math.ceil(min/step)*step;for(;v<=max+step*1e-6;v+=step)out.push(Math.abs(v)<step*1e-9?0:v);return out}
function compact(v){var a=Math.abs(v),s=v<0?"−":"";if(a>=1e9)return s+fmt2.format(a/1e9)+" bi";if(a>=1e6)return s+fmt2.format(a/1e6)+" mi";if(a>=1e3)return s+fmt0.format(a/1e3)+" mil";return s+fmt0.format(a)}
var tip=$("tip");
function showTip(ev,title,rows){tip.innerHTML="";var b=document.createElement("b");b.textContent=title;tip.appendChild(b);rows.forEach(function(r){var d=document.createElement("div");d.className="r";var a=document.createElement("span"),c=document.createElement("span");a.textContent=r[0];c.textContent=r[1];d.appendChild(a);d.appendChild(c);tip.appendChild(d)});tip.hidden=false;var x=ev.clientX+14,y=ev.clientY+14;if(x+tip.offsetWidth>innerWidth-8)x=ev.clientX-tip.offsetWidth-14;if(y+tip.offsetHeight>innerHeight-8)y=ev.clientY-tip.offsetHeight-14;tip.style.left=Math.max(8,x)+"px";tip.style.top=Math.max(8,y)+"px"}
function hideTip(){tip.hidden=true}
function legend(id,items){var box=$(id);box.innerHTML="";items.forEach(function(it){var s=document.createElement("span"),i=document.createElement("i");i.style.background=it.color;if(it.cls)i.className=it.cls;if(it.dash){i.className="dash";i.style.color=it.color} s.appendChild(i);s.appendChild(document.createTextNode(it.name));box.appendChild(s)})}

function levelRows(){
  var d=activeGex(),s=structureProfile();
  var rows=[
    {name:"Call Wall",v:d.call_wall,color:cssVar("--blue"),note:"Maior GEX de calls; resistência/oferta potencial."},
    {name:"Gamma Flip",v:d.flip,color:cssVar("--purple"),note:"Divisor entre regime de gamma positivo e negativo."},
    {name:"Preço EWZ do GEX",v:d.spot,color:cssVar("--text"),note:"Preço de referência usado no cálculo do GEX."},
    {name:"Put Wall",v:d.put_wall,color:cssVar("--orange"),note:"Maior magnitude de GEX de puts; suporte/demanda potencial."},
    {name:"Maior |GEX|",v:d.max_abs_strike,color:cssVar("--cyan"),note:"Strike com maior GEX líquido absoluto."}
  ];
  if(s&&s.max_pain!=null)rows.push({name:"Max Pain",v:s.max_pain,color:cssVar("--axis"),note:"Strike que minimiza o payout intrínseco agregado no vencimento de referência."});
  if(s&&s.expected_low!=null)rows.push({name:"Expected Move −",v:s.expected_low,color:cssVar("--cyan"),note:"Limite inferior do expected move do vencimento de referência."});
  if(s&&s.expected_high!=null)rows.push({name:"Expected Move +",v:s.expected_high,color:cssVar("--cyan"),note:"Limite superior do expected move do vencimento de referência."});
  return rows
}
function regime(d){if(d.flip==null)return d.net_gex>=0?"Gamma líquido positivo":"Gamma líquido negativo";return d.spot>=d.flip?"EWZ acima do Flip · gamma positivo":"EWZ abaixo do Flip · gamma negativo"}
function renderHeader(){
  var d=state.gex,p=state.prices,r=conversionRatio(),gtime=new Date(d.generated_at);
  $("status").textContent="GEX "+gtime.toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})+(p&&p.generated_at?" · preços "+new Date(p.generated_at).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):"");
  $("demoBanner").hidden=!d.demo;
  $("ratioValue").textContent=r?fmt2.format(r)+" pts/US$":"indisponível";
  $("ratioHint").textContent=state.manualWin?"ajuste manual ativo":"candles coincidentes de WIN1! e EWZ";
  var ewzp=p&&p.ewz,winp=p&&p.win;
  $("ewzMeta").textContent="AMEX:EWZ"+(ewzp&&ewzp.last_bar_at?" · último candle "+new Date(ewzp.last_bar_at).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):"")+(ewzp&&ewzp.stale?" · dados anteriores":"");
  $("winMeta").textContent="BMFBOVESPA:WIN1!"+(winp&&winp.last_bar_at?" · último candle "+new Date(winp.last_bar_at).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):"")+(winp&&winp.stale?" · dados anteriores":"")
}
function snapshotEntries(){
  return state.snapshotIndex&&Array.isArray(state.snapshotIndex.snapshots)?state.snapshotIndex.snapshots:[]
}
function currentSnapshotEntry(){
  if(state.selectedSnapshot)return state.selectedSnapshot;
  var ga=state.gex&&state.gex.generated_at;
  return snapshotEntries().find(function(s){return s.generated_at===ga})||null
}
function renderSnapshotControls(){
  var dateSel=$("snapshotDateSelect"),timeSel=$("snapshotTimeSelect");
  if(!dateSel||!timeSel)return;
  var entries=snapshotEntries(),current=currentSnapshotEntry();
  if(!entries.length){
    dateSel.innerHTML='<option>Sem histórico</option>';timeSel.innerHTML='<option>—</option>';
    dateSel.disabled=true;timeSel.disabled=true;$("snapshotMeta").textContent="O histórico será criado nas próximas coletas.";return
  }
  dateSel.disabled=false;timeSel.disabled=false;
  var dates=[];entries.forEach(function(e){if(dates.indexOf(e.local_date)<0)dates.push(e.local_date)});
  dates.sort().reverse();
  var desiredDate=current?current.local_date:dates[0];
  dateSel.innerHTML="";
  dates.forEach(function(d){var o=document.createElement("option");o.value=d;o.textContent=new Date(d+"T12:00:00").toLocaleDateString("pt-BR");dateSel.appendChild(o)});
  dateSel.value=dates.indexOf(desiredDate)>=0?desiredDate:dates[0];
  populateSnapshotTimes(dateSel.value,current&&current.local_date===dateSel.value?current.generated_at:null)
}
function populateSnapshotTimes(day,selectedGeneratedAt){
  var timeSel=$("snapshotTimeSelect"),items=snapshotEntries().filter(function(e){return e.local_date===day}).sort(function(a,b){return a.local_time.localeCompare(b.local_time)});
  timeSel.innerHTML="";
  items.forEach(function(e){
    var o=document.createElement("option");o.value=e.generated_at;
    var hm=e.local_time.slice(0,5);
    o.textContent=(e.is_win_open_reference?"★ ":"")+hm+(e.is_win_open_reference?" — abertura WIN":"");
    timeSel.appendChild(o)
  });
  var chosen=items.find(function(e){return e.generated_at===selectedGeneratedAt})||items.find(function(e){return e.is_win_open_reference})||items[items.length-1];
  if(chosen){timeSel.value=chosen.generated_at;updateSnapshotSummary(chosen)}
}
function updateSnapshotSummary(entry){
  var badge=$("snapshotBadge"),title=$("snapshotTitle"),meta=$("snapshotMeta");
  if(!entry){badge.textContent="Leitura atual";badge.classList.remove("opening");title.textContent="Mais recente";meta.textContent="Dados mais recentes disponíveis.";return}
  badge.classList.toggle("opening",!!entry.is_win_open_reference);
  badge.textContent=entry.is_win_open_reference?"★ Abertura WIN":"Histórico";
  title.textContent=new Date(entry.local_date+"T12:00:00").toLocaleDateString("pt-BR")+" · "+entry.local_time.slice(0,5);
  var cboe=entry.cboe_timestamp?" · dado CBOE: "+entry.cboe_timestamp:"";
  meta.textContent="Coleta: "+entry.local_time+" BRT"+cboe+(entry.is_win_open_reference?" · snapshot disponível mais próximo de 09:00":"")
}
function focusChartsOnTimestamp(ts){
  ["ewz","win"].forEach(function(key){
    var bars=lastBars(key);if(!bars.length)return;
    var target=Math.floor(Date.parse(ts)/1000),idx=0,best=Infinity;
    bars.forEach(function(b,i){var d=Math.abs(b.t-target);if(d<best){best=d;idx=i}});
    var v=chartView(key,bars.length),after=Math.round(v.count*.28);
    v.end=clamp(idx+after,v.count,bars.length);v.yPan=0
  })
}
function loadSnapshotEntry(entry){
  if(!entry)return Promise.resolve();
  return getJson(entry.file).then(function(d){
    state.gex=d;state.selectedSnapshot=entry;focusChartsOnTimestamp(entry.generated_at);renderAll()
  }).catch(function(err){
    var b=$("errorBanner");b.hidden=false;b.textContent="Não foi possível carregar o snapshot selecionado: "+err.message
  })
}
function selectLatestSnapshot(){
  state.gex=state.liveLatest;state.selectedSnapshot=null;
  var latest=snapshotEntries().find(function(e){return e.generated_at===state.liveLatest.generated_at});
  if(latest)state.selectedSnapshot=latest;
  resetChartView("ewz");resetChartView("win");renderAll()
}
function renderKpis(){
  var d=activeGex(),b=$("kpis");b.innerHTML="";
  [
    ["EWZ / regime","US$ "+fmt2.format(d.spot),regime(d),cssVar("--text")],
    ["GEX líquido",usd(d.net_gex),d.n_contracts+" contratos",cssVar("--cyan")],
    ["Call Wall","US$ "+fmt2.format(d.call_wall),"WIN "+(toWin(d.call_wall)==null?"—":fmt0.format(toWin(d.call_wall))),cssVar("--blue")],
    ["Gamma Flip",d.flip==null?"—":"US$ "+fmt2.format(d.flip),d.flip==null?"sem cruzamento":toWin(d.flip)==null?"WIN —":"WIN "+fmt0.format(toWin(d.flip)),cssVar("--purple")],
    ["Put Wall","US$ "+fmt2.format(d.put_wall),"WIN "+(toWin(d.put_wall)==null?"—":fmt0.format(toWin(d.put_wall))),cssVar("--orange")]
  ].forEach(function(it){var k=document.createElement("div");k.className="kpi";var l=document.createElement("div");l.className="lab";var dot=document.createElement("i");dot.className="dot";dot.style.background=it[3];l.appendChild(dot);l.appendChild(document.createTextNode(it[0]));var big=document.createElement("div");big.className="big";big.textContent=it[1];var sm=document.createElement("div");sm.className="small";sm.textContent=it[2];k.appendChild(l);k.appendChild(big);k.appendChild(sm);b.appendChild(k)})
}
function renderTable(){
  var d=activeGex(),t=document.querySelector("#levelsTable tbody");t.innerHTML="";
  levelRows().forEach(function(r){var tr=document.createElement("tr"),dist=r.v==null?"—":r.name==="Preço EWZ do GEX"?"—":fmtPct.format((r.v/d.spot-1)*100)+"%";[
    r.name,r.v==null?"—":"US$ "+fmt2.format(r.v),toWin(r.v)==null?"—":fmt0.format(toWin(r.v)),dist,r.note
  ].forEach(function(v,i){var td=document.createElement("td");if(i===1||i===2||i===3)td.className="num";if(i===0){var dot=document.createElement("i");dot.className="dot";dot.style.background=r.color;dot.style.marginRight="7px";td.appendChild(dot)}td.appendChild(document.createTextNode(v));tr.appendChild(td)});t.appendChild(tr)})
}

function chartGex(){
  var d=activeGex(),host=$("chartGex");host.innerHTML="";
  var lo=d.spot*(1-state.range),hi=d.spot*(1+state.range),rows=d.strikes.filter(function(s){return s.k>=lo&&s.k<=hi});
  if(!rows.length){host.textContent="Sem strikes nessa faixa.";return}
  var W=1220,H=410,m={l:76,r:22,t:32,b:55},svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Gamma Exposure por strike"},host);
  var ks=rows.map(function(r){return r.k}),gap=Infinity;for(var i=1;i<ks.length;i++)gap=Math.min(gap,ks[i]-ks[i-1]);if(!isFinite(gap))gap=1;
  var xmin=Math.min.apply(null,ks)-gap,xmax=Math.max.apply(null,ks)+gap,vmax=Math.max.apply(null,rows.map(function(r){return Math.max(Math.abs(r.call),Math.abs(r.put),Math.abs(r.net))}))*1.12||1;
  var x=function(v){return m.l+(v-xmin)/(xmax-xmin)*(W-m.l-m.r)},y=function(v){return m.t+(1-(v+vmax)/(2*vmax))*(H-m.t-m.b)};
  niceTicks(-vmax,vmax,6).forEach(function(t){svgEl("line",{x1:m.l,x2:W-m.r,y1:y(t),y2:y(t),class:t===0?"axis":"grid"},svg);svgText(svg,m.l-9,y(t)+4,compact(t),{"text-anchor":"end"})});
  niceTicks(xmin,xmax,10).forEach(function(t){svgText(svg,x(t),H-m.b+17,fmt2.format(t),{"text-anchor":"middle"})});
  var bw=Math.max(5,Math.min(32,(x(xmin+gap)-x(xmin))*.62));
  rows.forEach(function(r){var cx=x(r.k);if(r.call>0)svgEl("rect",{x:cx-bw/2,y:y(r.call),width:bw,height:y(0)-y(r.call),rx:2,fill:cssVar("--blue"),"fill-opacity":.88},svg);if(r.put<0)svgEl("rect",{x:cx-bw/2,y:y(0),width:bw,height:y(r.put)-y(0),rx:2,fill:cssVar("--orange"),"fill-opacity":.88},svg)});
  var netPath=rows.map(function(r,i){return(i?"L":"M")+x(r.k).toFixed(1)+" "+y(r.net).toFixed(1)}).join(" ");svgEl("path",{d:netPath,fill:"none",stroke:cssVar("--text"),"stroke-width":1.8},svg);
  rows.forEach(function(r){svgEl("circle",{cx:x(r.k),cy:y(r.net),r:3.5,fill:cssVar("--text"),stroke:cssVar("--surface"),"stroke-width":1.5},svg)});
  [
    {v:d.spot,name:"EWZ",c:cssVar("--text"),dash:""},
    {v:d.flip,name:"Gamma Flip",c:cssVar("--purple"),dash:"7 4"},
    {v:d.call_wall,name:"Call Wall",c:cssVar("--blue"),dash:"4 3"},
    {v:d.put_wall,name:"Put Wall",c:cssVar("--orange"),dash:"4 3"}
  ].forEach(function(a,idx){if(a.v==null||a.v<xmin||a.v>xmax)return;var xx=x(a.v);svgEl("line",{x1:xx,x2:xx,y1:m.t,y2:H-m.b,stroke:a.c,"stroke-width":idx<2?2:1.4,"stroke-dasharray":a.dash},svg);svgText(svg,xx+4,m.t+13+idx*13,a.name+" "+fmt2.format(a.v),{class:"lbl",style:"fill:"+a.c})});
  var cw=Math.max(10,x(xmin+gap)-x(xmin));rows.forEach(function(r){var h=svgEl("rect",{x:x(r.k)-cw/2,y:m.t,width:cw,height:H-m.t-m.b,class:"hit"},svg);h.addEventListener("pointermove",function(e){showTip(e,"Strike US$ "+fmt2.format(r.k),[["Calls",usd(r.call)],["Puts",usd(r.put)],["Líquido",usd(r.net)],["WIN",toWin(r.k)==null?"—":fmt0.format(toWin(r.k))]])});h.addEventListener("pointerleave",hideTip)});
  svgText(svg,m.l,H-7,"Strike do EWZ (US$)",{style:"fill:"+cssVar("--muted")});
  legend("legendGex",[{name:"GEX calls (+)",color:cssVar("--blue"),cls:"sq"},{name:"GEX puts (−)",color:cssVar("--orange"),cls:"sq"},{name:"GEX líquido",color:cssVar("--text")},{name:"Gamma Flip",color:cssVar("--purple"),dash:true}])
}


function renderExpiryControls(){
  var sel=$("expirySelect"),status=$("heatmapStatus");
  if(!sel)return;
  var profiles=state.gex&&Array.isArray(state.gex.expiry_profiles)?state.gex.expiry_profiles.slice():[];
  profiles.sort(function(a,b){return (a.dte||0)-(b.dte||0)});
  sel.innerHTML="";
  var all=document.createElement("option");all.value="all";all.textContent="Todos os vencimentos";sel.appendChild(all);
  if(!profiles.length){
    state.expiryFilter="all";sel.value="all";sel.disabled=true;
    all.textContent="Todos (snapshot sem detalhe por vencimento)";
    if(status)status.textContent="Disponível a partir das novas coletas";
    return
  }
  sel.disabled=false;
  profiles.forEach(function(p){
    var o=document.createElement("option");o.value=p.expiration;
    var d=new Date(p.expiration+"T12:00:00");
    o.textContent=d.toLocaleDateString("pt-BR")+" · "+p.dte+" DTE · "+p.n_contracts+" contratos";
    sel.appendChild(o)
  });
  if(!profiles.some(function(p){return p.expiration===state.expiryFilter}))state.expiryFilter="all";
  sel.value=state.expiryFilter;
  if(status)status.textContent=profiles.length+" vencimentos · "+(state.expiryFilter==="all"?"visão agregada":"filtro "+new Date(state.expiryFilter+"T12:00:00").toLocaleDateString("pt-BR"))
}

function chartHeatmap(){
  var host=$("gexHeatmap");if(!host)return;host.innerHTML="";
  var g=state.gex,profiles=g&&Array.isArray(g.expiry_profiles)?g.expiry_profiles.slice():[];
  if(!profiles.length){host.innerHTML='<p class="note heatmap-empty">Este snapshot não possui decomposição por vencimento. Os novos snapshots coletados passarão a armazená-la automaticamente.</p>';return}
  profiles.sort(function(a,b){return (a.dte||0)-(b.dte||0)});
  var lo=g.spot*(1-state.range),hi=g.spot*(1+state.range),strikeSet={};
  profiles.forEach(function(p){(p.strikes||[]).forEach(function(s){if(s.k>=lo&&s.k<=hi)strikeSet[s.k]=true})});
  var strikes=Object.keys(strikeSet).map(Number).sort(function(a,b){return b-a});
  if(!strikes.length){host.innerHTML='<p class="note">Sem strikes na faixa selecionada.</p>';return}
  var cellW=64,cellH=22,m={l:68,r:16,t:92,b:24},W=Math.max(900,m.l+m.r+profiles.length*cellW),H=m.t+m.b+strikes.length*cellH;
  var svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,width:W,height:H,role:"img","aria-label":"Heatmap GEX por strike e vencimento"},host);
  var valueMap={},maxAbs=1;
  profiles.forEach(function(p,pi){
    var by={};(p.strikes||[]).forEach(function(s){by[s.k]=s;if(s.k>=lo&&s.k<=hi)maxAbs=Math.max(maxAbs,Math.abs(s.net||0))});
    valueMap[pi]=by
  });
  profiles.forEach(function(p,pi){
    var cx=m.l+pi*cellW+cellW/2,label=new Date(p.expiration+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});
    var t=svgText(svg,cx,m.t-12,label,{"text-anchor":"end",class:"heat-label"});t.setAttribute("transform","rotate(-55 "+cx+" "+(m.t-12)+")");
    svgText(svg,cx,m.t-2,p.dte+"d",{"text-anchor":"middle",style:"fill:"+cssVar("--muted")});
    if(state.expiryFilter===p.expiration)svgEl("rect",{x:m.l+pi*cellW+1,y:m.t-1,width:cellW-2,height:strikes.length*cellH+2,fill:"none",stroke:cssVar("--purple"),"stroke-width":2,rx:3},svg)
  });
  strikes.forEach(function(k,ri){
    var yy=m.t+ri*cellH;
    svgText(svg,m.l-8,yy+cellH*.68,fmt2.format(k),{"text-anchor":"end",class:"lbl"});
    profiles.forEach(function(p,pi){
      var s=valueMap[pi][k]||{net:0,call:0,put:0},abs=Math.abs(s.net||0),strength=abs/maxAbs;
      var color=s.net>0?cssVar("--blue"):s.net<0?cssVar("--orange"):cssVar("--grid");
      var opacity=s.net===0?.08:(.14+.76*strength);
      var rect=svgEl("rect",{x:m.l+pi*cellW+2,y:yy+2,width:cellW-4,height:cellH-4,rx:3,fill:color,"fill-opacity":opacity.toFixed(3),stroke:cssVar("--border"),"stroke-width":.5},svg);
      rect.addEventListener("pointermove",function(e){showTip(e,new Date(p.expiration+"T12:00:00").toLocaleDateString("pt-BR")+" · Strike "+fmt2.format(k),[["DTE",String(p.dte)],["GEX líquido",usd(s.net||0)],["Calls",usd(s.call||0)],["Puts",usd(s.put||0)]])});
      rect.addEventListener("pointerleave",hideTip)
    })
  });
  svgText(svg,8,m.t-10,"Strike", {class:"lbl"});
}

function compareOptionLabel(e){
  return new Date(e.local_date+"T12:00:00").toLocaleDateString("pt-BR")+" · "+e.local_time.slice(0,5)+(e.is_win_open_reference?" · ★ abertura":"")
}
function renderCompareControls(){
  var aSel=$("compareASelect"),bSel=$("compareBSelect");if(!aSel||!bSel)return;
  var entries=snapshotEntries();if(!entries.length){aSel.innerHTML="<option>Sem histórico</option>";bSel.innerHTML="<option>Sem histórico</option>";aSel.disabled=true;bSel.disabled=true;$("compareBtn").disabled=true;return}
  aSel.disabled=false;bSel.disabled=false;$("compareBtn").disabled=false;
  var keepA=aSel.value,keepB=bSel.value;
  aSel.innerHTML="";bSel.innerHTML="";
  entries.forEach(function(e){
    [aSel,bSel].forEach(function(sel){var o=document.createElement("option");o.value=e.generated_at;o.textContent=compareOptionLabel(e);sel.appendChild(o)})
  });
  var opening=entries.find(function(e){return e.is_win_open_reference})||entries[entries.length-1],latest=entries[0];
  aSel.value=entries.some(function(e){return e.generated_at===keepA})?keepA:opening.generated_at;
  bSel.value=entries.some(function(e){return e.generated_at===keepB})?keepB:latest.generated_at
}
function loadCompare(){
  var aKey=$("compareASelect").value,bKey=$("compareBSelect").value,entries=snapshotEntries();
  var ae=entries.find(function(e){return e.generated_at===aKey}),be=entries.find(function(e){return e.generated_at===bKey});
  if(!ae||!be)return;
  $("compareBtn").disabled=true;$("compareBtn").textContent="Carregando…";
  Promise.all([getJson(ae.file),getJson(be.file)]).then(function(r){
    state.compareA={entry:ae,data:r[0]};state.compareB={entry:be,data:r[1]};renderComparison()
  }).catch(function(err){var b=$("errorBanner");b.hidden=false;b.textContent="Falha ao comparar snapshots: "+err.message})
    .finally(function(){$("compareBtn").disabled=false;$("compareBtn").textContent="Comparar"})
}
function renderComparison(){
  var box=$("compareSummary"),host=$("compareChart");if(!box||!host)return;
  if(!state.compareA||!state.compareB){box.innerHTML='<p class="note">Escolha dois snapshots e clique em Comparar.</p>';host.innerHTML="";return}
  var A=state.compareA.data,B=state.compareB.data,ae=state.compareA.entry,be=state.compareB.entry;
  box.innerHTML="";
  var metrics=[
    ["Spot",A.spot,B.spot,function(v){return "US$ "+fmt2.format(v)}],
    ["GEX líquido",A.net_gex,B.net_gex,usd],
    ["Call Wall",A.call_wall,B.call_wall,function(v){return v==null?"—":fmt2.format(v)}],
    ["Put Wall",A.put_wall,B.put_wall,function(v){return v==null?"—":fmt2.format(v)}],
    ["Gamma Flip",A.flip,B.flip,function(v){return v==null?"—":fmt2.format(v)}]
  ];
  metrics.forEach(function(m){
    var card=document.createElement("div");card.className="compare-metric";
    var title=document.createElement("span");title.textContent=m[0];
    var vals=document.createElement("strong");vals.textContent=m[3](m[1])+" → "+m[3](m[2]);
    var delta=document.createElement("small");
    if(m[1]!=null&&m[2]!=null){var dv=m[2]-m[1];delta.textContent="Δ "+(m[0]==="GEX líquido"?usd(dv):fmt2.format(dv))}
    else delta.textContent="Δ —";
    card.appendChild(title);card.appendChild(vals);card.appendChild(delta);box.appendChild(card)
  });
  legend("compareLegend",[{name:"A · "+ae.local_time.slice(0,5),color:cssVar("--purple")},{name:"B · "+be.local_time.slice(0,5),color:cssVar("--blue")},{name:"Δ B−A",color:cssVar("--cyan"),cls:"sq"}]);
  host.innerHTML="";
  var mapA={},mapB={};(A.strikes||[]).forEach(function(s){mapA[s.k]=s.net||0});(B.strikes||[]).forEach(function(s){mapB[s.k]=s.net||0});
  var center=B.spot||A.spot,lo=center*(1-state.range),hi=center*(1+state.range);
  var ks=Object.keys(Object.assign({},mapA,mapB)).map(Number).filter(function(k){return k>=lo&&k<=hi}).sort(function(a,b){return a-b});
  if(ks.length<2){host.innerHTML='<p class="note">Sem strikes suficientes para comparar nessa faixa.</p>';return}
  var W=1220,H=360,m={l:78,r:20,t:22,b:48},vals=[];ks.forEach(function(k){vals.push(mapA[k]||0,mapB[k]||0,(mapB[k]||0)-(mapA[k]||0))});
  var vmax=Math.max.apply(null,vals.map(Math.abs))*1.12||1,x=function(i){return m.l+i/(ks.length-1)*(W-m.l-m.r)},y=function(v){return m.t+(1-(v+vmax)/(2*vmax))*(H-m.t-m.b)};
  var svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Comparação de perfis GEX"},host);
  niceTicks(-vmax,vmax,6).forEach(function(t){svgEl("line",{x1:m.l,x2:W-m.r,y1:y(t),y2:y(t),class:t===0?"axis":"grid"},svg);svgText(svg,m.l-9,y(t)+4,compact(t),{"text-anchor":"end"})});
  var step=(W-m.l-m.r)/(ks.length-1),bw=Math.max(3,Math.min(18,step*.45));
  ks.forEach(function(k,i){var diff=(mapB[k]||0)-(mapA[k]||0),yy=y(diff);svgEl("rect",{x:x(i)-bw/2,y:Math.min(y(0),yy),width:bw,height:Math.max(1,Math.abs(yy-y(0))),fill:cssVar("--cyan"),"fill-opacity":.18},svg)});
  function pathFor(map){return ks.map(function(k,i){return(i?"L":"M")+x(i).toFixed(1)+" "+y(map[k]||0).toFixed(1)}).join(" ")}
  svgEl("path",{d:pathFor(mapA),fill:"none",stroke:cssVar("--purple"),"stroke-width":2},svg);
  svgEl("path",{d:pathFor(mapB),fill:"none",stroke:cssVar("--blue"),"stroke-width":2},svg);
  var every=Math.max(1,Math.ceil(ks.length/10));ks.forEach(function(k,i){if(i%every===0||i===ks.length-1)svgText(svg,x(i),H-m.b+17,fmt2.format(k),{"text-anchor":"middle"})});
  ks.forEach(function(k,i){var hit=svgEl("rect",{x:x(i)-step/2,y:m.t,width:Math.max(8,step),height:H-m.t-m.b,class:"hit"},svg);hit.addEventListener("pointermove",function(e){showTip(e,"Strike "+fmt2.format(k),[["A",usd(mapA[k]||0)],["B",usd(mapB[k]||0)],["Δ B−A",usd((mapB[k]||0)-(mapA[k]||0))]])});hit.addEventListener("pointerleave",hideTip)})
}


function renderStructure(){
  var p=structureProfile(),box=$("structureKpis"),scale=$("structureScale"),badge=$("structureExpiryBadge"),note=$("structureNote");
  if(!box||!scale)return;
  box.innerHTML="";scale.innerHTML="";
  if(!p||p.max_pain==null||p.expected_move==null){
    badge.textContent="sem dados A4";
    note.textContent="Este snapshot foi criado antes das métricas de Max Pain/Expected Move ou não possui quotes suficientes. Novas coletas passam a armazenar esses valores.";
    return
  }
  var expLabel=new Date(p.expiration+"T12:00:00").toLocaleDateString("pt-BR");
  badge.textContent=expLabel+" · "+p.dte+" DTE";
  var metrics=[
    ["Max Pain","US$ "+fmt2.format(p.max_pain),"WIN "+(toWin(p.max_pain)==null?"—":fmt0.format(toWin(p.max_pain)))],
    ["Expected Move","± US$ "+fmt2.format(p.expected_move),fmt2.format(p.expected_move_pct||0)+"% do spot"],
    ["Faixa EWZ","US$ "+fmt2.format(p.expected_low)+" – "+fmt2.format(p.expected_high),"ATM "+fmt2.format(p.atm_strike||p.spot)],
    ["Faixa WIN",toWin(p.expected_low)==null?"—":fmt0.format(toWin(p.expected_low))+" – "+fmt0.format(toWin(p.expected_high)),"projeção EWZ → WIN"]
  ];
  metrics.forEach(function(m){var d=document.createElement("div");d.className="structure-kpi";var a=document.createElement("span");a.textContent=m[0];var b=document.createElement("strong");b.textContent=m[1];var s=document.createElement("small");s.textContent=m[2];d.appendChild(a);d.appendChild(b);d.appendChild(s);box.appendChild(d)});
  var vals=[p.expected_low,p.expected_high,p.max_pain,p.spot,p.call_wall,p.put_wall].filter(function(v){return v!=null});
  var lo=Math.min.apply(null,vals),hi=Math.max.apply(null,vals),pad=(hi-lo)*.08||.5;lo-=pad;hi+=pad;
  var W=1000,H=100,m={l:38,r:38,t:18,b:28},svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Expected Move e Max Pain"},scale);
  var x=function(v){return m.l+(v-lo)/(hi-lo)*(W-m.l-m.r)};
  svgEl("line",{x1:m.l,x2:W-m.r,y1:48,y2:48,stroke:cssVar("--axis"),"stroke-width":2},svg);
  svgEl("rect",{x:x(p.expected_low),y:34,width:Math.max(2,x(p.expected_high)-x(p.expected_low)),height:28,rx:8,fill:cssVar("--cyan"),"fill-opacity":.15},svg);
  [
    ["EM−",p.expected_low,cssVar("--cyan")],["Put",p.put_wall,cssVar("--orange")],["Spot",p.spot,cssVar("--text")],
    ["Max Pain",p.max_pain,cssVar("--axis")],["Call",p.call_wall,cssVar("--blue")],["EM+",p.expected_high,cssVar("--cyan")]
  ].forEach(function(it,i){if(it[1]==null)return;var xx=x(it[1]);svgEl("line",{x1:xx,x2:xx,y1:26,y2:70,stroke:it[2],"stroke-width":it[0]==="Spot"?2:1.4,"stroke-dasharray":it[0]==="Max Pain"?"4 3":""},svg);svgText(svg,xx,i%2?84:18,it[0]+" "+fmt2.format(it[1]),{"text-anchor":"middle",class:"lbl",style:"fill:"+it[2]})});
  note.textContent=(p.expected_move_source==="atm_straddle_mid"?"Expected Move pelo straddle ATM (mid call + mid put).":"Expected Move pelo fallback de IV ATM (1σ).")+" Max Pain minimiza o payout intrínseco agregado naquele vencimento; é referência estrutural, não previsão."
}

function renderAdvanced(){
  var d=activeGex(),box=$("advancedKpis"),host=$("advancedExposureChart");
  if(!box||!host)return;box.innerHTML="";host.innerHTML="";
  if(d.net_dex==null||!d.strikes||!d.strikes.some(function(s){return s.dex!=null})){
    box.innerHTML='<p class="note">Este snapshot ainda não possui DEX/Vanna/Charm. As novas coletas passam a armazenar essas exposições.</p>';return
  }
  [
    ["Net DEX",usd(d.net_dex),"notional delta"],
    ["Net Vanna",usd(d.net_vanna),"por +1 vol point"],
    ["Net Charm",usd(d.net_charm),"por 1 dia decorrido"]
  ].forEach(function(m){var k=document.createElement("div");k.className="advanced-kpi";var a=document.createElement("span");a.textContent=m[0];var b=document.createElement("strong");b.textContent=m[1];var s=document.createElement("small");s.textContent=m[2];k.appendChild(a);k.appendChild(b);k.appendChild(s);box.appendChild(k)});
  var metric=state.advancedMetric,lo=d.spot*(1-state.range),hi=d.spot*(1+state.range),rows=d.strikes.filter(function(s){return s.k>=lo&&s.k<=hi});
  if(!rows.length)return;
  var W=1220,H=330,m={l:78,r:18,t:24,b:48},vmax=Math.max.apply(null,rows.map(function(s){return Math.abs(s[metric]||0)}))*1.12||1;
  var svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":metricLabel(metric)+" por strike"},host);
  var x=function(i){return m.l+i/Math.max(1,rows.length-1)*(W-m.l-m.r)},y=function(v){return m.t+(1-(v+vmax)/(2*vmax))*(H-m.t-m.b)};
  niceTicks(-vmax,vmax,6).forEach(function(t){svgEl("line",{x1:m.l,x2:W-m.r,y1:y(t),y2:y(t),class:t===0?"axis":"grid"},svg);svgText(svg,m.l-9,y(t)+4,compact(t),{"text-anchor":"end"})});
  var step=(W-m.l-m.r)/Math.max(1,rows.length-1),bw=Math.max(4,Math.min(22,step*.56)),col=metricColor(metric);
  rows.forEach(function(s,i){var v=s[metric]||0,yy=y(v);svgEl("rect",{x:x(i)-bw/2,y:Math.min(y(0),yy),width:bw,height:Math.max(1,Math.abs(yy-y(0))),fill:col,"fill-opacity":.72,rx:2},svg)});
  var every=Math.max(1,Math.ceil(rows.length/10));rows.forEach(function(s,i){if(i%every===0||i===rows.length-1)svgText(svg,x(i),H-m.b+17,fmt2.format(s.k),{"text-anchor":"middle"})});
  rows.forEach(function(s,i){var hit=svgEl("rect",{x:x(i)-step/2,y:m.t,width:Math.max(8,step),height:H-m.t-m.b,class:"hit"},svg);hit.addEventListener("pointermove",function(e){showTip(e,"Strike "+fmt2.format(s.k),[[metricLabel(metric),usd(s[metric]||0)],["DEX",usd(s.dex||0)],["Vanna",usd(s.vanna||0)],["Charm",usd(s.charm||0)]])});hit.addEventListener("pointerleave",hideTip)});
  legend("advancedLegend",[{name:metricLabel(metric)+" net por strike",color:col,cls:"sq"},{name:"positivo",color:col},{name:"negativo",color:cssVar("--axis")}])
}

function renderTimeMapControls(){
  var sel=$("timeMapDateSelect");if(!sel)return;
  var dates=[];snapshotEntries().forEach(function(e){if(dates.indexOf(e.local_date)<0)dates.push(e.local_date)});dates.sort().reverse();
  var keep=sel.value,current=currentSnapshotEntry(),preferred=current?current.local_date:(dates[0]||"");
  sel.innerHTML="";dates.forEach(function(d){var o=document.createElement("option");o.value=d;o.textContent=new Date(d+"T12:00:00").toLocaleDateString("pt-BR");sel.appendChild(o)});
  sel.value=dates.indexOf(keep)>=0?keep:preferred;
  if(sel.value)loadTimeMapDay(sel.value)
}
function loadTimeMapDay(day){
  var host=$("timeStrikeHeatmap");if(!host)return;
  if(state.timeMapCache[day]){renderTimeMap(day);return}
  if(state.timeMapLoading===day)return;
  state.timeMapLoading=day;host.innerHTML='<p class="note heatmap-empty">Carregando snapshots do dia…</p>';
  var entries=snapshotEntries().filter(function(e){return e.local_date===day}).sort(function(a,b){return a.local_time.localeCompare(b.local_time)});
  Promise.all(entries.map(function(e){return getJson(e.file).then(function(d){return{entry:e,data:d}}).catch(function(){return null})}))
    .then(function(rows){state.timeMapCache[day]=rows.filter(Boolean);renderTimeMap(day)})
    .finally(function(){state.timeMapLoading=null})
}
function temporalProfile(snap){
  if(state.expiryFilter==="all")return snap;
  if(!Array.isArray(snap.expiry_profiles))return null;
  return snap.expiry_profiles.find(function(p){return p.expiration===state.expiryFilter})||null
}
function renderTimeMap(day){
  var host=$("timeStrikeHeatmap");if(!host)return;host.innerHTML="";
  var rows=state.timeMapCache[day]||[];
  if(!rows.length){host.innerHTML='<p class="note heatmap-empty">Sem snapshots carregáveis para este dia.</p>';return}
  var usable=rows.map(function(r){return{entry:r.entry,p:temporalProfile(r.data)}}).filter(function(r){return r.p&&Array.isArray(r.p.strikes)});
  if(!usable.length){host.innerHTML='<p class="note heatmap-empty">O vencimento selecionado não está disponível nos snapshots deste dia.</p>';return}
  var center=usable[usable.length-1].p.spot,lo=center*(1-state.range),hi=center*(1+state.range),strikeSet={},maxAbs=1;
  usable.forEach(function(r){r.map={};r.p.strikes.forEach(function(s){if(s.k>=lo&&s.k<=hi){strikeSet[s.k]=true;r.map[s.k]=s;maxAbs=Math.max(maxAbs,Math.abs(s.net||0))}})});
  var strikes=Object.keys(strikeSet).map(Number).sort(function(a,b){return b-a});
  if(!strikes.length){host.innerHTML='<p class="note heatmap-empty">Sem strikes na faixa atual.</p>';return}
  var cellW=Math.max(34,Math.min(58,1000/usable.length)),cellH=21,m={l:68,r:14,t:78,b:22},W=Math.max(940,m.l+m.r+usable.length*cellW),H=m.t+m.b+strikes.length*cellH;
  var svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,width:W,height:H,role:"img","aria-label":"Mapa temporal de GEX por strike"},host);
  usable.forEach(function(r,ci){
    var xx=m.l+ci*cellW,opening=r.entry.is_win_open_reference;
    if(opening)svgEl("rect",{x:xx,y:m.t-32,width:cellW,height:strikes.length*cellH+34,fill:cssVar("--purple"),"fill-opacity":.055},svg);
    var lab=(opening?"★ ":"")+r.entry.local_time.slice(0,5),tx=xx+cellW/2,t=svgText(svg,tx,m.t-9,lab,{"text-anchor":"end",class:"heat-label"});t.setAttribute("transform","rotate(-55 "+tx+" "+(m.t-9)+")")
  });
  strikes.forEach(function(k,ri){
    var yy=m.t+ri*cellH;svgText(svg,m.l-8,yy+cellH*.68,fmt2.format(k),{"text-anchor":"end",class:"lbl"});
    usable.forEach(function(r,ci){
      var s=r.map[k]||{net:0},v=s.net||0,str=Math.abs(v)/maxAbs,color=v>0?cssVar("--blue"):v<0?cssVar("--orange"):cssVar("--grid"),op=v===0?.06:.12+.78*str;
      var rect=svgEl("rect",{x:m.l+ci*cellW+1,y:yy+1,width:cellW-2,height:cellH-2,rx:2,fill:color,"fill-opacity":op.toFixed(3),stroke:cssVar("--border"),"stroke-width":.4},svg);
      if(k===r.p.call_wall)rect.setAttribute("stroke",cssVar("--blue")),rect.setAttribute("stroke-width","2");
      if(k===r.p.put_wall)rect.setAttribute("stroke",cssVar("--orange")),rect.setAttribute("stroke-width","2");
      rect.addEventListener("pointermove",function(e){showTip(e,r.entry.local_time.slice(0,5)+" · Strike "+fmt2.format(k),[["GEX",usd(v)],["Call Wall",r.p.call_wall===k?"sim":"não"],["Put Wall",r.p.put_wall===k?"sim":"não"]])});rect.addEventListener("pointerleave",hideTip)
    })
  })
}


function ageLabel(seconds){
  if(seconds==null)return"—";
  if(seconds<60)return seconds+" s";
  if(seconds<3600)return Math.round(seconds/60)+" min";
  return fmt2.format(seconds/3600)+" h"
}
function qualityFlagLabel(flag){
  var map={
    chain_incomplete:"Chain incompleta",
    low_contract_count:"Poucos contratos utilizáveis",
    low_iv_coverage:"Cobertura de IV muito baixa",
    partial_iv_coverage:"Cobertura de IV parcial",
    source_timestamp_missing:"Timestamp da fonte ausente",
    source_timestamp_old:"Timestamp da fonte antigo",
    source_timestamp_very_old:"Timestamp da fonte muito antigo"
  };
  return map[flag]||flag
}
function renderQuality(){
  var q=state.gex&&state.gex.quality,box=$("qualityGrid"),flags=$("qualityFlags"),status=$("qualityStatus");
  if(!box||!flags||!status)return;
  box.innerHTML="";flags.innerHTML="";
  if(!q){
    status.textContent="Snapshot legado";status.className="quality-status warning";
    box.innerHTML='<p class="note">Este snapshot foi criado antes do painel de qualidade. Selecione uma coleta v4 ou mais recente.</p>';
    return
  }
  var priceIssues=[],p=state.prices;
  if(p&&p.errors&&p.errors.length)priceIssues=priceIssues.concat(p.errors);
  if(p&&p.ewz&&p.ewz.stale)priceIssues.push("EWZ com candles anteriores");
  if(p&&p.win&&p.win.stale)priceIssues.push("WIN com candles anteriores");
  var severity=q.status||"ok";
  if(priceIssues.length&&severity==="ok")severity="warning";
  status.className="quality-status "+severity;
  status.textContent=severity==="critical"?"Crítico":severity==="warning"?"Atenção":"OK";
  var cards=[
    ["Idade técnica",ageLabel(q.source_age_seconds),"timestamp fonte → coleta"],
    ["Sessão NY",q.market_session_ny||"—","regular / pré / pós"],
    ["Contratos",fmt0.format(q.contracts_used||0),(q.calls_used||0)+" calls · "+(q.puts_used||0)+" puts"],
    ["Expiries",fmt0.format(q.expiries||0),fmt0.format(q.strikes||0)+" strikes"],
    ["IV válida",fmt2.format(q.iv_coverage_pct||0)+"%","sobre opções brutas"],
    ["Bid/Ask válido",fmt2.format(q.bid_ask_coverage_pct||0)+"%","quotes com ambos os lados"],
    ["OI > 0",fmt2.format(q.open_interest_positive_pct||0)+"%","opções usadas estruturalmente"],
    ["Fonte","CBOE público","delayed; não é real-time"]
  ];
  cards.forEach(function(m){var d=document.createElement("div");d.className="quality-metric";var a=document.createElement("span");a.textContent=m[0];var b=document.createElement("strong");b.textContent=m[1];var s=document.createElement("small");s.textContent=m[2];d.appendChild(a);d.appendChild(b);d.appendChild(s);box.appendChild(d)});
  var all=(q.flags||[]).map(qualityFlagLabel).concat(priceIssues);
  if(!all.length){flags.innerHTML='<span class="quality-chip ok">Nenhuma flag técnica nesta coleta</span>'}
  else all.forEach(function(x){var s=document.createElement("span");s.className="quality-chip "+(severity==="critical"?"critical":"warning");s.textContent=x;flags.appendChild(s)})
}

function ivReferenceProfile(){
  if(!state.gex||!Array.isArray(state.gex.expiry_profiles))return null;
  var profiles=state.gex.expiry_profiles.filter(function(p){return p.atm_iv_pct!=null});
  if(state.expiryFilter!=="all")return profiles.find(function(p){return p.expiration===state.expiryFilter})||null;
  profiles.sort(function(a,b){return(a.dte||0)-(b.dte||0)});
  return profiles[0]||null
}
function derivedTermStructure(){
  if(state.gex&&state.gex.term_structure&&Array.isArray(state.gex.term_structure.points))return state.gex.term_structure;
  var ps=state.gex&&Array.isArray(state.gex.expiry_profiles)?state.gex.expiry_profiles.filter(function(p){return p.atm_iv_pct!=null}).slice():[];
  ps.sort(function(a,b){return(a.dte||0)-(b.dte||0)});
  return{points:ps.map(function(p){return{expiration:p.expiration,dte:p.dte,atm_iv_pct:p.atm_iv_pct,rr25_vol_points:p.rr25_vol_points,bf25_vol_points:p.bf25_vol_points}}),regime:"insufficient",slope_30d_vol_points:null}
}
function renderIV(){
  var p=ivReferenceProfile(),box=$("ivKpis"),skew=$("ivSkewChart"),term=$("termStructureChart"),badge=$("ivExpiryBadge"),note=$("ivStructureNote");
  if(!box||!skew||!term)return;
  box.innerHTML="";skew.innerHTML="";term.innerHTML="";
  if(!p){
    badge.textContent="sem dados B2";note.textContent="Este snapshot não possui métricas de IV Skew/Term Structure. Novas coletas passam a armazená-las.";return
  }
  badge.textContent=new Date(p.expiration+"T12:00:00").toLocaleDateString("pt-BR")+" · "+p.dte+" DTE";
  var ts=derivedTermStructure(),kpis=[
    ["IV ATM",p.atm_iv_pct==null?"—":fmt2.format(p.atm_iv_pct)+"%","strike "+(p.atm_iv_strike==null?"—":fmt2.format(p.atm_iv_strike))],
    ["Put 25Δ",p.put25_iv_pct==null?"—":fmt2.format(p.put25_iv_pct)+"%","strike "+(p.put25_strike==null?"—":fmt2.format(p.put25_strike))],
    ["Call 25Δ",p.call25_iv_pct==null?"—":fmt2.format(p.call25_iv_pct)+"%","strike "+(p.call25_strike==null?"—":fmt2.format(p.call25_strike))],
    ["RR 25Δ",p.rr25_vol_points==null?"—":fmt2.format(p.rr25_vol_points)+" vol pts","call IV − put IV"],
    ["Butterfly 25Δ",p.bf25_vol_points==null?"—":fmt2.format(p.bf25_vol_points)+" vol pts","asas vs ATM"],
    ["Slope 30d",ts.slope_30d_vol_points==null?"—":fmt2.format(ts.slope_30d_vol_points)+" vol pts",ts.regime||"—"]
  ];
  kpis.forEach(function(m){var d=document.createElement("div");d.className="iv-kpi";d.innerHTML="<span></span><strong></strong><small></small>";d.children[0].textContent=m[0];d.children[1].textContent=m[1];d.children[2].textContent=m[2];box.appendChild(d)});

  var rows=(p.strikes||[]).filter(function(s){return s.iv_call!=null||s.iv_put!=null}).filter(function(s){return s.k>=p.spot*(1-state.range)&&s.k<=p.spot*(1+state.range)});
  if(rows.length>1){
    var vals=[];rows.forEach(function(s){if(s.iv_call!=null)vals.push(s.iv_call*100);if(s.iv_put!=null)vals.push(s.iv_put*100)});
    var ymin=Math.min.apply(null,vals),ymax=Math.max.apply(null,vals),pad=(ymax-ymin)*.1||1;ymin-=pad;ymax+=pad;
    var W=660,H=300,m={l:58,r:16,t:18,b:42},svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"IV skew por strike"},skew);
    var x=function(i){return m.l+i/Math.max(1,rows.length-1)*(W-m.l-m.r)},y=function(v){return m.t+(1-(v-ymin)/(ymax-ymin))*(H-m.t-m.b)};
    niceTicks(ymin,ymax,5).forEach(function(t){svgEl("line",{x1:m.l,x2:W-m.r,y1:y(t),y2:y(t),class:"grid"},svg);svgText(svg,m.l-7,y(t)+4,fmt2.format(t)+"%",{"text-anchor":"end"})});
    function line(field,color){var pts=[];rows.forEach(function(s,i){if(s[field]!=null)pts.push({x:x(i),y:y(s[field]*100),s:s})});if(pts.length>1)svgEl("path",{d:pts.map(function(p,i){return(i?"L":"M")+p.x.toFixed(1)+" "+p.y.toFixed(1)}).join(" "),fill:"none",stroke:color,"stroke-width":2},svg)}
    line("iv_call",cssVar("--blue"));line("iv_put",cssVar("--orange"));
    var every=Math.max(1,Math.ceil(rows.length/8));rows.forEach(function(s,i){if(i%every===0||i===rows.length-1)svgText(svg,x(i),H-m.b+16,fmt2.format(s.k),{"text-anchor":"middle"})});
    rows.forEach(function(s,i){var h=svgEl("rect",{x:x(i)-8,y:m.t,width:16,height:H-m.t-m.b,class:"hit"},svg);h.addEventListener("pointermove",function(e){showTip(e,"Strike "+fmt2.format(s.k),[["Call IV",s.iv_call==null?"—":fmt2.format(s.iv_call*100)+"%"],["Put IV",s.iv_put==null?"—":fmt2.format(s.iv_put*100)+"%"]])});h.addEventListener("pointerleave",hideTip)})
  }
  legend("ivSkewLegend",[{name:"Call IV",color:cssVar("--blue")},{name:"Put IV",color:cssVar("--orange")}]);

  var pts=(ts.points||[]).filter(function(x){return x.atm_iv_pct!=null});
  if(pts.length>1){
    var W2=660,H2=300,m2={l:58,r:16,t:18,b:58},vmin=Math.min.apply(null,pts.map(function(x){return x.atm_iv_pct})),vmax=Math.max.apply(null,pts.map(function(x){return x.atm_iv_pct})),pd=(vmax-vmin)*.12||1;vmin-=pd;vmax+=pd;
    var svg2=svgEl("svg",{viewBox:"0 0 "+W2+" "+H2,role:"img","aria-label":"Term structure de IV ATM"},term),x2=function(i){return m2.l+i/Math.max(1,pts.length-1)*(W2-m2.l-m2.r)},y2=function(v){return m2.t+(1-(v-vmin)/(vmax-vmin))*(H2-m2.t-m2.b)};
    niceTicks(vmin,vmax,5).forEach(function(t){svgEl("line",{x1:m2.l,x2:W2-m2.r,y1:y2(t),y2:y2(t),class:"grid"},svg2);svgText(svg2,m2.l-7,y2(t)+4,fmt2.format(t)+"%",{"text-anchor":"end"})});
    svgEl("path",{d:pts.map(function(p,i){return(i?"L":"M")+x2(i).toFixed(1)+" "+y2(p.atm_iv_pct).toFixed(1)}).join(" "),fill:"none",stroke:cssVar("--purple"),"stroke-width":2},svg2);
    pts.forEach(function(p,i){svgEl("circle",{cx:x2(i),cy:y2(p.atm_iv_pct),r:3.5,fill:cssVar("--purple")},svg2);var lab=p.dte+"d";var t=svgText(svg2,x2(i),H2-m2.b+18,lab,{"text-anchor":"end"});t.setAttribute("transform","rotate(-45 "+x2(i)+" "+(H2-m2.b+18)+")")})
  }
  legend("termLegend",[{name:"IV ATM por expiry",color:cssVar("--purple")}]);
  note.textContent="RR25 = Call 25Δ IV − Put 25Δ IV. Valor negativo indica puts 25Δ mais caros em volatilidade. Term Structure usa IV ATM; contango/backwardation descreve forma da curva, não direção futura do preço."
}

function sessionDates(){
  var dates=[];snapshotEntries().forEach(function(e){if(dates.indexOf(e.local_date)<0)dates.push(e.local_date)});return dates.sort().reverse()
}
function renderOiControls(){
  var sel=$("oiDateSelect");if(!sel)return;
  var dates=sessionDates(),keep=sel.value;sel.innerHTML="";
  dates.forEach(function(d){var o=document.createElement("option");o.value=d;o.textContent=new Date(d+"T12:00:00").toLocaleDateString("pt-BR");sel.appendChild(o)});
  sel.value=dates.indexOf(keep)>=0?keep:(dates[0]||"");
  if(sel.value)loadOiDelta(sel.value)
}
function representativeEntry(day){
  var rows=snapshotEntries().filter(function(e){return e.local_date===day}).sort(function(a,b){return b.local_time.localeCompare(a.local_time)});
  return rows.find(function(e){return(e.snapshot_version||0)>=4})||rows[0]||null
}
function oiProfile(snap){
  if(!snap)return null;
  if(state.expiryFilter==="all")return snap;
  if(!Array.isArray(snap.expiry_profiles))return null;
  return snap.expiry_profiles.find(function(p){return p.expiration===state.expiryFilter})||null
}
function loadOiDelta(day){
  var dates=sessionDates(),idx=dates.indexOf(day),prevDay=idx>=0?dates[idx+1]:null,host=$("oiDeltaChart"),note=$("oiNote");
  if(!host)return;
  if(!prevDay){host.innerHTML='<p class="note heatmap-empty">Ainda não há uma sessão anterior armazenada para calcular ΔOI.</p>';$("oiSummary").innerHTML="";note.textContent="O painel será preenchido automaticamente quando houver dois dias de snapshots com OI por strike.";return}
  var key=day+"|"+prevDay;
  if(state.oiCache[key]){renderOiDelta(day,prevDay,state.oiCache[key]);return}
  var cur=representativeEntry(day),prev=representativeEntry(prevDay);
  if(!cur||!prev){host.innerHTML='<p class="note heatmap-empty">Snapshots insuficientes para comparar as sessões.</p>';return}
  state.oiLoading=key;host.innerHTML='<p class="note heatmap-empty">Carregando OI das duas sessões…</p>';
  Promise.all([getJson(cur.file),getJson(prev.file)]).then(function(r){state.oiCache[key]={cur:r[0],prev:r[1],curEntry:cur,prevEntry:prev};renderOiDelta(day,prevDay,state.oiCache[key])}).catch(function(err){host.innerHTML='<p class="note heatmap-empty">Não foi possível carregar ΔOI: '+err.message+'</p>'}).finally(function(){state.oiLoading=null})
}
function renderOiDelta(day,prevDay,data){
  var host=$("oiDeltaChart"),sum=$("oiSummary"),note=$("oiNote");host.innerHTML="";sum.innerHTML="";
  var cur=oiProfile(data.cur),prev=oiProfile(data.prev);
  if(!cur||!prev||!(cur.strikes||[]).some(function(s){return s.oi_call!=null})||!(prev.strikes||[]).some(function(s){return s.oi_call!=null})){
    host.innerHTML='<p class="note heatmap-empty">Uma das sessões foi gravada antes do snapshot v4 e não possui OI por strike.</p>';note.textContent="ΔOI requer duas sessões com o novo schema. Nenhum valor intradiário foi usado como substituto.";return
  }
  var a={},b={};(prev.strikes||[]).forEach(function(s){a[s.k]=s});(cur.strikes||[]).forEach(function(s){b[s.k]=s});
  var ks=Object.keys(Object.assign({},a,b)).map(Number).sort(function(x,y){return x-y}),rows=ks.map(function(k){var x=a[k]||{},y=b[k]||{},dc=(y.oi_call||0)-(x.oi_call||0),dp=(y.oi_put||0)-(x.oi_put||0);return{k:k,d_call:dc,d_put:dp,d_net:dc-dp}});
  var center=cur.spot||state.gex.spot,lo=center*(1-state.range),hi=center*(1+state.range);rows=rows.filter(function(r){return r.k>=lo&&r.k<=hi});
  var tc=rows.reduce(function(s,r){return s+r.d_call},0),tp=rows.reduce(function(s,r){return s+r.d_put},0),tn=tc-tp;
  [["Δ OI Calls",fmt0.format(tc),tc>=0?"aumento":"redução"],["Δ OI Puts",fmt0.format(tp),tp>=0?"aumento":"redução"],["Δ líquido C−P",fmt0.format(tn),"calls menos puts"]].forEach(function(m){var d=document.createElement("div");d.className="oi-kpi";d.innerHTML="<span></span><strong></strong><small></small>";d.children[0].textContent=m[0];d.children[1].textContent=m[1];d.children[2].textContent=m[2];sum.appendChild(d)});
  if(rows.length){
    var W=1220,H=330,m={l:62,r:18,t:22,b:48},vmax=Math.max.apply(null,rows.reduce(function(v,r){v.push(Math.abs(r.d_call),Math.abs(r.d_put));return v},[]))*1.12||1,svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Delta OI por strike"},host),x=function(i){return m.l+i/Math.max(1,rows.length-1)*(W-m.l-m.r)},y=function(v){return m.t+(1-(v+vmax)/(2*vmax))*(H-m.t-m.b)};
    niceTicks(-vmax,vmax,6).forEach(function(t){svgEl("line",{x1:m.l,x2:W-m.r,y1:y(t),y2:y(t),class:t===0?"axis":"grid"},svg);svgText(svg,m.l-7,y(t)+4,fmt0.format(t),{"text-anchor":"end"})});
    var step=(W-m.l-m.r)/Math.max(1,rows.length-1),bw=Math.max(3,Math.min(11,step*.32));
    rows.forEach(function(r,i){[[r.d_call,cssVar("--blue"),-bw],[r.d_put,cssVar("--orange"),0]].forEach(function(v){var yy=y(v[0]);svgEl("rect",{x:x(i)+v[2],y:Math.min(y(0),yy),width:bw,height:Math.max(1,Math.abs(yy-y(0))),fill:v[1],"fill-opacity":.72},svg)})});
    var every=Math.max(1,Math.ceil(rows.length/10));rows.forEach(function(r,i){if(i%every===0||i===rows.length-1)svgText(svg,x(i),H-m.b+16,fmt2.format(r.k),{"text-anchor":"middle"})});
    rows.forEach(function(r,i){var h=svgEl("rect",{x:x(i)-step/2,y:m.t,width:Math.max(8,step),height:H-m.t-m.b,class:"hit"},svg);h.addEventListener("pointermove",function(e){showTip(e,"Strike "+fmt2.format(r.k),[["Δ Call OI",fmt0.format(r.d_call)],["Δ Put OI",fmt0.format(r.d_put)],["Δ líquido C−P",fmt0.format(r.d_net)]])});h.addEventListener("pointerleave",hideTip)})
  }
  legend("oiLegend",[{name:"Δ OI Calls",color:cssVar("--blue"),cls:"sq"},{name:"Δ OI Puts",color:cssVar("--orange"),cls:"sq"}]);
  note.textContent=new Date(prevDay+"T12:00:00").toLocaleDateString("pt-BR")+" → "+new Date(day+"T12:00:00").toLocaleDateString("pt-BR")+" · "+(state.expiryFilter==="all"?"todos os vencimentos":"expiry "+new Date(state.expiryFilter+"T12:00:00").toLocaleDateString("pt-BR"))+". OI é comparado entre sessões, não entre horários do mesmo dia."
}


/* ---------- B3 · Stress Lab ---------- */
function normPdfJs(x){return Math.exp(-.5*x*x)/Math.sqrt(2*Math.PI)}
function normCdfJs(x){
  var sign=x<0?-1:1,z=Math.abs(x)/Math.sqrt(2),t=1/(1+.3275911*z);
  var erf=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-z*z);
  return .5*(1+sign*erf)
}
function bsD1D2Js(spot,strike,t,iv){
  if(!(spot>0&&strike>0&&t>0&&iv>0))return null;
  var rt=Math.sqrt(t),d1=(Math.log(spot/strike)+.5*iv*iv*t)/(iv*rt);return[d1,d1-iv*rt]
}
function bsGammaJs(spot,strike,t,iv){var d=bsD1D2Js(spot,strike,t,iv);return d?normPdfJs(d[0])/(spot*iv*Math.sqrt(t)):0}
function bsDeltaJs(spot,strike,t,iv,cp){var d=bsD1D2Js(spot,strike,t,iv);if(!d)return 0;var call=normCdfJs(d[0]);return cp==="C"?call:call-1}
function bsVannaJs(spot,strike,t,iv){var d=bsD1D2Js(spot,strike,t,iv);return d?-normPdfJs(d[0])*d[1]/iv:0}
function bsCharmJs(spot,strike,t,iv){var d=bsD1D2Js(spot,strike,t,iv);if(!d)return 0;var rt=Math.sqrt(t),den=2*t*iv*rt;return den?-normPdfJs(d[0])*(-d[1]*iv*rt)/den/365:0}
function stressBaseProfile(){return structureProfile()}
function stressRowsAt(profile,spot,ivPts,days){
  var t=Math.max((profile.dte||0)-days,.5)/365,rows=[],mult=100,moveK=mult*spot*spot*.01;
  (profile.strikes||[]).forEach(function(s){
    var callIv=s.iv_call==null?null:Math.max(.01,s.iv_call+ivPts/100),putIv=s.iv_put==null?null:Math.max(.01,s.iv_put+ivPts/100);
    var coi=s.oi_call||0,poi=s.oi_put||0,cg=callIv?bsGammaJs(spot,s.k,t,callIv)*coi*moveK:0,pg=putIv?-bsGammaJs(spot,s.k,t,putIv)*poi*moveK:0;
    var cd=callIv?bsDeltaJs(spot,s.k,t,callIv,"C"):0,pd=putIv?bsDeltaJs(spot,s.k,t,putIv,"P"):0;
    var cv=callIv?bsVannaJs(spot,s.k,t,callIv):0,pv=putIv?bsVannaJs(spot,s.k,t,putIv):0;
    var cc=callIv?bsCharmJs(spot,s.k,t,callIv):0,pc=putIv?bsCharmJs(spot,s.k,t,putIv):0;
    rows.push({k:s.k,call:cg,put:pg,net:cg+pg,
      dex:-cd*coi*mult*spot-pd*poi*mult*spot,
      vanna:-cv*.01*coi*mult*spot-pv*.01*poi*mult*spot,
      charm:-cc*coi*mult*spot-pc*poi*mult*spot,
      oi_call:coi,oi_put:poi,iv_call:callIv,iv_put:putIv})
  });
  return rows
}
function scenarioTotalAt(price,rows,t){
  var total=0,mult=100*price*price*.01;
  rows.forEach(function(s){
    if(s.iv_call&&s.oi_call)total+=bsGammaJs(price,s.k,t,s.iv_call)*s.oi_call*mult;
    if(s.iv_put&&s.oi_put)total-=bsGammaJs(price,s.k,t,s.iv_put)*s.oi_put*mult
  });return total
}
function scenarioFlip(spot,rows,t){
  var best=null,lastS=spot*.8,last=scenarioTotalAt(lastS,rows,t);
  for(var i=1;i<=160;i++){var s=spot*(.8+.4*i/160),g=scenarioTotalAt(s,rows,t);if(last===0||last*g<0){var x=last===0?lastS:lastS+(s-lastS)*(0-last)/(g-last);if(best==null||Math.abs(x-spot)<Math.abs(best-spot))best=x}lastS=s;last=g}return best
}
function calculateStress(){
  var p=stressBaseProfile();if(!p||!(p.strikes||[]).some(function(s){return s.oi_call!=null||s.oi_put!=null}))return null;
  var spotPct=parseFloat($("stressSpotPct").value)||0,ivPts=parseFloat($("stressIvPts").value)||0,days=Math.max(0,parseInt($("stressDays").value,10)||0);
  days=Math.min(days,Math.max(0,p.dte||0));$("stressDays").value=String(days);
  var spot=p.spot*(1+spotPct/100),rows=stressRowsAt(p,spot,ivPts,days),net=rows.reduce(function(a,s){return a+s.net},0);
  var callWall=rows.length?rows.reduce(function(a,b){return b.call>a.call?b:a}).k:null,putWall=rows.length?rows.reduce(function(a,b){return b.put<a.put?b:a}).k:null;
  var maxAbs=rows.length?rows.reduce(function(a,b){return Math.abs(b.net)>Math.abs(a.net)?b:a}).k:null;
  var t=Math.max((p.dte||0)-days,.5)/365,flip=scenarioFlip(spot,rows,t);
  var out={model_version:"stress-v1-aggregate",snapshot:state.gex.generated_at,snapshot_version:state.gex.snapshot_version||null,expiry:p.expiration,dte_base:p.dte,dte_scenario:Math.max(0,(p.dte||0)-days),
    inputs:{spot_pct:spotPct,iv_vol_points:ivPts,days_elapsed:days},spot:spot,net_gex:net,call_wall:callWall,put_wall:putWall,flip:flip,max_abs_strike:maxAbs,
    net_dex:rows.reduce(function(a,s){return a+s.dex},0),net_vanna:rows.reduce(function(a,s){return a+s.vanna},0),net_charm:rows.reduce(function(a,s){return a+s.charm},0),rows:rows};
  state.stressScenario=out;return out
}
function runStressScenario(){calculateStress();renderStress()}
function renderStress(){
  var p=stressBaseProfile(),box=$("stressSummary"),host=$("stressChart"),note=$("stressNote"),badge=$("stressExpiryBadge");if(!box||!host)return;box.innerHTML="";host.innerHTML="";
  if(!p){badge.textContent="sem expiry";note.textContent="Selecione um snapshot com perfis por vencimento.";return}
  badge.textContent=new Date(p.expiration+"T12:00:00").toLocaleDateString("pt-BR")+" · "+p.dte+" DTE";
  var s=state.stressScenario;if(!s||s.snapshot!==state.gex.generated_at||s.expiry!==p.expiration){s=calculateStress()}
  if(!s){note.textContent="O snapshot selecionado não possui OI/IV por strike suficiente para simular.";return}
  var metrics=[
    ["Spot","US$ "+fmt2.format(p.spot)+" → "+fmt2.format(s.spot),"Δ "+fmtPct.format((s.spot/p.spot-1)*100)+"%"],
    ["Net GEX",usd(p.net_gex)+" → "+usd(s.net_gex),"cenário"],
    ["Call Wall",fmt2.format(p.call_wall)+" → "+fmt2.format(s.call_wall),"WIN "+fmt0.format(toWin(s.call_wall)||0)],
    ["Put Wall",fmt2.format(p.put_wall)+" → "+fmt2.format(s.put_wall),"WIN "+fmt0.format(toWin(s.put_wall)||0)],
    ["Gamma Flip",(p.flip==null?"—":fmt2.format(p.flip))+" → "+(s.flip==null?"—":fmt2.format(s.flip)),"cenário"],
    ["Net DEX",usd(p.net_dex)+" → "+usd(s.net_dex),"proxy"],
    ["Net Vanna",usd(p.net_vanna)+" → "+usd(s.net_vanna),"+1 vol pt"],
    ["Net Charm",usd(p.net_charm)+" → "+usd(s.net_charm),"1 dia"]
  ];
  metrics.forEach(function(m){var d=document.createElement("div");d.className="stress-metric";d.innerHTML="<span></span><strong></strong><small></small>";d.children[0].textContent=m[0];d.children[1].textContent=m[1];d.children[2].textContent=m[2];box.appendChild(d)});
  var base={};(p.strikes||[]).forEach(function(x){base[x.k]=x.net||0});var rows=s.rows.filter(function(x){return x.k>=s.spot*(1-state.range)&&x.k<=s.spot*(1+state.range)});
  if(rows.length>1){
    var W=1220,H=330,m={l:76,r:18,t:22,b:46},vals=[];rows.forEach(function(x){vals.push(base[x.k]||0,x.net||0)});var vmax=Math.max.apply(null,vals.map(Math.abs))*1.12||1;
    var svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"GEX base versus cenário"},host),x=function(i){return m.l+i/Math.max(1,rows.length-1)*(W-m.l-m.r)},y=function(v){return m.t+(1-(v+vmax)/(2*vmax))*(H-m.t-m.b)};
    niceTicks(-vmax,vmax,6).forEach(function(tk){svgEl("line",{x1:m.l,x2:W-m.r,y1:y(tk),y2:y(tk),class:tk===0?"axis":"grid"},svg);svgText(svg,m.l-8,y(tk)+4,compact(tk),{"text-anchor":"end"})});
    function path(field,color){svgEl("path",{d:rows.map(function(r,i){var v=field==="base"?(base[r.k]||0):r.net;return(i?"L":"M")+x(i).toFixed(1)+" "+y(v).toFixed(1)}).join(" "),fill:"none",stroke:color,"stroke-width":2},svg)}
    path("base",cssVar("--axis"));path("scenario",cssVar("--purple"));
    var every=Math.max(1,Math.ceil(rows.length/10));rows.forEach(function(r,i){if(i%every===0||i===rows.length-1)svgText(svg,x(i),H-m.b+16,fmt2.format(r.k),{"text-anchor":"middle"})})
  }
  legend("stressLegend",[{name:"Base",color:cssVar("--axis")},{name:"Cenário",color:cssVar("--purple")}]);
  note.textContent="Modelo agregado por strike: OI permanece fixo; IV é deslocada uniformemente; gamma/delta/vanna/charm são recalculados por Black-Scholes. É um experimento de sensibilidade, não previsão."
}

/* ---------- B4 · Pinning / Gamma Gravity ---------- */
function derivedPinning(p){
  if(Array.isArray(p.pinning)&&p.pinning.length)return p.pinning;
  var rows=(p.strikes||[]).map(function(s){var oi=(s.oi_call||0)+(s.oi_put||0),g=Math.abs(s.call||0)+Math.abs(s.put||0),dist=Math.abs(s.k/p.spot-1)*100,prox=Math.exp(-(dist/100)/.03),tw=1/Math.sqrt(Math.max(p.dte||0,.5));return{k:s.k,oi:oi,abs_gex:g,distance_pct:dist,raw:Math.pow(Math.max(g,1),.6)*Math.sqrt(oi+1)*prox*tw}}),mx=Math.max.apply(null,rows.map(function(r){return r.raw}))||1;
  rows.forEach(function(r){r.score=r.raw/mx*100;delete r.raw});return rows.sort(function(a,b){return b.score-a.score}).slice(0,10)
}
function renderPinning(){
  var p=structureProfile(),box=$("pinningList"),badge=$("pinningExpiryBadge");if(!box)return;box.innerHTML="";
  if(!p){badge.textContent="sem expiry";box.innerHTML='<p class="note">Selecione um snapshot com perfis por vencimento.</p>';return}
  badge.textContent=new Date(p.expiration+"T12:00:00").toLocaleDateString("pt-BR")+" · "+p.dte+" DTE";
  var rows=derivedPinning(p);if(!rows.length){box.innerHTML='<p class="note">Dados insuficientes para o ranking.</p>';return}
  rows.forEach(function(r,i){var item=document.createElement("div");item.className="pinning-row";item.innerHTML='<div class="pin-rank"></div><div class="pin-main"><strong></strong><small></small><div class="pin-bar"><i></i></div></div><div class="pin-score"></div>';item.querySelector(".pin-rank").textContent="#"+(i+1);item.querySelector("strong").textContent="EWZ "+fmt2.format(r.k)+" · WIN "+(toWin(r.k)==null?"—":fmt0.format(toWin(r.k)));item.querySelector("small").textContent="dist. "+fmt2.format(r.distance_pct)+"% · OI "+fmt0.format(r.oi)+" · |GEX| "+compact(r.abs_gex);item.querySelector(".pin-bar i").style.width=Math.max(2,r.score)+"%";item.querySelector(".pin-score").textContent=fmt2.format(r.score);box.appendChild(item)})
}

/* ---------- C1 · Historical Wall Scorecard ---------- */
function nearestPairAt(target){
  var eb=lastBars("ewz"),wb=lastBars("win"),win={};wb.forEach(function(b){win[b.t]=b});var best=null,dist=Infinity;
  eb.forEach(function(e){var w=win[e.t];if(!w)return;var d=Math.abs(e.t-target);if(d<dist){dist=d;best={t:e.t,ewz:e,win:w,dist:d}}});return best
}
function wallOutcome(bars,startTs,level,type,horizonSec){
  var future=bars.filter(function(b){return b.t>=startTs&&b.t<=startTs+horizonSec});if(!future.length)return null;
  var touch=-1;for(var i=0;i<future.length;i++){if(future[i].l<=level&&future[i].h>=level){touch=i;break}}
  if(touch<0)return{touched:false,rejected:false,broken:false,minutes:null};
  var threshold=.0015,rejected=false,broken=false;
  for(var j=touch;j<Math.min(future.length,touch+4);j++){var close=future[j].c;if(type==="call"){if(close>=level*(1+threshold)){broken=true;break}if(close<=level*(1-threshold))rejected=true}else{if(close<=level*(1-threshold)){broken=true;break}if(close>=level*(1+threshold))rejected=true}}
  return{touched:true,rejected:rejected&&!broken,broken:broken,minutes:(future[touch].t-startTs)/60}
}
function median(arr){if(!arr.length)return null;var a=arr.slice().sort(function(x,y){return x-y}),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function aggregateOutcomes(rows){
  var touched=rows.filter(function(x){return x&&x.touched}),mins=touched.map(function(x){return x.minutes});
  return{eligible:rows.length,touched:touched.length,rejected:touched.filter(function(x){return x.rejected}).length,broken:touched.filter(function(x){return x.broken}).length,median_minutes:median(mins)}
}
function computeScorecard(){
  var horizon=parseInt($("scorecardHorizon").value,10)||120,hsec=horizon*60,entries=snapshotEntries(),eb=lastBars("ewz"),wb=lastBars("win");
  if(!eb.length)return{horizon:horizon,ewz:[],win:[],sample:0};
  var lastE=eb[eb.length-1].t,lastW=wb.length?wb[wb.length-1].t:0,ewz=[],win=[];
  entries.slice().reverse().forEach(function(e){
    var ts=Math.floor(Date.parse(e.generated_at)/1000);if(!isFinite(ts)||ts+hsec>lastE||e.call_wall==null||e.put_wall==null)return;
    var pair=nearestPairAt(ts),spot=e.spot||pair&&pair.ewz.c;if(!spot)return;
    [["call",e.call_wall],["put",e.put_wall]].forEach(function(it){var type=it[0],level=it[1],valid=type==="call"?level>=spot*.997:level<=spot*1.003;if(!valid)return;var out=wallOutcome(eb,ts,level,type,hsec);if(out)ewz.push(Object.assign({type:type,level:level,ts:ts},out))});
    if(pair&&pair.dist<=900&&ts+hsec<=lastW){var ratio=pair.win.c/pair.ewz.c;[["call",e.call_wall],["put",e.put_wall]].forEach(function(it){var type=it[0],level=it[1]*ratio,valid=type==="call"?level>=pair.win.c*.997:level<=pair.win.c*1.003;if(!valid)return;var out=wallOutcome(wb,ts,level,type,hsec);if(out)win.push(Object.assign({type:type,level:level,ts:ts},out))})}
  });
  return{horizon:horizon,ewz:ewz,win:win,ewzAgg:aggregateOutcomes(ewz),winAgg:aggregateOutcomes(win),sample:entries.length}
}
function renderScorecard(){
  var box=$("scorecardGrid"),host=$("scorecardChart"),note=$("scorecardNote");if(!box||!host)return;box.innerHTML="";host.innerHTML="";
  var s=computeScorecard();state.scorecard=s;
  function add(asset,a){var touchRate=a.eligible?a.touched/a.eligible*100:0,rej=a.touched?a.rejected/a.touched*100:0,br=a.touched?a.broken/a.touched*100:0;[[asset+" · amostras",a.eligible,"Walls elegíveis"],[asset+" · toque",fmt2.format(touchRate)+"%",a.touched+" interações"],[asset+" · rejeição",fmt2.format(rej)+"%",a.rejected+" após toque"],[asset+" · rompimento",fmt2.format(br)+"%",a.broken+" após toque"],[asset+" · tempo",a.median_minutes==null?"—":fmt0.format(a.median_minutes)+" min","mediana até toque"]].forEach(function(m){var d=document.createElement("div");d.className="scorecard-metric";d.innerHTML="<span></span><strong></strong><small></small>";d.children[0].textContent=m[0];d.children[1].textContent=m[1];d.children[2].textContent=m[2];box.appendChild(d)})}
  add("EWZ",s.ewzAgg);add("WIN",s.winAgg);
  var cats=["Toque","Rejeição","Rompimento"],ea=s.ewzAgg,wa=s.winAgg,ev=[ea.eligible?ea.touched/ea.eligible*100:0,ea.touched?ea.rejected/ea.touched*100:0,ea.touched?ea.broken/ea.touched*100:0],wv=[wa.eligible?wa.touched/wa.eligible*100:0,wa.touched?wa.rejected/wa.touched*100:0,wa.touched?wa.broken/wa.touched*100:0];
  var W=900,H=280,m={l:58,r:18,t:24,b:46},svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Scorecard histórico de Walls"},host),y=function(v){return m.t+(1-v/100)*(H-m.t-m.b)},group=(W-m.l-m.r)/3;
  [0,25,50,75,100].forEach(function(t){svgEl("line",{x1:m.l,x2:W-m.r,y1:y(t),y2:y(t),class:"grid"},svg);svgText(svg,m.l-7,y(t)+4,t+"%",{"text-anchor":"end"})});
  cats.forEach(function(cat,i){var cx=m.l+group*(i+.5),bw=42;[[ev[i],cssVar("--blue"),-bw-2],[wv[i],cssVar("--purple"),2]].forEach(function(v){svgEl("rect",{x:cx+v[2],y:y(v[0]),width:bw,height:Math.max(1,y(0)-y(v[0])),fill:v[1],"fill-opacity":.72,rx:3},svg)});svgText(svg,cx,H-m.b+18,cat,{"text-anchor":"middle"})});
  note.textContent="Janela: "+s.horizon+" min. Rejeição/rompimento usa limiar de 0,15% após o primeiro toque. Snapshots sem toda a janela futura disponível são excluídos; isso evita look-ahead e amostras parciais."
}

/* ---------- D2 · Reproducible receipts ---------- */
function loadReceipts(){try{var x=JSON.parse(store("gex.analysisReceipts")||"[]");state.receipts=Array.isArray(x)?x:[]}catch(e){state.receipts=[]}}
function persistReceipts(){store("gex.analysisReceipts",JSON.stringify(state.receipts))}
function saveStressReceipt(){
  var s=state.stressScenario;if(!s){runStressScenario();s=state.stressScenario}if(!s)return;
  var receipt={id:new Date().toISOString(),kind:"stress_lab",model_version:s.model_version,created_at:new Date().toISOString(),snapshot:s.snapshot,snapshot_version:s.snapshot_version,expiry:s.expiry,inputs:s.inputs,
    base:{spot:stressBaseProfile().spot,net_gex:stressBaseProfile().net_gex,call_wall:stressBaseProfile().call_wall,put_wall:stressBaseProfile().put_wall,flip:stressBaseProfile().flip},
    result:{spot:s.spot,net_gex:s.net_gex,call_wall:s.call_wall,put_wall:s.put_wall,flip:s.flip,net_dex:s.net_dex,net_vanna:s.net_vanna,net_charm:s.net_charm}};
  state.receipts.unshift(receipt);state.receipts=state.receipts.slice(0,50);persistReceipts();renderReceipts()
}
function replayReceipt(id){
  var r=state.receipts.find(function(x){return x.id===id});if(!r)return;
  var entry=snapshotEntries().find(function(e){return e.generated_at===r.snapshot});
  var done=function(){state.expiryFilter=r.expiry;$("stressSpotPct").value=r.inputs.spot_pct;$("stressIvPts").value=r.inputs.iv_vol_points;$("stressDays").value=r.inputs.days_elapsed;state.stressScenario=null;renderAll();runStressScenario()};
  if(entry){getJson(entry.file).then(function(d){state.gex=d;state.selectedSnapshot=entry;focusChartsOnTimestamp(entry.generated_at);done()})}else if(state.gex.generated_at===r.snapshot)done()
}
function deleteReceipt(id){state.receipts=state.receipts.filter(function(x){return x.id!==id});persistReceipts();renderReceipts()}
function downloadJson(name,obj){var blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000)}
function renderReceipts(){
  var box=$("receiptsList");if(!box)return;box.innerHTML="";
  if(!state.receipts.length){box.innerHTML='<p class="note">Nenhum recibo salvo neste navegador.</p>';return}
  state.receipts.forEach(function(r){var d=document.createElement("div");d.className="receipt-row";var meta=document.createElement("div");meta.className="receipt-meta";var strong=document.createElement("strong");strong.textContent=new Date(r.created_at).toLocaleString("pt-BR")+" · "+new Date(r.expiry+"T12:00:00").toLocaleDateString("pt-BR");var small=document.createElement("small");small.textContent="spot "+fmtPct.format(r.inputs.spot_pct)+"% · IV "+fmtPct.format(r.inputs.iv_vol_points)+" pts · "+r.inputs.days_elapsed+" dias";meta.appendChild(strong);meta.appendChild(small);var act=document.createElement("div");act.className="receipt-actions";[["Repetir",function(){replayReceipt(r.id)}],["JSON",function(){downloadJson("gex-receipt-"+r.id.replace(/[:.]/g,"-")+".json",r)}],["Excluir",function(){deleteReceipt(r.id)}]].forEach(function(x){var b=document.createElement("button");b.type="button";b.className="ghost";b.textContent=x[0];b.addEventListener("click",x[1]);act.appendChild(b)});d.appendChild(meta);d.appendChild(act);box.appendChild(d)})
}


/* ---------- B6 · Historical abnormal volume ---------- */
function analysisProfile(snap){
  if(!snap)return null;
  if(state.expiryFilter==="all")return snap;
  if(!Array.isArray(snap.expiry_profiles))return null;
  return snap.expiry_profiles.find(function(p){return p.expiration===state.expiryFilter})||null
}
function profileListForAnomaly(snap){
  if(!snap)return[];
  if(state.expiryFilter==="all")return Array.isArray(snap.expiry_profiles)?snap.expiry_profiles:[];
  var p=analysisProfile(snap);return p?[p]:[]
}
function medianValue(values){
  if(!values.length)return null;var a=values.slice().sort(function(x,y){return x-y}),m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2
}
function robustStats(values,current){
  var med=medianValue(values);if(med==null)return null;
  var mad=medianValue(values.map(function(v){return Math.abs(v-med)}))||0;
  var scale=mad>0?1.4826*mad:Math.max(1,Math.sqrt(med+1));
  return{median:med,mad:mad,z:(current-med)/scale,ratio:med>0?current/med:(current>0?Infinity:1)}
}
function minuteOfDay(t){var p=String(t||"00:00").split(":");return(parseInt(p[0],10)||0)*60+(parseInt(p[1],10)||0)}
function representativeAtClock(day,targetMinute){
  var rows=snapshotEntries().filter(function(e){return e.local_date===day&&(e.snapshot_version||0)>=4});
  if(!rows.length)return null;
  rows.sort(function(a,b){return Math.abs(minuteOfDay(a.local_time)-targetMinute)-Math.abs(minuteOfDay(b.local_time)-targetMinute)});
  return Math.abs(minuteOfDay(rows[0].local_time)-targetMinute)<=60?rows[0]:null
}
function loadRepresentativeSessions(currentEntry){
  var target=minuteOfDay(currentEntry.local_time),days=[];
  snapshotEntries().forEach(function(e){if(e.local_date<currentEntry.local_date&&days.indexOf(e.local_date)<0)days.push(e.local_date)});
  days.sort().reverse();days=days.slice(0,20);
  var reps=days.map(function(d){return representativeAtClock(d,target)}).filter(Boolean);
  if(!reps.length)return Promise.resolve([]);
  return Promise.all(reps.map(function(e){return getJson(e.file).then(function(d){return{entry:e,data:d}}).catch(function(){return null})})).then(function(rows){return rows.filter(Boolean)})
}
function calculateVolumeAnomalies(current,baselines){
  var out=[],currentProfiles=profileListForAnomaly(current);
  currentProfiles.forEach(function(cp){
    var expiry=cp.expiration;
    (cp.strikes||[]).forEach(function(row){
      [["Call","volume_call"],["Put","volume_put"]].forEach(function(side){
        var currentVol=Number(row[side[1]]||0),hist=[];
        baselines.forEach(function(b){
          var bp=Array.isArray(b.data.expiry_profiles)?b.data.expiry_profiles.find(function(x){return x.expiration===expiry}):null;
          if(!bp)return;var br=(bp.strikes||[]).find(function(x){return Number(x.k)===Number(row.k)});
          if(br&&br[side[1]]!=null)hist.push(Number(br[side[1]])||0)
        });
        if(hist.length<3)return;
        var st=robustStats(hist,currentVol);if(!st)return;
        var anomaly=st.z>=3&&((st.median>0&&st.ratio>=1.5)||(st.median===0&&currentVol>=20));
        out.push({expiry:expiry,k:row.k,side:side[0],current:currentVol,baseline_n:hist.length,median:st.median,mad:st.mad,z:st.z,ratio:st.ratio,anomaly:anomaly})
      })
    })
  });
  out.sort(function(a,b){return b.z-a.z});return out
}
function renderVolumeAnomalyResult(currentEntry,baselines){
  var badge=$("volumeBaselineBadge"),sum=$("volumeAnomalySummary"),tbody=document.querySelector("#volumeAnomalyTable tbody"),note=$("volumeAnomalyNote");
  sum.innerHTML="";tbody.innerHTML="";
  if(baselines.length<3){
    badge.textContent=baselines.length+" sessão(ões) comparáveis";
    sum.innerHTML='<div class="volume-anomaly-empty"><strong>Baseline ainda insuficiente</strong><span>São necessárias pelo menos 3 sessões anteriores no mesmo horário aproximado.</span></div>';
    note.textContent="O projeto ainda está formando o histórico necessário. O sistema não usa snapshots do mesmo dia como substituto, porque volume é cumulativo intradiário.";
    return
  }
  var rows=calculateVolumeAnomalies(state.gex,baselines),flagged=rows.filter(function(r){return r.anomaly}),eligible=rows.length;
  badge.textContent=baselines.length+" sessões no baseline";
  [["Contratos lógicos",eligible,"expiry + strike + lado"],["Anomalias",flagged.length,"robust z ≥ 3 + filtro de magnitude"],["Maior z",rows.length?fmt2.format(rows[0].z):"—","atividade vs baseline"]].forEach(function(m){var d=document.createElement("div");d.className="volume-anomaly-kpi";d.innerHTML="<span></span><strong></strong><small></small>";d.children[0].textContent=m[0];d.children[1].textContent=m[1];d.children[2].textContent=m[2];sum.appendChild(d)});
  var shown=(flagged.length?flagged:rows.slice(0,10)).slice(0,15);
  shown.forEach(function(r,i){var tr=document.createElement("tr");[i+1,new Date(r.expiry+"T12:00:00").toLocaleDateString("pt-BR"),fmt2.format(r.k),r.side,fmt0.format(r.current),fmt0.format(r.median),fmt2.format(r.z),isFinite(r.ratio)?fmt2.format(r.ratio)+"×":"∞"].forEach(function(v,j){var td=document.createElement("td");if(j>=4)td.className="num";td.textContent=v;if(r.anomaly)tr.classList.add("anomaly-row");tr.appendChild(td)});tbody.appendChild(tr)});
  note.textContent=(flagged.length?"Tabela prioriza os contratos sinalizados como anômalos. ":"Nenhum contrato ultrapassou o limiar; a tabela mostra os maiores robust z observados. ")+"O baseline usa sessões anteriores, mesmo expiry/strike/lado e coleta até ±60 minutos do horário atual.";
}
function renderVolumeAnomaly(){
  var current=currentSnapshotEntry(),badge=$("volumeBaselineBadge"),sum=$("volumeAnomalySummary"),tbody=document.querySelector("#volumeAnomalyTable tbody"),note=$("volumeAnomalyNote");
  if(!current){badge.textContent="sem snapshot";sum.innerHTML="";tbody.innerHTML="";note.textContent="Selecione um snapshot histórico catalogado.";return}
  var key=current.generated_at+"|"+state.expiryFilter;
  if(state.volumeBaselineCache[key]){renderVolumeAnomalyResult(current,state.volumeBaselineCache[key]);return}
  badge.textContent="Carregando baseline…";sum.innerHTML="";tbody.innerHTML="";
  loadRepresentativeSessions(current).then(function(rows){state.volumeBaselineCache[key]=rows;renderVolumeAnomalyResult(current,rows)}).catch(function(err){badge.textContent="erro";note.textContent="Falha ao construir baseline: "+err.message})
}

/* ---------- Shared historical day loader ---------- */
function loadAnalysisDay(day){
  if(state.analysisDayCache[day])return Promise.resolve(state.analysisDayCache[day]);
  var entries=snapshotEntries().filter(function(e){return e.local_date===day}).sort(function(a,b){return a.local_time.localeCompare(b.local_time)});
  return Promise.all(entries.map(function(e){return getJson(e.file).then(function(d){return{entry:e,data:d}}).catch(function(){return null})})).then(function(rows){rows=rows.filter(Boolean);state.analysisDayCache[day]=rows;return rows})
}

/* ---------- B7 · Put / Call ratios ---------- */
function ratioMetrics(d){
  if(!d)return null;
  var rows=d.strikes||[],callOi=0,putOi=0,callVol=0,putVol=0;
  rows.forEach(function(r){callOi+=Number(r.oi_call||0);putOi+=Number(r.oi_put||0);callVol+=Number(r.volume_call||0);putVol+=Number(r.volume_put||0)});
  if(d.call_oi!=null)callOi=Number(d.call_oi||0);
  if(d.put_oi!=null)putOi=Number(d.put_oi||0);
  if(d.call_volume!=null)callVol=Number(d.call_volume||0);
  if(d.put_volume!=null)putVol=Number(d.put_volume||0);
  return{call_oi:callOi,put_oi:putOi,oi_ratio:d.put_call_oi_ratio!=null?Number(d.put_call_oi_ratio):(callOi>0?putOi/callOi:null),call_volume:callVol,put_volume:putVol,volume_ratio:d.put_call_volume_ratio!=null?Number(d.put_call_volume_ratio):(callVol>0?putVol/callVol:null)}
}
function ratioTone(v){if(v==null)return"indisponível";if(v>=1.25)return"predomínio relativo de puts";if(v<=.8)return"predomínio relativo de calls";return"composição relativamente equilibrada"}
function renderPutCallHistory(rows){
  var host=$("putCallHistoryChart");host.innerHTML="";
  var pts=[];rows.forEach(function(r){var p=analysisProfile(r.data),m=ratioMetrics(p);if(m&&m.oi_ratio!=null&&m.volume_ratio!=null)pts.push({entry:r.entry,oi:m.oi_ratio,vol:m.volume_ratio})});
  if(pts.length<2){host.innerHTML='<p class="note heatmap-empty">Histórico insuficiente para a série intradiária.</p>';return}
  var vals=[];pts.forEach(function(p){vals.push(p.oi,p.vol)});var ymin=Math.max(0,Math.min.apply(null,vals)*.88),ymax=Math.max.apply(null,vals)*1.12;if(ymax<=ymin)ymax=ymin+1;
  var W=660,H=290,m={l:52,r:14,t:18,b:44},svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Histórico Put Call Ratio"},host),x=function(i){return m.l+i/Math.max(1,pts.length-1)*(W-m.l-m.r)},y=function(v){return m.t+(1-(v-ymin)/(ymax-ymin))*(H-m.t-m.b)};
  niceTicks(ymin,ymax,5).forEach(function(t){svgEl("line",{x1:m.l,x2:W-m.r,y1:y(t),y2:y(t),class:"grid"},svg);svgText(svg,m.l-6,y(t)+4,fmt2.format(t),{"text-anchor":"end"})});
  svgEl("line",{x1:m.l,x2:W-m.r,y1:y(1),y2:y(1),stroke:cssVar("--axis"),"stroke-dasharray":"4 4"},svg);
  function line(field,color){svgEl("path",{d:pts.map(function(p,i){return(i?"L":"M")+x(i).toFixed(1)+" "+y(p[field]).toFixed(1)}).join(" "),fill:"none",stroke:color,"stroke-width":2},svg)}
  line("oi",cssVar("--purple"));line("vol",cssVar("--cyan"));
  var every=Math.max(1,Math.ceil(pts.length/8));pts.forEach(function(p,i){if(i%every===0||i===pts.length-1)svgText(svg,x(i),H-m.b+16,p.entry.local_time.slice(0,5),{"text-anchor":"middle"})})
}
function renderPutCall(){
  var d=activeGex(),m=ratioMetrics(d),box=$("putCallKpis"),badge=$("putCallScopeBadge"),expHost=$("putCallExpiryChart"),note=$("putCallNote");
  if(!box||!expHost)return;box.innerHTML="";expHost.innerHTML="";
  badge.textContent=state.expiryFilter==="all"?"Todos os vencimentos":new Date(state.expiryFilter+"T12:00:00").toLocaleDateString("pt-BR");
  if(!m){box.innerHTML='<p class="note">Dados insuficientes.</p>';return}
  [["P/C OI",m.oi_ratio==null?"—":fmt2.format(m.oi_ratio),ratioTone(m.oi_ratio)],["P/C Volume",m.volume_ratio==null?"—":fmt2.format(m.volume_ratio),ratioTone(m.volume_ratio)],["OI Calls / Puts",fmt0.format(m.call_oi)+" / "+fmt0.format(m.put_oi),"posições abertas"],["Volume Calls / Puts",fmt0.format(m.call_volume)+" / "+fmt0.format(m.put_volume),"volume acumulado"]].forEach(function(k){var el=document.createElement("div");el.className="putcall-kpi";el.innerHTML="<span></span><strong></strong><small></small>";el.children[0].textContent=k[0];el.children[1].textContent=k[1];el.children[2].textContent=k[2];box.appendChild(el)});

  var profiles=(state.gex.expiry_profiles||[]).map(function(p){return{p:p,m:ratioMetrics(p)}}).filter(function(x){return x.m&&x.m.oi_ratio!=null&&x.m.volume_ratio!=null}).sort(function(a,b){return(a.p.dte||0)-(b.p.dte||0)});
  if(profiles.length){
    var W=660,H=290,mm={l:52,r:14,t:18,b:58},vals=[];profiles.forEach(function(x){vals.push(x.m.oi_ratio,x.m.volume_ratio)});var ymin=Math.max(0,Math.min.apply(null,vals)*.88),ymax=Math.max.apply(null,vals)*1.12;if(ymax<=ymin)ymax=ymin+1;
    var svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Put Call Ratio por vencimento"},expHost),x=function(i){return mm.l+i/Math.max(1,profiles.length-1)*(W-mm.l-mm.r)},y=function(v){return mm.t+(1-(v-ymin)/(ymax-ymin))*(H-mm.t-mm.b)};
    niceTicks(ymin,ymax,5).forEach(function(t){svgEl("line",{x1:mm.l,x2:W-mm.r,y1:y(t),y2:y(t),class:"grid"},svg);svgText(svg,mm.l-6,y(t)+4,fmt2.format(t),{"text-anchor":"end"})});svgEl("line",{x1:mm.l,x2:W-mm.r,y1:y(1),y2:y(1),stroke:cssVar("--axis"),"stroke-dasharray":"4 4"},svg);
    function line(field,color){svgEl("path",{d:profiles.map(function(p,i){return(i?"L":"M")+x(i).toFixed(1)+" "+y(p.m[field]).toFixed(1)}).join(" "),fill:"none",stroke:color,"stroke-width":2},svg)}
    line("oi_ratio",cssVar("--purple"));line("volume_ratio",cssVar("--cyan"));
    profiles.forEach(function(p,i){var label=p.p.dte+"d",tx=x(i),t=svgText(svg,tx,H-mm.b+18,label,{"text-anchor":"end"});t.setAttribute("transform","rotate(-45 "+tx+" "+(H-mm.b+18)+")")})
  }
  legend("putCallExpiryLegend",[{name:"P/C OI",color:cssVar("--purple")},{name:"P/C Volume",color:cssVar("--cyan")}]);legend("putCallHistoryLegend",[{name:"P/C OI",color:cssVar("--purple")},{name:"P/C Volume",color:cssVar("--cyan")},{name:"Equilíbrio = 1",color:cssVar("--axis"),dash:true}]);
  var cur=currentSnapshotEntry(),day=cur&&cur.local_date;if(day)loadAnalysisDay(day).then(renderPutCallHistory);
  note.textContent="Razão > 1 significa mais puts que calls na métrica escolhida; < 1, mais calls. Volume é cumulativo intradiário; OI representa posições abertas e normalmente muda entre sessões."
}

/* ---------- C3 · Optional Kalman smoothing ---------- */
function kalmanSeries(values,speed){
  if(!values.length)return[];var mean=values.reduce(function(a,b){return a+b},0)/values.length,variance=values.reduce(function(a,b){return a+(b-mean)*(b-mean)},0)/Math.max(1,values.length-1);variance=Math.max(1,variance);
  var qFactor=speed==="slow"?.002:speed==="fast"?.15:.025,R=variance,Q=variance*qFactor,x=values[0],P=variance,out=[x];
  for(var i=1;i<values.length;i++){P+=Q;var K=P/(P+R);x=x+K*(values[i]-x);P=(1-K)*P;out.push(x)}
  return out
}
function renderSmoothingSeries(rows){
  var host=$("gexSmoothingChart"),status=$("smoothingStatus");host.innerHTML="";
  var pts=[];rows.forEach(function(r){var p=analysisProfile(r.data);if(p&&p.net_gex!=null)pts.push({entry:r.entry,v:Number(p.net_gex)})});
  if(pts.length<2){host.innerHTML='<p class="note heatmap-empty">São necessários pelo menos dois snapshots compatíveis.</p>';status.textContent="Histórico insuficiente.";return}
  var raw=pts.map(function(p){return p.v}),smooth=kalmanSeries(raw,state.smoothSpeed),vals=raw.slice();if(state.smoothEnabled)vals=vals.concat(smooth);
  var ymin=Math.min.apply(null,vals),ymax=Math.max.apply(null,vals),pad=(ymax-ymin)*.1||Math.max(1,Math.abs(ymax)*.05);ymin-=pad;ymax+=pad;
  var W=1220,H=310,m={l:78,r:18,t:22,b:46},svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Net GEX bruto e suavizado"},host),x=function(i){return m.l+i/Math.max(1,pts.length-1)*(W-m.l-m.r)},y=function(v){return m.t+(1-(v-ymin)/(ymax-ymin))*(H-m.t-m.b)};
  niceTicks(ymin,ymax,6).forEach(function(t){svgEl("line",{x1:m.l,x2:W-m.r,y1:y(t),y2:y(t),class:t===0?"axis":"grid"},svg);svgText(svg,m.l-8,y(t)+4,compact(t),{"text-anchor":"end"})});
  svgEl("path",{d:raw.map(function(v,i){return(i?"L":"M")+x(i).toFixed(1)+" "+y(v).toFixed(1)}).join(" "),fill:"none",stroke:cssVar("--cyan"),"stroke-width":1.6},svg);
  if(state.smoothEnabled)svgEl("path",{d:smooth.map(function(v,i){return(i?"L":"M")+x(i).toFixed(1)+" "+y(v).toFixed(1)}).join(" "),fill:"none",stroke:cssVar("--purple"),"stroke-width":2.5},svg);
  var every=Math.max(1,Math.ceil(pts.length/9));pts.forEach(function(p,i){if(i%every===0||i===pts.length-1)svgText(svg,x(i),H-m.b+16,p.entry.local_time.slice(0,5),{"text-anchor":"middle"})});
  var lastRaw=raw[raw.length-1],lastSmooth=smooth[smooth.length-1];status.textContent="Atual bruto: "+usd(lastRaw)+(state.smoothEnabled?" · Kalman: "+usd(lastSmooth)+" · diferença "+fmtPct.format(lastRaw?((lastSmooth/lastRaw)-1)*100:0)+"%":" · suavização desativada");
}
function renderSmoothing(){
  $("gexSmoothToggle").checked=state.smoothEnabled;$("gexSmoothSpeed").value=state.smoothSpeed;$("gexSmoothSpeed").disabled=!state.smoothEnabled;
  legend("smoothingLegend",state.smoothEnabled?[{name:"Net GEX bruto",color:cssVar("--cyan")},{name:"Kalman",color:cssVar("--purple")}]:[{name:"Net GEX bruto",color:cssVar("--cyan")}]);
  var cur=currentSnapshotEntry(),day=cur&&cur.local_date;if(!day){$("gexSmoothingChart").innerHTML='<p class="note">Sem dia selecionado.</p>';return}
  loadAnalysisDay(day).then(renderSmoothingSeries)
}

/* ---------- C4 · Deterministic plain-language context ---------- */
function addContextItem(box,title,text,tag){
  var d=document.createElement("div");d.className="context-item";var top=document.createElement("div");top.className="context-item-head";var s=document.createElement("strong");s.textContent=title;var b=document.createElement("span");b.className="context-tag";b.textContent=tag||"Contexto";top.appendChild(s);top.appendChild(b);var p=document.createElement("p");p.textContent=text;d.appendChild(top);d.appendChild(p);box.appendChild(d)
}
function contextOpeningProfile(rows){
  var opening=rows.find(function(r){return r.entry.is_win_open_reference});if(!opening)return null;
  return analysisProfile(opening.data)
}
function renderAutoContextWithDay(rows){
  var box=$("autoContextList"),note=$("autoContextNote"),badge=$("contextScopeBadge"),d=activeGex(),pc=ratioMetrics(d),p=structureProfile(),quality=state.gex.quality||{},opening=contextOpeningProfile(rows||[]);
  box.innerHTML="";badge.textContent=state.expiryFilter==="all"?"Cadeia agregada":"Expiry "+new Date(state.expiryFilter+"T12:00:00").toLocaleDateString("pt-BR");

  if(d.flip!=null){
    var distFlip=(d.spot/d.flip-1)*100;addContextItem(box,"Regime de gamma","O EWZ está "+(distFlip>=0?"acima":"abaixo")+" do Gamma Flip em "+fmt2.format(Math.abs(distFlip))+"%. No modelo atual isso corresponde a "+(d.spot>=d.flip?"regime de gamma positivo, associado a maior potencial de amortecimento de movimentos.":"regime de gamma negativo, associado a maior potencial de amplificação de movimentos.") ,"Estrutura")
  }else addContextItem(box,"Regime de gamma","Não há cruzamento de Gamma Flip dentro da faixa calculada. O Net GEX atual é "+(d.net_gex>=0?"positivo":"negativo")+".","Estrutura");

  var dc=(d.call_wall/d.spot-1)*100,dp=(d.put_wall/d.spot-1)*100,near=Math.abs(dc)<=Math.abs(dp)?"Call Wall":"Put Wall",nearDist=Math.min(Math.abs(dc),Math.abs(dp));
  addContextItem(box,"Walls","A Call Wall está "+fmt2.format(Math.abs(dc))+"% "+(dc>=0?"acima":"abaixo")+" do spot e a Put Wall "+fmt2.format(Math.abs(dp))+"% "+(dp>=0?"acima":"abaixo")+". A região mais próxima é a "+near+" ("+fmt2.format(nearDist)+"%).","Níveis");

  if(pc&&pc.oi_ratio!=null)addContextItem(box,"Composição Put/Call","O P/C por OI está em "+fmt2.format(pc.oi_ratio)+" e o P/C por volume em "+(pc.volume_ratio==null?"—":fmt2.format(pc.volume_ratio))+". Isso indica "+ratioTone(pc.oi_ratio)+" no estoque de posições; volume e OI devem ser interpretados separadamente.","Opções");

  var ivp=ivReferenceProfile(),ts=derivedTermStructure();
  if(ivp)addContextItem(box,"Volatilidade implícita","A IV ATM do vencimento de referência está em "+fmt2.format(ivp.atm_iv_pct)+"%. O RR25 é "+(ivp.rr25_vol_points==null?"indisponível":fmt2.format(ivp.rr25_vol_points)+" vol pts")+" e a term structure está classificada como "+(ts.regime||"insuficiente")+".","IV");

  if(p){var pins=derivedPinning(p);if(pins.length)addContextItem(box,"Gamma Gravity","O maior score de pinning está no strike "+fmt2.format(pins[0].k)+", a "+fmt2.format(pins[0].distance_pct)+"% do spot. O score é relativo ao expiry e não representa probabilidade de fechamento.","Pinning")}

  if(opening&&opening.net_gex!=null){
    var delta=d.net_gex-opening.net_gex,pct=opening.net_gex?delta/Math.abs(opening.net_gex)*100:null;
    var wallTxt="";if(opening.call_wall!=null&&opening.put_wall!=null)wallTxt=" A Call Wall mudou de "+fmt2.format(opening.call_wall)+" para "+fmt2.format(d.call_wall)+" e a Put Wall de "+fmt2.format(opening.put_wall)+" para "+fmt2.format(d.put_wall)+".";
    addContextItem(box,"Desde a abertura","Desde o snapshot ★ da abertura, o Net GEX "+(delta>=0?"aumentou":"diminuiu")+" em "+usd(Math.abs(delta))+(pct==null?"":" ("+fmt2.format(Math.abs(pct))+"% em relação à magnitude inicial)")+"."+wallTxt,"Histórico")
  }

  addContextItem(box,"Qualidade dos dados","O snapshot está classificado como "+(quality.status==="ok"?"OK":quality.status==="warning"?"Atenção":quality.status==="critical"?"Crítico":"sem classificação")+". A fonte de opções é pública e delayed; freshness técnico não equivale a feed real-time.","Qualidade");
  note.textContent="Este texto é gerado por regras determinísticas a partir das métricas exibidas. Ele descreve contexto estrutural e não recomenda compra, venda ou direção futura."
}
function renderAutoContext(){
  var cur=currentSnapshotEntry(),day=cur&&cur.local_date;if(!day){renderAutoContextWithDay([]);return}
  loadAnalysisDay(day).then(renderAutoContextWithDay).catch(function(){renderAutoContextWithDay([])})
}


/* ---------- C5 · Optional price confluence ---------- */
function sma(values,n){var out=new Array(values.length).fill(null),sum=0;for(var i=0;i<values.length;i++){sum+=values[i];if(i>=n)sum-=values[i-n];if(i>=n-1)out[i]=sum/n}return out}
function rollingStd(values,n,means){var out=new Array(values.length).fill(null);for(var i=n-1;i<values.length;i++){var m=means[i],s=0;for(var j=i-n+1;j<=i;j++)s+=(values[j]-m)*(values[j]-m);out[i]=Math.sqrt(s/n)}return out}
function atrSeries(bars,n){
  var tr=bars.map(function(b,i){if(i===0)return b.h-b.l;var pc=bars[i-1].c;return Math.max(b.h-b.l,Math.abs(b.h-pc),Math.abs(b.l-pc))}),out=new Array(bars.length).fill(null);
  if(bars.length<n)return out;var a=tr.slice(0,n).reduce(function(x,y){return x+y},0)/n;out[n-1]=a;for(var i=n;i<tr.length;i++){a=(a*(n-1)+tr[i])/n;out[i]=a}return out
}
function rsiSeries(bars,n){
  var out=new Array(bars.length).fill(null);if(bars.length<=n)return out,g=0,l=0;
  for(var i=1;i<=n;i++){var d=bars[i].c-bars[i-1].c;if(d>=0)g+=d;else l-=d}g/=n;l/=n;out[n]=l===0?100:100-100/(1+g/l);
  for(var k=n+1;k<bars.length;k++){var d2=bars[k].c-bars[k-1].c,gg=Math.max(d2,0),ll=Math.max(-d2,0);g=(g*(n-1)+gg)/n;l=(l*(n-1)+ll)/n;out[k]=l===0?100:100-100/(1+g/l)}return out
}
function confluencePrefs(){
  return{asset:$("confluenceAsset").value,atr:$("showAtr").checked,rsi:$("showRsi").checked,bb:$("showBb").checked}
}
function renderConfluence(){
  var p=confluencePrefs(),bars=lastBars(p.asset),box=$("confluenceKpis"),host=$("confluenceChart"),note=$("confluenceNote");if(!box||!host)return;box.innerHTML="";host.innerHTML="";
  if(bars.length<25){host.innerHTML='<p class="note heatmap-empty">Candles insuficientes para calcular os indicadores.</p>';return}
  var use=bars.slice(-160),close=use.map(function(b){return b.c}),ma=sma(close,20),sd=rollingStd(close,20,ma),atr=atrSeries(use,14),rsi=rsiSeries(use,14),last=use.length-1;
  var upper=ma.map(function(v,i){return v==null||sd[i]==null?null:v+2*sd[i]}),lower=ma.map(function(v,i){return v==null||sd[i]==null?null:v-2*sd[i]});
  var bw=ma[last]!=null&&ma[last]!==0?(upper[last]-lower[last])/ma[last]*100:null,atrPct=atr[last]!=null?atr[last]/close[last]*100:null;
  [["Último preço",p.asset==="win"?fmt0.format(close[last]):"US$ "+fmt2.format(close[last]),p.asset.toUpperCase()],["ATR(14)",atr[last]==null?"—":(p.asset==="win"?fmt0.format(atr[last]):fmt2.format(atr[last])),atrPct==null?"—":fmt2.format(atrPct)+"% do preço"],["RSI(14)",rsi[last]==null?"—":fmt2.format(rsi[last]),rsi[last]==null?"—":rsi[last]>=70?"zona alta":rsi[last]<=30?"zona baixa":"faixa intermediária"],["Bollinger width",bw==null?"—":fmt2.format(bw)+"%",ma[last]==null?"—":"SMA20 ± 2σ"]].forEach(function(k){var d=document.createElement("div");d.className="confluence-kpi";d.innerHTML="<span></span><strong></strong><small></small>";d.children[0].textContent=k[0];d.children[1].textContent=k[1];d.children[2].textContent=k[2];box.appendChild(d)});

  var W=1220,H=440,m={l:70,r:18,t:20,b:42},priceTop=m.t,priceBottom=235,oscTop=265,oscBottom=H-m.b,x=function(i){return m.l+i/Math.max(1,use.length-1)*(W-m.l-m.r)};
  var priceVals=[];use.forEach(function(b,i){priceVals.push(b.h,b.l);if(p.bb&&upper[i]!=null){priceVals.push(upper[i],lower[i])}});var ymin=Math.min.apply(null,priceVals),ymax=Math.max.apply(null,priceVals),pad=(ymax-ymin)*.05||1;ymin-=pad;ymax+=pad;
  var py=function(v){return priceTop+(1-(v-ymin)/(ymax-ymin))*(priceBottom-priceTop)},svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Indicadores de confluência de preço"},host);
  niceTicks(ymin,ymax,5).forEach(function(t){svgEl("line",{x1:m.l,x2:W-m.r,y1:py(t),y2:py(t),class:"grid"},svg);svgText(svg,m.l-7,py(t)+4,p.asset==="win"?fmt0.format(t):fmt2.format(t),{"text-anchor":"end"})});
  svgEl("path",{d:close.map(function(v,i){return(i?"L":"M")+x(i).toFixed(1)+" "+py(v).toFixed(1)}).join(" "),fill:"none",stroke:cssVar("--text"),"stroke-width":1.5},svg);
  function nullablePath(vals,color,dash){var d="",open=false;vals.forEach(function(v,i){if(v==null){open=false;return}d+=(open?"L":"M")+x(i).toFixed(1)+" "+py(v).toFixed(1)+" ";open=true});if(d)svgEl("path",{d:d,fill:"none",stroke:color,"stroke-width":1.5,"stroke-dasharray":dash||""},svg)}
  if(p.bb){nullablePath(upper,cssVar("--purple"));nullablePath(ma,cssVar("--cyan"),"4 3");nullablePath(lower,cssVar("--purple"))}
  if(p.rsi){
    var rY=function(v){return oscTop+(1-v/100)*(oscBottom-oscTop)};
    [30,50,70].forEach(function(v){svgEl("line",{x1:m.l,x2:W-m.r,y1:rY(v),y2:rY(v),stroke:v===50?cssVar("--grid"):cssVar("--axis"),"stroke-dasharray":"4 4"},svg);svgText(svg,m.l-7,rY(v)+4,String(v),{"text-anchor":"end"})});
    var rd="",open=false;rsi.forEach(function(v,i){if(v==null){open=false;return}rd+=(open?"L":"M")+x(i).toFixed(1)+" "+rY(v).toFixed(1)+" ";open=true});if(rd)svgEl("path",{d:rd,fill:"none",stroke:cssVar("--orange"),"stroke-width":1.8},svg)
  }else if(p.atr){
    var av=atr.filter(function(v){return v!=null}),amax=Math.max.apply(null,av)||1,aY=function(v){return oscTop+(1-v/amax)*(oscBottom-oscTop)},ad="",open=false;atr.forEach(function(v,i){if(v==null){open=false;return}ad+=(open?"L":"M")+x(i).toFixed(1)+" "+aY(v).toFixed(1)+" ";open=true});if(ad)svgEl("path",{d:ad,fill:"none",stroke:cssVar("--green"),"stroke-width":1.8},svg)
  }
  var every=Math.max(1,Math.ceil(use.length/8));use.forEach(function(b,i){if(i%every===0||i===use.length-1)svgText(svg,x(i),H-m.b+17,timeLabel(b.t,false),{"text-anchor":"middle"})});
  var li=[{name:"Preço",color:cssVar("--text")}];if(p.bb)li.push({name:"Bollinger",color:cssVar("--purple")});if(p.rsi)li.push({name:"RSI(14)",color:cssVar("--orange")});if(p.atr)li.push({name:"ATR(14) no KPI"+(p.rsi?"":" / painel inferior"),color:cssVar("--green")});legend("confluenceLegend",li);
  note.textContent="Indicadores calculados apenas sobre candles de 5 minutos do "+p.asset.toUpperCase()+". São confluências opcionais e não alteram GEX, Walls, Flip ou qualquer modelo de opções."
}

/* ---------- D1 · OI-weighted vs volume-weighted gamma ---------- */
function pearson(xs,ys){var n=Math.min(xs.length,ys.length);if(n<2)return null;var mx=xs.reduce(function(a,b){return a+b},0)/n,my=ys.reduce(function(a,b){return a+b},0)/n,num=0,dx=0,dy=0;for(var i=0;i<n;i++){var a=xs[i]-mx,b=ys[i]-my;num+=a*b;dx+=a*a;dy+=b*b}return dx&&dy?num/Math.sqrt(dx*dy):null}
function renderWeightingModels(){
  var d=activeGex(),box=$("weightingKpis"),host=$("weightingChart"),badge=$("weightingScopeBadge"),note=$("weightingNote");if(!box||!host)return;box.innerHTML="";host.innerHTML="";
  badge.textContent=state.expiryFilter==="all"?"Cadeia agregada":"Expiry "+new Date(state.expiryFilter+"T12:00:00").toLocaleDateString("pt-BR");
  if(d.volume_gamma_total==null||!Array.isArray(d.volume_gamma_strikes)){
    host.innerHTML='<p class="note heatmap-empty">Este snapshot ainda não possui o proxy gamma ponderado por volume. Selecione um snapshot v7+ ou aguarde a próxima coleta.</p>';note.textContent="OI-weighted continua disponível normalmente; o modelo por volume exige o novo schema.";return
  }
  var oiRows=d.strikes||[],vm={};d.volume_gamma_strikes.forEach(function(r){vm[Number(r.k)]=r});var rows=oiRows.map(function(r){var v=vm[Number(r.k)]||{net:0,call:0,put:0};return{k:Number(r.k),oi:Number(r.net||0),vol:Number(v.net||0)}}).filter(function(r){return r.k>=d.spot*(1-state.range)&&r.k<=d.spot*(1+state.range)});
  var corr=pearson(rows.map(function(r){return r.oi}),rows.map(function(r){return r.vol}));
  [["OI-weighted total",usd(d.net_gex),"inventário aberto"],["Volume-weighted total",usd(d.volume_gamma_total),"atividade da sessão"],["Wall OI",fmt2.format(d.max_abs_strike),"maior |GEX|"],["Wall Volume",d.volume_max_abs_strike==null?"—":fmt2.format(d.volume_max_abs_strike),"maior |proxy|"],["Correlação por strike",corr==null?"—":fmt2.format(corr),"forma dos perfis"]].forEach(function(k){var el=document.createElement("div");el.className="weighting-kpi";el.innerHTML="<span></span><strong></strong><small></small>";el.children[0].textContent=k[0];el.children[1].textContent=k[1];el.children[2].textContent=k[2];box.appendChild(el)});
  if(!rows.length)return;
  var oiMax=Math.max.apply(null,rows.map(function(r){return Math.abs(r.oi)}))||1,volMax=Math.max.apply(null,rows.map(function(r){return Math.abs(r.vol)}))||1,W=1220,H=330,m={l:62,r:18,t:22,b:48},x=function(i){return m.l+i/Math.max(1,rows.length-1)*(W-m.l-m.r)},y=function(v){return m.t+(1-(v+100)/200)*(H-m.t-m.b)},svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Comparação OI e Volume weighted Gamma"},host);
  [-100,-50,0,50,100].forEach(function(t){svgEl("line",{x1:m.l,x2:W-m.r,y1:y(t),y2:y(t),class:t===0?"axis":"grid"},svg);svgText(svg,m.l-7,y(t)+4,t+"%",{"text-anchor":"end"})});
  var oiNorm=rows.map(function(r){return r.oi/oiMax*100}),volNorm=rows.map(function(r){return r.vol/volMax*100});
  svgEl("path",{d:oiNorm.map(function(v,i){return(i?"L":"M")+x(i).toFixed(1)+" "+y(v).toFixed(1)}).join(" "),fill:"none",stroke:cssVar("--blue"),"stroke-width":2},svg);
  svgEl("path",{d:volNorm.map(function(v,i){return(i?"L":"M")+x(i).toFixed(1)+" "+y(v).toFixed(1)}).join(" "),fill:"none",stroke:cssVar("--orange"),"stroke-width":2},svg);
  var every=Math.max(1,Math.ceil(rows.length/10));rows.forEach(function(r,i){if(i%every===0||i===rows.length-1)svgText(svg,x(i),H-m.b+16,fmt2.format(r.k),{"text-anchor":"middle"})});
  legend("weightingLegend",[{name:"OI-weighted GEX · normalizado",color:cssVar("--blue")},{name:"Volume-weighted gamma · normalizado",color:cssVar("--orange")}]);
  note.textContent="O gráfico normaliza cada perfil pela própria maior magnitude para comparar a forma. Os valores absolutos não devem ser somados: OI representa inventário; volume representa atividade acumulada."
}

function gammaZones(mapper){
  var d=activeGex(),rows=d.strikes.slice().sort(function(a,b){return a.k-b.k}),gap=Infinity;
  for(var i=1;i<rows.length;i++)gap=Math.min(gap,rows[i].k-rows[i-1].k);if(!isFinite(gap))gap=.5;
  var candidates=rows.filter(function(r){return r.net!==0}).sort(function(a,b){return Math.abs(b.net)-Math.abs(a.net)}).slice(0,state.zoneCount);
  var max=candidates.length?Math.abs(candidates[0].net):1;
  return candidates.map(function(r){return{center:mapper(r.k),lo:mapper(r.k-gap*.36),hi:mapper(r.k+gap*.36),positive:r.net>0,strength:Math.max(.12,Math.abs(r.net)/max)}})
}
function zoneOpacity(z){
  var mult=state.zoneOpacity==="low"?.55:state.zoneOpacity==="high"?1.6:1;
  return Math.min(.2,(.025+.08*z.strength)*mult).toFixed(3)
}
function renderViewControls(){
  var showZones=state.viewMode!=="levels";
  $("gexViewMode").value=state.viewMode;
  $("zoneCountSel").value=String(state.zoneCount);
  $("zoneOpacitySel").value=state.zoneOpacity;
  $("zoneCountSel").disabled=!showZones;
  $("zoneOpacitySel").disabled=!showZones;
  $("zoneCountWrap").classList.toggle("disabled",!showZones);
  $("zoneOpacityWrap").classList.toggle("disabled",!showZones);
  var msg=state.viewMode==="levels"
    ?"Níveis principais ativos; faixas de intensidade desativadas."
    :state.viewMode==="intensity"
      ?"Somente as "+state.zoneCount+" faixas de maior |GEX| estão ativas; níveis principais ocultos."
      :"Níveis principais e as "+state.zoneCount+" faixas de maior |GEX| estão ativos.";
  $("gexViewHint").textContent=msg+" Intensidade visual: "+(state.zoneOpacity==="low"?"suave":state.zoneOpacity==="high"?"forte":"média")+"."
}
function timeLabel(ts,multi){var d=new Date(ts*1000);return d.toLocaleString("pt-BR",multi?{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}:{hour:"2-digit",minute:"2-digit"})}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function chartView(key,total){
  var v=state.chartViews[key];
  if(total<=0){
    if(!v){v={count:0,end:0,yZoom:1,yPan:0};state.chartViews[key]=v}
    return v
  }
  if(!v){v={count:Math.min(130,total),end:total,yZoom:1,yPan:0};state.chartViews[key]=v}
  v.count=clamp(Math.round(v.count||130),Math.min(20,total),total);
  v.end=clamp(v.end||total,v.count,total);
  v.yZoom=clamp(v.yZoom||1,.4,8);
  v.yPan=clamp(v.yPan||0,-5,5);
  return v
}
function resetChartView(key){
  var total=lastBars(key).length;
  state.chartViews[key]={count:Math.min(130,total||130),end:total||0,yZoom:1,yPan:0}
}
function viewStatus(key,total){
  var el=$(key+"ViewStatus");if(!el)return;
  if(total<=0){el.textContent="sem dados";return}
  var v=chartView(key,total),xZoom=(130/Math.max(1,v.count)).toFixed(2);
  el.textContent=v.count+" candles · X "+xZoom+"× · Y "+v.yZoom.toFixed(2)+"×"+(v.end<total?" · histórico":" · último")
}
function renderPrice(key){
  if(key==="ewz")priceChart("chartEwz","ewz",function(v){return v},"legendEwz");
  else priceChart("chartWin","win",function(v){return toWin(v)},"legendWin")
}
function adjustChartView(key,action){
  var total=lastBars(key).length;if(!total)return;
  var v=chartView(key,total);
  if(action==="x-in")v.count=Math.max(20,Math.round(v.count/1.35));
  else if(action==="x-out")v.count=Math.min(total,Math.round(v.count*1.35));
  else if(action==="left")v.end=Math.max(v.count,v.end-Math.max(1,Math.round(v.count*.18)));
  else if(action==="right")v.end=Math.min(total,v.end+Math.max(1,Math.round(v.count*.18)));
  else if(action==="y-in")v.yZoom=Math.min(8,v.yZoom*1.3);
  else if(action==="y-out")v.yZoom=Math.max(.4,v.yZoom/1.3);
  else if(action==="up")v.yPan=clamp(v.yPan+.14/v.yZoom,-5,5);
  else if(action==="down")v.yPan=clamp(v.yPan-.14/v.yZoom,-5,5);
  else if(action==="center-y")v.yPan=0;
  else if(action==="latest")v.end=total;
  else if(action==="reset"){resetChartView(key);v=state.chartViews[key]}
  if(v.count>total)v.count=total;
  if(v.end<v.count)v.end=v.count;
  renderPrice(key)
}
function startChartDrag(e,key,plotW,plotH,total){
  if(e.pointerType==="touch"||e.button!==0)return;
  var v=chartView(key,total);
  dragState={key:key,startX:e.clientX,startY:e.clientY,startEnd:v.end,startPan:v.yPan,count:v.count,plotW:plotW,plotH:plotH,total:total};
  hideTip();
  function move(ev){
    if(!dragState||dragState.key!==key)return;
    var dx=ev.clientX-dragState.startX,dy=ev.clientY-dragState.startY;
    var vv=chartView(key,total);
    var shift=Math.round(dx/Math.max(1,dragState.plotW)*dragState.count);
    vv.end=clamp(dragState.startEnd-shift,vv.count,total);
    vv.yPan=clamp(dragState.startPan+dy/Math.max(1,dragState.plotH)/Math.max(.4,vv.yZoom),-5,5);
    if(!dragRAF){dragRAF=requestAnimationFrame(function(){dragRAF=null;renderPrice(key)})}
  }
  function up(){
    window.removeEventListener("pointermove",move);
    window.removeEventListener("pointerup",up);
    window.removeEventListener("pointercancel",up);
    dragState=null
  }
  window.addEventListener("pointermove",move);
  window.addEventListener("pointerup",up);
  window.addEventListener("pointercancel",up)
}
function priceChart(id,key,mapper,legendId){
  var host=$(id);host.innerHTML="";var all=lastBars(key);
  if(!all.length){host.innerHTML='<p class="note">Dados de preço indisponíveis nesta coleta.</p>';viewStatus(key,0);return}
  var view=chartView(key,all.length),start=Math.max(0,view.end-view.count),bars=all.slice(start,view.end);
  if(bars.length<2){host.innerHTML='<p class="note">Poucos candles para desenhar o gráfico.</p>';return}
  var showLevels=state.viewMode!=="intensity",showZones=state.viewMode!=="levels";
  var last=bars[bars.length-1].c,zones=showZones?gammaZones(mapper):[],keys=showLevels?levelRows().filter(function(r){return r.v!=null}).map(function(r){return{name:r.name,v:mapper(r.v),color:r.color}}):[];
  var relevant=keys.filter(function(k){return k.v&&Math.abs(k.v/last-1)<=.25}),priceVals=[];
  bars.forEach(function(b){priceVals.push(b.l,b.h)});
  var rawMin=Math.min.apply(null,priceVals),rawMax=Math.max.apply(null,priceVals),rawRange=Math.max(1e-9,rawMax-rawMin);
  var minPad=key==="win"?10:.01,basePad=Math.max(rawRange*.025,minPad);
  var baseMin=rawMin-basePad,baseMax=rawMax+basePad;
  var baseRange=Math.max(1e-9,baseMax-baseMin),baseMid=(rawMax+rawMin)/2,visibleRange=baseRange/view.yZoom,mid=baseMid+view.yPan*baseRange;
  var ymin=mid-visibleRange/2,ymax=mid+visibleRange/2;
  var W=1220,H=440,m={l:72,r:125,t:22,b:46},plotW=W-m.l-m.r,plotH=H-m.t-m.b;
  var svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Gráfico de preço interativo com zonas de Gamma Exposure"},host);
  var defs=svgEl("defs",{},svg),clip=svgEl("clipPath",{id:"clip-"+key},defs);svgEl("rect",{x:m.l,y:m.t,width:plotW,height:plotH},clip);
  var plot=svgEl("g",{"clip-path":"url(#clip-"+key+")"},svg);
  var x=function(i){return m.l+i/(bars.length-1)*plotW},y=function(v){return m.t+(1-(v-ymin)/(ymax-ymin))*plotH};
  niceTicks(ymin,ymax,6).forEach(function(t){svgEl("line",{x1:m.l,x2:W-m.r,y1:y(t),y2:y(t),class:"grid"},svg);svgText(svg,m.l-8,y(t)+4,key==="win"?fmt0.format(t):fmt2.format(t),{"text-anchor":"end"})});
  if(showLevels){
    var gd=activeGex(),flip=gd.flip==null?null:mapper(gd.flip);
    if(flip!=null&&flip>ymin&&flip<ymax){
      var fy=y(flip);svgEl("rect",{x:m.l,y:m.t,width:plotW,height:Math.max(0,fy-m.t),fill:cssVar("--green"),"fill-opacity":.035},plot);
      svgEl("rect",{x:m.l,y:fy,width:plotW,height:Math.max(0,H-m.b-fy),fill:cssVar("--red"),"fill-opacity":.035},plot)
    }
  }
  zones.forEach(function(z){if(!z.center||z.hi<ymin||z.lo>ymax)return;var top=y(Math.min(ymax,z.hi)),bot=y(Math.max(ymin,z.lo));svgEl("rect",{x:m.l,y:top,width:plotW,height:Math.max(1,bot-top),fill:z.positive?cssVar("--blue"):cssVar("--orange"),"fill-opacity":zoneOpacity(z)},plot)});
  relevant.forEach(function(k){if(k.v<ymin||k.v>ymax)return;var yy=y(k.v),dash=k.name==="Gamma Flip"?"7 4":"4 3";svgEl("line",{x1:m.l,x2:W-m.r,y1:yy,y2:yy,stroke:k.color,"stroke-width":k.name==="Gamma Flip"?2:1.4,"stroke-dasharray":dash},plot);svgText(svg,W-m.r+7,yy+4,k.name.replace("Preço EWZ do GEX","GEX spot")+" "+(key==="win"?fmt0.format(k.v):fmt2.format(k.v)),{class:"lbl",style:"fill:"+k.color})});
  if(state.advancedOverlay!=="none"){
    var gd=activeGex(),metric=state.advancedOverlay,col=metricColor(metric);
    var tops=(gd.strikes||[]).filter(function(s){return s[metric]!=null}).sort(function(a,b){return Math.abs(b[metric])-Math.abs(a[metric])}).slice(0,3);
    tops.forEach(function(s,idx){var lv=mapper(s.k);if(lv==null||lv<ymin||lv>ymax)return;var yy=y(lv);svgEl("line",{x1:m.l,x2:W-m.r,y1:yy,y2:yy,stroke:col,"stroke-width":1.2,"stroke-dasharray":"2 5","stroke-opacity":.8},plot);svgText(svg,W-m.r+7,yy-4,metricLabel(metric)+" #"+(idx+1)+" "+(key==="win"?fmt0.format(lv):fmt2.format(lv)),{class:"lbl",style:"fill:"+col})})
  }
  var step=plotW/Math.max(1,bars.length-1),bw=Math.max(2,Math.min(10,step*.62));
  bars.forEach(function(b,i){var xx=x(i),up=b.c>=b.o,col=up?cssVar("--green"):cssVar("--red");svgEl("line",{x1:xx,x2:xx,y1:y(b.h),y2:y(b.l),stroke:col,"stroke-width":1},plot);var top=y(Math.max(b.o,b.c)),bot=y(Math.min(b.o,b.c));svgEl("rect",{x:xx-bw/2,y:top,width:bw,height:Math.max(1,bot-top),fill:col,rx:.7},plot)});
  var multi=new Date(bars[0].t*1000).toDateString()!==new Date(bars[bars.length-1].t*1000).toDateString();
  for(var j=0;j<6;j++){var ix=Math.round((bars.length-1)*j/5);svgText(svg,x(ix),H-m.b+18,timeLabel(bars[ix].t,multi),{"text-anchor":j===0?"start":j===5?"end":"middle"})}
  var targetTs=targetGexTime();
  if(targetTs!=null){
    var snapIx=0,snapDist=Infinity;
    bars.forEach(function(b,i){var d=Math.abs(b.t-targetTs);if(d<snapDist){snapDist=d;snapIx=i}});
    if(snapDist<=1800){
      var sx=x(snapIx);svgEl("line",{x1:sx,x2:sx,y1:m.t,y2:H-m.b,stroke:cssVar("--purple"),"stroke-width":1.5,"stroke-dasharray":"5 4"},plot);
      svgText(svg,sx+5,m.t+16,"GEX "+timeLabel(bars[snapIx].t,false),{class:"lbl",style:"fill:"+cssVar("--purple")})
    }
  }
  var cross=svgEl("line",{y1:m.t,y2:H-m.b,stroke:cssVar("--axis"),"stroke-width":1,visibility:"hidden"},svg);
  var hit=svgEl("rect",{x:m.l,y:m.t,width:plotW,height:plotH,class:"hit"},svg);
  hit.addEventListener("pointerdown",function(e){startChartDrag(e,key,plotW,plotH,all.length)});
  hit.addEventListener("pointermove",function(e){
    if(dragState&&dragState.key===key)return;
    var box=svg.getBoundingClientRect(),vx=(e.clientX-box.left)/box.width*W,ix=Math.max(0,Math.min(bars.length-1,Math.round((vx-m.l)/plotW*(bars.length-1)))),b=bars[ix];
    cross.setAttribute("x1",x(ix));cross.setAttribute("x2",x(ix));cross.setAttribute("visibility","visible");
    showTip(e,timeLabel(b.t,true),[["Abertura",key==="win"?fmt0.format(b.o):fmt2.format(b.o)],["Máxima",key==="win"?fmt0.format(b.h):fmt2.format(b.h)],["Mínima",key==="win"?fmt0.format(b.l):fmt2.format(b.l)],["Fechamento",key==="win"?fmt0.format(b.c):fmt2.format(b.c)],["Volume",fmt0.format(b.v||0)]])
  });
  hit.addEventListener("pointerleave",function(){if(!dragState){hideTip();cross.setAttribute("visibility","hidden")}});
  hit.addEventListener("dblclick",function(){resetChartView(key);renderPrice(key)});
  hit.addEventListener("wheel",function(e){
    if(!(e.ctrlKey||e.metaKey||e.shiftKey))return;
    e.preventDefault();
    var action;
    if(e.shiftKey)action=e.deltaY<0?"y-in":"y-out";
    else action=e.deltaY<0?"x-in":"x-out";
    adjustChartView(key,action)
  },{passive:false});
  var legendItems=[{name:"Alta",color:cssVar("--green"),cls:"sq"},{name:"Baixa",color:cssVar("--red"),cls:"sq"}];
  if(showZones){legendItems.push({name:"Faixas GEX +",color:cssVar("--blue"),cls:"sq"},{name:"Faixas GEX −",color:cssVar("--orange"),cls:"sq"})}
  if(showLevels){legendItems.push({name:"Gamma Flip / níveis",color:cssVar("--purple"),dash:true})}
  if(state.advancedOverlay!=="none"){legendItems.push({name:"Top "+metricLabel(state.advancedOverlay),color:metricColor(state.advancedOverlay),dash:true})}
  legend(legendId,legendItems);viewStatus(key,all.length)
}
function renderPrices(){renderPrice("ewz");renderPrice("win")}
function renderAll(){renderHeader();renderQuality();renderExpiryControls();renderKpis();renderTable();renderViewControls();renderSnapshotControls();renderCompareControls();renderTimeMapControls();renderOiControls();chartGex();chartHeatmap();renderComparison();renderStructure();renderAdvanced();renderIV();renderStress();renderPinning();renderScorecard();renderReceipts();renderVolumeAnomaly();renderPutCall();renderSmoothing();renderAutoContext();renderConfluence();renderWeightingModels();renderPrices()}
function getJson(path){return fetch(path+"?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error(path+" HTTP "+r.status);return r.json()})}
function init(){
  var saved=parseFloat(store("gex.manualWin"));if(saved>0){state.manualWin=saved;$("winInput").value=String(saved)}
  var savedMode=store("gex.viewMode"),savedCount=parseInt(store("gex.zoneCount"),10),savedOpacity=store("gex.zoneOpacity"),savedSmooth=store("gex.smoothEnabled"),savedSmoothSpeed=store("gex.smoothSpeed");
  if(["levels","intensity","both"].indexOf(savedMode)>=0)state.viewMode=savedMode;
  if([3,5,7,10].indexOf(savedCount)>=0)state.zoneCount=savedCount;
  if(["low","medium","high"].indexOf(savedOpacity)>=0)state.zoneOpacity=savedOpacity;
  state.smoothEnabled=savedSmooth==="1";
  if(["slow","medium","fast"].indexOf(savedSmoothSpeed)>=0)state.smoothSpeed=savedSmoothSpeed;
  $("rangeSel").addEventListener("change",function(e){state.range=parseFloat(e.target.value);chartGex();chartHeatmap();renderComparison();renderAdvanced();var d=$("timeMapDateSelect").value;if(d&&state.timeMapCache[d])renderTimeMap(d)});
  $("expirySelect").addEventListener("change",function(e){state.expiryFilter=e.target.value;state.stressScenario=null;renderExpiryControls();renderKpis();renderTable();chartGex();chartHeatmap();renderStructure();renderAdvanced();renderIV();renderStress();renderPinning();renderVolumeAnomaly();renderPutCall();renderSmoothing();renderAutoContext();renderWeightingModels();renderPrices();var d=$("timeMapDateSelect").value;if(d)loadTimeMapDay(d);var od=$("oiDateSelect").value;if(od)loadOiDelta(od)});
  $("timeMapDateSelect").addEventListener("change",function(e){loadTimeMapDay(e.target.value)});
  $("oiDateSelect").addEventListener("change",function(e){loadOiDelta(e.target.value)});
  $("advancedMetricSelect").addEventListener("change",function(e){state.advancedMetric=e.target.value;renderAdvanced()});
  $("advancedOverlaySelect").addEventListener("change",function(e){state.advancedOverlay=e.target.value;renderPrices()});
  $("runStressBtn").addEventListener("click",runStressScenario);
  $("resetStressBtn").addEventListener("click",function(){$("stressSpotPct").value="0";$("stressIvPts").value="0";$("stressDays").value="0";state.stressScenario=null;renderStress()});
  $("saveReceiptBtn").addEventListener("click",saveStressReceipt);
  $("exportReceiptsBtn").addEventListener("click",function(){downloadJson("gex-analysis-receipts.json",{version:1,exported_at:new Date().toISOString(),receipts:state.receipts})});
  $("scorecardHorizon").addEventListener("change",renderScorecard);
  ["confluenceAsset","showAtr","showRsi","showBb"].forEach(function(id){$(id).addEventListener("change",renderConfluence)});
  $("gexSmoothToggle").addEventListener("change",function(e){state.smoothEnabled=e.target.checked;store("gex.smoothEnabled",state.smoothEnabled?"1":"0");renderSmoothing()});
  $("gexSmoothSpeed").addEventListener("change",function(e){state.smoothSpeed=e.target.value;store("gex.smoothSpeed",state.smoothSpeed);renderSmoothing()});
  $("compareBtn").addEventListener("click",loadCompare);
  $("compareSwapBtn").addEventListener("click",function(){var a=$("compareASelect").value,b=$("compareBSelect").value;$("compareASelect").value=b;$("compareBSelect").value=a;loadCompare()});
  document.querySelectorAll(".chart-tool").forEach(function(btn){btn.addEventListener("click",function(){adjustChartView(btn.getAttribute("data-chart"),btn.getAttribute("data-action"))})});
  $("snapshotDateSelect").addEventListener("change",function(e){populateSnapshotTimes(e.target.value,null);var ga=$("snapshotTimeSelect").value,entry=snapshotEntries().find(function(s){return s.generated_at===ga});loadSnapshotEntry(entry)});
  $("snapshotTimeSelect").addEventListener("change",function(e){var entry=snapshotEntries().find(function(s){return s.generated_at===e.target.value});loadSnapshotEntry(entry)});
  $("latestSnapshotBtn").addEventListener("click",selectLatestSnapshot);
  $("gexViewMode").addEventListener("change",function(e){state.viewMode=e.target.value;store("gex.viewMode",state.viewMode);if(state.gex){renderViewControls();renderPrices()}});
  $("zoneCountSel").addEventListener("change",function(e){state.zoneCount=parseInt(e.target.value,10);store("gex.zoneCount",String(state.zoneCount));if(state.gex){renderViewControls();renderPrices()}});
  $("zoneOpacitySel").addEventListener("change",function(e){state.zoneOpacity=e.target.value;store("gex.zoneOpacity",state.zoneOpacity);if(state.gex){renderViewControls();renderPrices()}});
  $("resetViewBtn").addEventListener("click",function(){state.viewMode="levels";state.zoneCount=7;state.zoneOpacity="medium";state.advancedOverlay="none";$("advancedOverlaySelect").value="none";store("gex.viewMode","levels");store("gex.zoneCount","7");store("gex.zoneOpacity","medium");if(state.gex){renderViewControls();renderPrices()}});
  $("winForm").addEventListener("submit",function(e){e.preventDefault();var raw=$("winInput").value.replace(/\./g,"").replace(",", "."),v=parseFloat(raw);state.manualWin=v>0?v:null;store("gex.manualWin",state.manualWin?String(state.manualWin):"");if(state.gex)renderAll()});
  $("autoBtn").addEventListener("click",function(){state.manualWin=null;$("winInput").value="";store("gex.manualWin","");if(state.gex)renderAll()});
  loadReceipts();
  Promise.all([
    getJson("data/latest.json"),
    getJson("data/prices.json").catch(function(){return null}),
    getJson("data/gex-snapshots/index.json").catch(function(){return {snapshots:[]}})
  ]).then(function(r){
    state.liveLatest=r[0];state.gex=r[0];state.prices=r[1];state.snapshotIndex=r[2];
    state.selectedSnapshot=snapshotEntries().find(function(s){return s.generated_at===state.gex.generated_at})||null;
    renderAll();
    if(state.prices&&state.prices.errors&&state.prices.errors.length){var b=$("errorBanner");b.hidden=false;b.textContent="Aviso na coleta de preços: "+state.prices.errors.join(" · ")}
  }).catch(function(err){$("status").textContent="Não foi possível carregar o dashboard.";var b=$("errorBanner");b.hidden=false;b.textContent=err.message})
}
init();
})();