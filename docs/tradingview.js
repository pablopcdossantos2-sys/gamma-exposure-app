(function(){
"use strict";

var $=function(id){return document.getElementById(id)};
var state={latest:null,data:null,index:null,prices:null,entry:null,expiry:"all",manualWin:null};
var WIN_TICK=5;

function getJson(url){
  return fetch(url,{cache:"no-store"}).then(function(r){
    if(!r.ok)throw new Error("HTTP "+r.status+" em "+url);
    return r.json()
  })
}
function entries(){
  return state.index&&Array.isArray(state.index.snapshots)?state.index.snapshots:[]
}
function fmt(v,d){
  if(v==null||!isFinite(Number(v)))return"—";
  return Number(v).toLocaleString("pt-BR",{minimumFractionDigits:d||0,maximumFractionDigits:d==null?2:d})
}
function raw(v,decimals){
  if(v==null||!isFinite(Number(v)))return"0";
  var n=Number(v),s=n.toFixed(decimals==null?6:decimals);
  s=s.replace(/\.0+$/,"").replace(/(\.\d*?)0+$/,"$1");
  return s==="-0"?"0":s
}
function active(){
  var d=state.data;
  if(!d)return null;
  if(state.expiry==="all"||!Array.isArray(d.expiry_profiles))return d;
  return d.expiry_profiles.find(function(p){return p.expiration===state.expiry})||d
}
function structural(){
  var d=state.data;
  if(!d||!Array.isArray(d.expiry_profiles)||!d.expiry_profiles.length)return null;
  if(state.expiry!=="all")return d.expiry_profiles.find(function(p){return p.expiration===state.expiry})||null;
  return d.expiry_profiles.slice().sort(function(a,b){return(a.dte||0)-(b.dte||0)})[0]||null
}
function alignedPair(target){
  var eb=state.prices&&state.prices.ewz&&state.prices.ewz.bars||[];
  var wb=state.prices&&state.prices.win&&state.prices.win.bars||[];
  if(!eb.length||!wb.length)return null;
  var wm={};wb.forEach(function(b){wm[b.t]=b});
  var best=null,dist=Infinity;
  eb.forEach(function(e){
    var w=wm[e.t];if(!w)return;
    var dd=Math.abs(e.t-target);
    if(dd<dist){dist=dd;best={t:e.t,ewz:e,win:w,dist:dd}}
  });
  return best
}
function projection(){
  var target=state.data&&Date.parse(state.data.generated_at);
  var pair=alignedPair(isFinite(target)?Math.floor(target/1000):0);
  if(!pair)return{pair:null,ratio:null};
  var winRef=state.manualWin&&state.manualWin>0?state.manualWin:pair.win.c;
  var ratio=pair.ewz.c>0?winRef/pair.ewz.c:null;
  return{pair:pair,ratio:ratio,winRef:winRef}
}
function toWin(v,ratio){
  if(v==null||!ratio)return null;
  return Math.round((Number(v)*ratio)/WIN_TICK)*WIN_TICK
}
function currentEntry(){
  if(state.entry)return state.entry;
  var ts=state.data&&state.data.generated_at;
  return entries().find(function(e){return e.generated_at===ts})||null
}
function fillDateOptions(){
  var sel=$("tvDateSelect"),dates=[];
  entries().forEach(function(e){if(dates.indexOf(e.local_date)<0)dates.push(e.local_date)});
  dates.sort().reverse();sel.innerHTML="";
  dates.forEach(function(d){var o=document.createElement("option");o.value=d;o.textContent=new Date(d+"T12:00:00").toLocaleDateString("pt-BR");sel.appendChild(o)});
  var e=currentEntry(),want=e?e.local_date:dates[0];
  if(want)sel.value=want;
  fillTimeOptions(sel.value,e&&e.generated_at)
}
function fillTimeOptions(day,want){
  var sel=$("tvTimeSelect"),rows=entries().filter(function(e){return e.local_date===day}).sort(function(a,b){return a.local_time.localeCompare(b.local_time)});
  sel.innerHTML="";
  rows.forEach(function(e){var o=document.createElement("option");o.value=e.generated_at;o.textContent=(e.is_win_open_reference?"★ ":"")+e.local_time.slice(0,5)+(e.is_win_open_reference?" — abertura WIN":"");sel.appendChild(o)});
  var chosen=rows.find(function(e){return e.generated_at===want})||rows.find(function(e){return e.is_win_open_reference})||rows[rows.length-1];
  if(chosen)sel.value=chosen.generated_at
}
function fillExpiry(){
  var sel=$("tvExpirySelect"),d=state.data,keep=state.expiry;
  sel.innerHTML='<option value="all">Todos os vencimentos</option>';
  (d.expiry_profiles||[]).slice().sort(function(a,b){return(a.dte||0)-(b.dte||0)}).forEach(function(p){
    var o=document.createElement("option");o.value=p.expiration;o.textContent=new Date(p.expiration+"T12:00:00").toLocaleDateString("pt-BR")+" · "+p.dte+" DTE";sel.appendChild(o)
  });
  if(Array.from(sel.options).some(function(o){return o.value===keep}))sel.value=keep;else{state.expiry="all";sel.value="all"}
}
function loadSelected(ts){
  var e=entries().find(function(x){return x.generated_at===ts});
  if(!e)return Promise.resolve();
  return getJson(e.file).then(function(d){state.data=d;state.entry=e;fillExpiry();render()})
}
function levelRows(){
  var d=active(),s=structural();
  if(!d)return[];
  return[
    {key:"spot",wkey:"wspot",name:"Spot do snapshot",v:d.spot,origin:"snapshot"},
    {key:"cw",wkey:"wcw",name:"Call Wall",v:d.call_wall,origin:"maior GEX de calls"},
    {key:"pw",wkey:"wpw",name:"Put Wall",v:d.put_wall,origin:"put GEX mais negativo"},
    {key:"flip",wkey:"wflip",name:"Gamma Flip",v:d.flip,origin:"cruzamento do GEX por zero"},
    {key:"maxg",wkey:"wmaxg",name:"Maior |GEX|",v:d.max_abs_strike,origin:"maior GEX líquido absoluto"},
    {key:"pain",wkey:"wpain",name:"Max Pain",v:s&&s.max_pain,origin:"vencimento estrutural"},
    {key:"emlo",wkey:"wemlo",name:"Expected Move −",v:s&&s.expected_low,origin:"vencimento estrutural"},
    {key:"emhi",wkey:"wemhi",name:"Expected Move +",v:s&&s.expected_high,origin:"vencimento estrutural"}
  ]
}
function buildBlock(){
  var d=active(),s=structural(),p=projection(),rows=levelRows();
  if(!d)return"";
  var tokens=["EWZGEX2","ts="+(state.data.generated_at||""),"scope="+(state.expiry==="all"?"all":state.expiry),"structexp="+(s&&s.expiration||"none"),"demo="+(state.data.demo?1:0)];
  rows.forEach(function(r){tokens.push(r.key+"="+raw(r.v,4))});
  tokens.push("ratio="+raw(p.ratio,8));
  tokens.push("ratiots="+(p.pair?new Date(p.pair.t*1000).toISOString():"none"));
  tokens.push("ewzref="+raw(p.pair&&p.pair.ewz.c,4));
  tokens.push("winref="+raw(p.winRef,2));
  rows.forEach(function(r){tokens.push(r.wkey+"="+raw(toWin(r.v,p.ratio),0))});
  return tokens.join("|")
}
function render(){
  var d=active(),s=structural(),p=projection(),rows=levelRows(),tbody=document.querySelector("#tvLevelsTable tbody");
  tbody.innerHTML="";
  rows.forEach(function(r){
    var tr=document.createElement("tr"),vals=[r.name,fmt(r.v,2),p.ratio?fmt(toWin(r.v,p.ratio),0):"—",r.origin];
    vals.forEach(function(v,i){var td=document.createElement("td");td.textContent=v;if(i===1||i===2)td.className="num";tr.appendChild(td)});tbody.appendChild(tr)
  });
  $("tvExportBlock").value=buildBlock();
  var e=currentEntry(),parts=[];
  parts.push(e?(e.is_win_open_reference?"★ ":"")+new Date(state.data.generated_at).toLocaleString("pt-BR"):"leitura atual");
  parts.push(state.expiry==="all"?"todos os vencimentos":"expiry "+new Date(state.expiry+"T12:00:00").toLocaleDateString("pt-BR"));
  if(s&&s.expiration)parts.push("Max Pain/EM: "+new Date(s.expiration+"T12:00:00").toLocaleDateString("pt-BR"));
  if(p.ratio)parts.push("razão "+raw(p.ratio,4)+" pts/US$");
  else parts.push("projeção WIN indisponível");
  if(p.pair)parts.push("referência "+new Date(p.pair.t*1000).toLocaleString("pt-BR"));
  if(state.manualWin)parts.push("WIN manual "+fmt(state.manualWin,0));
  $("tvGeneratorStatus").textContent=parts.join(" · ")
}
function copyBlock(){
  var field=$("tvExportBlock"),text=field.value,status=$("tvCopyStatus");
  function ok(){status.textContent="Copiado.";setTimeout(function(){status.textContent=""},2200)}
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(ok).catch(function(){field.select();document.execCommand("copy");ok()})
  }else{field.select();document.execCommand("copy");ok()}
}
function bind(){
  $("tvDateSelect").addEventListener("change",function(e){fillTimeOptions(e.target.value,null);var ts=$("tvTimeSelect").value;if(ts)loadSelected(ts)});
  $("tvTimeSelect").addEventListener("change",function(e){loadSelected(e.target.value)});
  $("tvExpirySelect").addEventListener("change",function(e){state.expiry=e.target.value;render()});
  $("tvWinManual").addEventListener("input",function(e){var v=Number(String(e.target.value).replace(",", "."));state.manualWin=v>0?v:null;render()});
  $("tvCopyBtn").addEventListener("click",copyBlock);
  $("tvLatestBtn").addEventListener("click",function(){state.data=state.latest;state.entry=null;state.expiry="all";state.manualWin=null;$("tvWinManual").value="";fillDateOptions();fillExpiry();render()})
}
Promise.all([
  getJson("data/latest.json"),
  getJson("data/prices.json").catch(function(){return{ewz:{bars:[]},win:{bars:[]}}}),
  getJson("data/gex-snapshots/index.json").catch(function(){return{snapshots:[]}})
]).then(function(r){
  state.latest=r[0];state.data=r[0];state.prices=r[1];state.index=r[2];
  fillDateOptions();fillExpiry();bind();render()
}).catch(function(err){
  $("tvGeneratorStatus").textContent="Erro ao carregar dados: "+err.message
});
})();