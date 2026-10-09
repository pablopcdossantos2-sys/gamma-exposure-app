/* Dashboard GEX EWZ -> WIN. Sem bibliotecas externas. */
(function(){
"use strict";
var NS="http://www.w3.org/2000/svg",WIN_TICK=5;
var state={gex:null,prices:null,range:.15,manualWin:null,viewMode:"levels",zoneCount:7,zoneOpacity:"medium",chartViews:{ewz:null,win:null}};
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
function conversionRatio(){
  var eb=lastBars("ewz"),wb=lastBars("win"),ewz=eb.length?eb[eb.length-1].c:null;
  if(!ewz)return null;
  if(state.manualWin&&state.manualWin>0)return state.manualWin/ewz;
  if(!wb.length)return null;
  var winByTime={};wb.slice(-220).forEach(function(b){winByTime[b.t]=b.c});
  for(var i=eb.length-1;i>=Math.max(0,eb.length-220);i--){if(winByTime[eb[i].t])return winByTime[eb[i].t]/eb[i].c}
  return wb[wb.length-1].c/ewz
}
function toWin(v){var r=conversionRatio();return v==null||!r?null:Math.round(v*r/WIN_TICK)*WIN_TICK}
function niceTicks(min,max,n){var span=max-min||1,step=Math.pow(10,Math.floor(Math.log10(span/n))),err=span/n/step;step*=err>=7.5?10:err>=3.5?5:err>=1.5?2:1;var out=[],v=Math.ceil(min/step)*step;for(;v<=max+step*1e-6;v+=step)out.push(Math.abs(v)<step*1e-9?0:v);return out}
function compact(v){var a=Math.abs(v),s=v<0?"−":"";if(a>=1e9)return s+fmt2.format(a/1e9)+" bi";if(a>=1e6)return s+fmt2.format(a/1e6)+" mi";if(a>=1e3)return s+fmt0.format(a/1e3)+" mil";return s+fmt0.format(a)}
var tip=$("tip");
function showTip(ev,title,rows){tip.innerHTML="";var b=document.createElement("b");b.textContent=title;tip.appendChild(b);rows.forEach(function(r){var d=document.createElement("div");d.className="r";var a=document.createElement("span"),c=document.createElement("span");a.textContent=r[0];c.textContent=r[1];d.appendChild(a);d.appendChild(c);tip.appendChild(d)});tip.hidden=false;var x=ev.clientX+14,y=ev.clientY+14;if(x+tip.offsetWidth>innerWidth-8)x=ev.clientX-tip.offsetWidth-14;if(y+tip.offsetHeight>innerHeight-8)y=ev.clientY-tip.offsetHeight-14;tip.style.left=Math.max(8,x)+"px";tip.style.top=Math.max(8,y)+"px"}
function hideTip(){tip.hidden=true}
function legend(id,items){var box=$(id);box.innerHTML="";items.forEach(function(it){var s=document.createElement("span"),i=document.createElement("i");i.style.background=it.color;if(it.cls)i.className=it.cls;if(it.dash){i.className="dash";i.style.color=it.color} s.appendChild(i);s.appendChild(document.createTextNode(it.name));box.appendChild(s)})}

function levelRows(){
  var d=state.gex;
  return[
    {name:"Call Wall",v:d.call_wall,color:cssVar("--blue"),note:"Maior GEX de calls; resistência/oferta potencial."},
    {name:"Gamma Flip",v:d.flip,color:cssVar("--purple"),note:"Divisor entre regime de gamma positivo e negativo."},
    {name:"Preço EWZ do GEX",v:d.spot,color:cssVar("--text"),note:"Preço de referência usado no cálculo do GEX."},
    {name:"Put Wall",v:d.put_wall,color:cssVar("--orange"),note:"Maior magnitude de GEX de puts; suporte/demanda potencial."},
    {name:"Maior |GEX|",v:d.max_abs_strike,color:cssVar("--cyan"),note:"Strike com maior GEX líquido absoluto."}
  ]
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
function renderKpis(){
  var d=state.gex,b=$("kpis");b.innerHTML="";
  [
    ["EWZ / regime","US$ "+fmt2.format(d.spot),regime(d),cssVar("--text")],
    ["GEX líquido",usd(d.net_gex),d.n_contracts+" contratos",cssVar("--cyan")],
    ["Call Wall","US$ "+fmt2.format(d.call_wall),"WIN "+(toWin(d.call_wall)==null?"—":fmt0.format(toWin(d.call_wall))),cssVar("--blue")],
    ["Gamma Flip",d.flip==null?"—":"US$ "+fmt2.format(d.flip),d.flip==null?"sem cruzamento":toWin(d.flip)==null?"WIN —":"WIN "+fmt0.format(toWin(d.flip)),cssVar("--purple")],
    ["Put Wall","US$ "+fmt2.format(d.put_wall),"WIN "+(toWin(d.put_wall)==null?"—":fmt0.format(toWin(d.put_wall))),cssVar("--orange")]
  ].forEach(function(it){var k=document.createElement("div");k.className="kpi";var l=document.createElement("div");l.className="lab";var dot=document.createElement("i");dot.className="dot";dot.style.background=it[3];l.appendChild(dot);l.appendChild(document.createTextNode(it[0]));var big=document.createElement("div");big.className="big";big.textContent=it[1];var sm=document.createElement("div");sm.className="small";sm.textContent=it[2];k.appendChild(l);k.appendChild(big);k.appendChild(sm);b.appendChild(k)})
}
function renderTable(){
  var d=state.gex,t=document.querySelector("#levelsTable tbody");t.innerHTML="";
  levelRows().forEach(function(r){var tr=document.createElement("tr"),dist=r.v==null?"—":r.name==="Preço EWZ do GEX"?"—":fmtPct.format((r.v/d.spot-1)*100)+"%";[
    r.name,r.v==null?"—":"US$ "+fmt2.format(r.v),toWin(r.v)==null?"—":fmt0.format(toWin(r.v)),dist,r.note
  ].forEach(function(v,i){var td=document.createElement("td");if(i===1||i===2||i===3)td.className="num";if(i===0){var dot=document.createElement("i");dot.className="dot";dot.style.background=r.color;dot.style.marginRight="7px";td.appendChild(dot)}td.appendChild(document.createTextNode(v));tr.appendChild(td)});t.appendChild(tr)})
}

function chartGex(){
  var d=state.gex,host=$("chartGex");host.innerHTML="";
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

function gammaZones(mapper){
  var d=state.gex,rows=d.strikes.slice().sort(function(a,b){return a.k-b.k}),gap=Infinity;
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
  var relevant=keys.filter(function(k){return k.v&&Math.abs(k.v/last-1)<=.25}),vals=[];
  bars.forEach(function(b){vals.push(b.l,b.h)});relevant.forEach(function(k){vals.push(k.v)});zones.forEach(function(z){if(z.lo&&Math.abs(z.center/last-1)<=.25)vals.push(z.lo,z.hi)});
  var baseMin=Math.min.apply(null,vals),baseMax=Math.max.apply(null,vals),basePad=(baseMax-baseMin)*.07||1;baseMin-=basePad;baseMax+=basePad;
  var baseRange=Math.max(1e-9,baseMax-baseMin),baseMid=(baseMax+baseMin)/2,visibleRange=baseRange/view.yZoom,mid=baseMid+view.yPan*baseRange;
  var ymin=mid-visibleRange/2,ymax=mid+visibleRange/2;
  var W=1220,H=440,m={l:72,r:125,t:22,b:46},plotW=W-m.l-m.r,plotH=H-m.t-m.b;
  var svg=svgEl("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Gráfico de preço interativo com zonas de Gamma Exposure"},host);
  var defs=svgEl("defs",{},svg),clip=svgEl("clipPath",{id:"clip-"+key},defs);svgEl("rect",{x:m.l,y:m.t,width:plotW,height:plotH},clip);
  var plot=svgEl("g",{"clip-path":"url(#clip-"+key+")"},svg);
  var x=function(i){return m.l+i/(bars.length-1)*plotW},y=function(v){return m.t+(1-(v-ymin)/(ymax-ymin))*plotH};
  niceTicks(ymin,ymax,6).forEach(function(t){svgEl("line",{x1:m.l,x2:W-m.r,y1:y(t),y2:y(t),class:"grid"},svg);svgText(svg,m.l-8,y(t)+4,key==="win"?fmt0.format(t):fmt2.format(t),{"text-anchor":"end"})});
  if(showLevels){
    var flip=state.gex.flip==null?null:mapper(state.gex.flip);
    if(flip!=null&&flip>ymin&&flip<ymax){
      var fy=y(flip);svgEl("rect",{x:m.l,y:m.t,width:plotW,height:Math.max(0,fy-m.t),fill:cssVar("--green"),"fill-opacity":.035},plot);
      svgEl("rect",{x:m.l,y:fy,width:plotW,height:Math.max(0,H-m.b-fy),fill:cssVar("--red"),"fill-opacity":.035},plot)
    }
  }
  zones.forEach(function(z){if(!z.center||z.hi<ymin||z.lo>ymax)return;var top=y(Math.min(ymax,z.hi)),bot=y(Math.max(ymin,z.lo));svgEl("rect",{x:m.l,y:top,width:plotW,height:Math.max(1,bot-top),fill:z.positive?cssVar("--blue"):cssVar("--orange"),"fill-opacity":zoneOpacity(z)},plot)});
  relevant.forEach(function(k){if(k.v<ymin||k.v>ymax)return;var yy=y(k.v),dash=k.name==="Gamma Flip"?"7 4":"4 3";svgEl("line",{x1:m.l,x2:W-m.r,y1:yy,y2:yy,stroke:k.color,"stroke-width":k.name==="Gamma Flip"?2:1.4,"stroke-dasharray":dash},plot);svgText(svg,W-m.r+7,yy+4,k.name.replace("Preço EWZ do GEX","GEX spot")+" "+(key==="win"?fmt0.format(k.v):fmt2.format(k.v)),{class:"lbl",style:"fill:"+k.color})});
  var step=plotW/Math.max(1,bars.length-1),bw=Math.max(2,Math.min(10,step*.62));
  bars.forEach(function(b,i){var xx=x(i),up=b.c>=b.o,col=up?cssVar("--green"):cssVar("--red");svgEl("line",{x1:xx,x2:xx,y1:y(b.h),y2:y(b.l),stroke:col,"stroke-width":1},plot);var top=y(Math.max(b.o,b.c)),bot=y(Math.min(b.o,b.c));svgEl("rect",{x:xx-bw/2,y:top,width:bw,height:Math.max(1,bot-top),fill:col,rx:.7},plot)});
  var multi=new Date(bars[0].t*1000).toDateString()!==new Date(bars[bars.length-1].t*1000).toDateString();
  for(var j=0;j<6;j++){var ix=Math.round((bars.length-1)*j/5);svgText(svg,x(ix),H-m.b+18,timeLabel(bars[ix].t,multi),{"text-anchor":j===0?"start":j===5?"end":"middle"})}
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
  legend(legendId,legendItems);viewStatus(key,all.length)
}
function renderPrices(){renderPrice("ewz");renderPrice("win")}
function renderAll(){renderHeader();renderKpis();renderTable();renderViewControls();chartGex();renderPrices()}
function getJson(path){return fetch(path+"?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error(path+" HTTP "+r.status);return r.json()})}
function init(){
  var saved=parseFloat(store("gex.manualWin"));if(saved>0){state.manualWin=saved;$("winInput").value=String(saved)}
  var savedMode=store("gex.viewMode"),savedCount=parseInt(store("gex.zoneCount"),10),savedOpacity=store("gex.zoneOpacity");
  if(["levels","intensity","both"].indexOf(savedMode)>=0)state.viewMode=savedMode;
  if([3,5,7,10].indexOf(savedCount)>=0)state.zoneCount=savedCount;
  if(["low","medium","high"].indexOf(savedOpacity)>=0)state.zoneOpacity=savedOpacity;
  $("rangeSel").addEventListener("change",function(e){state.range=parseFloat(e.target.value);chartGex()});
  document.querySelectorAll(".chart-tool").forEach(function(btn){btn.addEventListener("click",function(){adjustChartView(btn.getAttribute("data-chart"),btn.getAttribute("data-action"))})});
  $("gexViewMode").addEventListener("change",function(e){state.viewMode=e.target.value;store("gex.viewMode",state.viewMode);if(state.gex){renderViewControls();renderPrices()}});
  $("zoneCountSel").addEventListener("change",function(e){state.zoneCount=parseInt(e.target.value,10);store("gex.zoneCount",String(state.zoneCount));if(state.gex){renderViewControls();renderPrices()}});
  $("zoneOpacitySel").addEventListener("change",function(e){state.zoneOpacity=e.target.value;store("gex.zoneOpacity",state.zoneOpacity);if(state.gex){renderViewControls();renderPrices()}});
  $("resetViewBtn").addEventListener("click",function(){state.viewMode="levels";state.zoneCount=7;state.zoneOpacity="medium";store("gex.viewMode","levels");store("gex.zoneCount","7");store("gex.zoneOpacity","medium");if(state.gex){renderViewControls();renderPrices()}});
  $("winForm").addEventListener("submit",function(e){e.preventDefault();var raw=$("winInput").value.replace(/\./g,"").replace(",", "."),v=parseFloat(raw);state.manualWin=v>0?v:null;store("gex.manualWin",state.manualWin?String(state.manualWin):"");if(state.gex)renderAll()});
  $("autoBtn").addEventListener("click",function(){state.manualWin=null;$("winInput").value="";store("gex.manualWin","");if(state.gex)renderAll()});
  Promise.all([getJson("data/latest.json"),getJson("data/prices.json").catch(function(){return null})]).then(function(r){state.gex=r[0];state.prices=r[1];renderAll();if(state.prices&&state.prices.errors&&state.prices.errors.length){var b=$("errorBanner");b.hidden=false;b.textContent="Aviso na coleta de preços: "+state.prices.errors.join(" · ")}}).catch(function(err){$("status").textContent="Não foi possível carregar o dashboard.";var b=$("errorBanner");b.hidden=false;b.textContent=err.message})
}
init();
})();