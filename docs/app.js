/* GEX EWZ -> WIN. Sem dependencias. Le data/latest.json e data/history.json. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var WIN_TICK = 5;
  var state = { latest: null, hist: [], win: null, range: 0.15 };

  var fmt0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  var fmt2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var fmtPct = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" });

  function usd(v) {
    var a = Math.abs(v), s = v < 0 ? "−" : "";
    if (a >= 1e9) return s + "US$ " + fmt2.format(a / 1e9) + " bi";
    if (a >= 1e6) return s + "US$ " + fmt2.format(a / 1e6) + " mi";
    if (a >= 1e3) return s + "US$ " + fmt0.format(a / 1e3) + " mil";
    return s + "US$ " + fmt0.format(a);
  }
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) {
    var t = el("text", Object.assign({ x: x, y: y }, attrs || {}), parent);
    t.textContent = s;
    return t;
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  function ratio() { return state.win && state.latest ? state.win / state.latest.spot : null; }
  function toWin(level) {
    var r = ratio();
    if (level == null || r == null) return null;
    return Math.round(level * r / WIN_TICK) * WIN_TICK;
  }
  function winTxt(level) { var w = toWin(level); return w == null ? "—" : fmt0.format(w); }

  function niceTicks(min, max, n) {
    var span = max - min || 1, step = Math.pow(10, Math.floor(Math.log10(span / n)));
    var err = span / n / step;
    step *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
    var out = [], v = Math.ceil(min / step) * step;
    for (; v <= max + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return out;
  }
  function axisFmt(v) {
    var a = Math.abs(v), s = v < 0 ? "−" : "";
    if (a >= 1e9) return s + fmt2.format(a / 1e9) + " bi";
    if (a >= 1e6) return s + fmt2.format(a / 1e6).replace(",00", "") + " mi";
    if (a >= 1e3) return s + fmt0.format(a / 1e3) + " mil";
    return s + fmt0.format(a);
  }

  /* ---------- tooltip ---------- */
  var tip = $("tip");
  function showTip(evt, title, rows) {
    tip.innerHTML = "";
    var b = document.createElement("b"); b.textContent = title; tip.appendChild(b);
    rows.forEach(function (r) {
      var d = document.createElement("div"); d.className = "r";
      var a = document.createElement("span"); a.textContent = r[0];
      var c = document.createElement("span"); c.textContent = r[1];
      d.appendChild(a); d.appendChild(c); tip.appendChild(d);
    });
    tip.hidden = false;
    var x = evt.clientX + 14, y = evt.clientY + 14, w = tip.offsetWidth, h = tip.offsetHeight;
    if (x + w > window.innerWidth - 8) x = evt.clientX - w - 14;
    if (y + h > window.innerHeight - 8) y = evt.clientY - h - 14;
    tip.style.left = Math.max(8, x) + "px"; tip.style.top = Math.max(8, y) + "px";
  }
  function hideTip() { tip.hidden = true; }

  /* ---------- cabecalho, KPIs, tabela ---------- */
  function renderTop() {
    var d = state.latest;
    var when = new Date(d.generated_at);
    $("status").textContent = d.symbol + " · atualizado em " + when.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) +
      " (seu fuso) · CBOE com ~15 min de atraso";
    $("demoBanner").hidden = !d.demo;
    var r = ratio();
    $("ratioHint").textContent = r
      ? "Razão WIN/EWZ = " + fmt2.format(r) + " (EWZ a US$ " + fmt2.format(d.spot) + "). Use o WIN do mesmo horário do dado."
      : "Informe o preço do WIN no mesmo horário do dado do EWZ.";
  }

  function regime(d) {
    if (d.flip == null) return d.net_gex >= 0 ? "Gamma positivo (sem flip na faixa ±20%)" : "Gamma negativo (sem flip na faixa ±20%)";
    return d.spot >= d.flip ? "Acima do flip: gamma positivo" : "Abaixo do flip: gamma negativo";
  }

  function levelRows(d) {
    return [
      { name: "Call Wall", v: d.call_wall, color: "var(--series-1)", note: "Maior GEX de calls. Resistência provável." },
      { name: "Gamma Flip", v: d.flip, color: "var(--series-7)", note: "GEX total muda de sinal. Acima: movimentos amortecidos; abaixo: amplificados." },
      { name: "Preço atual", v: d.spot, color: "var(--text-primary)", note: "Último preço do EWZ no dado." },
      { name: "Put Wall", v: d.put_wall, color: "var(--series-2)", note: "Maior GEX de puts. Suporte provável." },
      { name: "Maior |GEX|", v: d.max_abs_strike, color: "var(--text-muted)", note: "Strike com maior gamma líquido absoluto (ímã)." }
    ];
  }

  function renderKpis() {
    var d = state.latest, box = $("kpis");
    box.innerHTML = "";
    var items = [
      { lab: "EWZ", color: "var(--text-primary)", big: "US$ " + fmt2.format(d.spot), small: "WIN " + winTxt(d.spot) },
      { lab: "GEX líquido (por 1%)", color: "var(--text-muted)", big: usd(d.net_gex), small: regime(d) },
      { lab: "Call Wall", color: "var(--series-1)", big: "US$ " + fmt2.format(d.call_wall), small: "WIN " + winTxt(d.call_wall) },
      { lab: "Gamma Flip", color: "var(--series-7)", big: d.flip == null ? "—" : "US$ " + fmt2.format(d.flip), small: d.flip == null ? "sem cruzamento na faixa" : "WIN " + winTxt(d.flip) },
      { lab: "Put Wall", color: "var(--series-2)", big: "US$ " + fmt2.format(d.put_wall), small: "WIN " + winTxt(d.put_wall) }
    ];
    items.forEach(function (it) {
      var k = document.createElement("div"); k.className = "kpi";
      var l = document.createElement("div"); l.className = "lab";
      var dot = document.createElement("span"); dot.className = "dot"; dot.style.background = it.color;
      l.appendChild(dot); l.appendChild(document.createTextNode(it.lab));
      var b = document.createElement("div"); b.className = "big"; b.textContent = it.big;
      var s = document.createElement("div"); s.className = "small"; s.textContent = it.small;
      k.appendChild(l); k.appendChild(b); k.appendChild(s); box.appendChild(k);
    });
  }

  function renderLevels() {
    var d = state.latest, tb = document.querySelector("#levelsTable tbody");
    tb.innerHTML = "";
    levelRows(d).forEach(function (r) {
      var tr = document.createElement("tr");
      var dist = r.v == null ? "—" : (r.name === "Preço atual" ? "—" : fmtPct.format((r.v / d.spot - 1) * 100) + "%");
      [[r.name, ""], [r.v == null ? "—" : fmt2.format(r.v), "num"], [winTxt(r.v), "num"], [dist, "num"], [r.note, "wrapc"]].forEach(function (c, i) {
        var td = document.createElement("td"); if (c[1]) td.className = c[1];
        if (i === 0) {
          var dot = document.createElement("span"); dot.className = "dot"; dot.style.background = r.color; dot.style.marginRight = "8px";
          td.appendChild(dot);
        }
        td.appendChild(document.createTextNode(c[0])); tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
  }

  function legendItems(id, items) {
    var box = $(id); box.innerHTML = "";
    items.forEach(function (it) {
      var s = document.createElement("span"), i = document.createElement("i");
      i.className = it.cls || ""; i.style.background = it.color;
      if (it.dashed) { i.style.background = "none"; i.style.borderTop = "3px dashed " + it.color; i.style.height = "0"; }
      s.appendChild(i); s.appendChild(document.createTextNode(it.name)); box.appendChild(s);
    });
  }

  /* ---------- grafico 1: GEX por strike ---------- */
  function chartStrikes() {
    var d = state.latest, host = $("chartStrikes"); host.innerHTML = "";
    var lo = d.spot * (1 - state.range), hi = d.spot * (1 + state.range);
    var rows = d.strikes.filter(function (s) { return s.k >= lo && s.k <= hi; });
    if (!rows.length) { host.textContent = "Sem strikes na faixa."; return; }
    var W = 960, H = 380, m = { l: 64, r: 16, t: 28, b: 52 };
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "GEX por strike do " + d.symbol }, host);
    var ks = rows.map(function (r) { return r.k; });
    var kmin = Math.min.apply(null, ks), kmax = Math.max.apply(null, ks);
    var minGap = Infinity; for (var i = 1; i < ks.length; i++) minGap = Math.min(minGap, ks[i] - ks[i - 1]);
    if (!isFinite(minGap)) minGap = 1;
    var xmin = Math.min(kmin, d.spot, d.flip == null ? kmin : d.flip) - minGap, xmax = Math.max(kmax, d.spot, d.flip == null ? kmax : d.flip) + minGap;
    var vmax = Math.max.apply(null, rows.map(function (r) { return Math.max(r.call, -r.put, Math.abs(r.net)); })) * 1.15 || 1;
    var x = function (v) { return m.l + (v - xmin) / (xmax - xmin) * (W - m.l - m.r); };
    var y = function (v) { return m.t + (1 - (v + vmax) / (2 * vmax)) * (H - m.t - m.b); };

    niceTicks(-vmax, vmax, 6).forEach(function (t) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: t === 0 ? "axis" : "grid" }, svg);
      txt(svg, m.l - 8, y(t) + 4, axisFmt(t), { "text-anchor": "end" });
    });
    var xt = niceTicks(xmin, xmax, 10);
    xt.forEach(function (t) {
      txt(svg, x(t), H - m.b + 16, fmt0.format(t), { "text-anchor": "middle" });
      if (ratio()) txt(svg, x(t), H - m.b + 30, fmt0.format(toWin(t)), { "text-anchor": "middle", style: "fill:var(--text-muted)" });
    });
    txt(svg, m.l, H - 6, "Strike EWZ (US$)" + (ratio() ? " · linha de baixo: WIN" : ""), { style: "fill:var(--text-muted)" });
    txt(svg, 4, m.t - 12, "US$ por 1% de movimento", { style: "fill:var(--text-muted)" });

    var bw = Math.max(4, Math.min(30, (x(xmin + minGap) - x(xmin)) * 0.6));
    rows.forEach(function (r) {
      var cx = x(r.k);
      if (r.call > 0) el("rect", { x: cx - bw / 2, y: y(r.call), width: bw, height: y(0) - y(r.call), rx: 2, fill: "var(--series-1)" }, svg);
      if (r.put < 0) el("rect", { x: cx - bw / 2, y: y(0), width: bw, height: y(r.put) - y(0), rx: 2, fill: "var(--series-2)" }, svg);
    });
    var spotX = x(d.spot);
    el("line", { x1: spotX, x2: spotX, y1: m.t, y2: H - m.b, stroke: "var(--text-primary)", "stroke-width": 1.5 }, svg);
    txt(svg, spotX + 4, m.t + 4, "EWZ " + fmt2.format(d.spot), { class: "lbl" });
    if (d.flip != null) {
      var fx = x(d.flip);
      el("line", { x1: fx, x2: fx, y1: m.t, y2: H - m.b, stroke: "var(--series-7)", "stroke-width": 2, "stroke-dasharray": "6 4" }, svg);
      var left = fx < spotX;
      txt(svg, fx + (left ? -4 : 4), m.t + 18, "Flip " + fmt2.format(d.flip), { class: "lbl", "text-anchor": left ? "end" : "start" });
    }
    rows.forEach(function (r) {
      if (r.k === d.call_wall) txt(svg, x(r.k), y(r.call) - 6, "Call Wall", { class: "lbl", "text-anchor": "middle" });
      if (r.k === d.put_wall) txt(svg, x(r.k), y(r.put) + 14, "Put Wall", { class: "lbl", "text-anchor": "middle" });
    });
    rows.forEach(function (r) {
      el("circle", { cx: x(r.k), cy: y(r.net), r: 4, fill: "var(--text-primary)", stroke: "var(--surface-1)", "stroke-width": 2 }, svg);
    });
    var colW = Math.max(8, (x(xmin + minGap) - x(xmin)));
    rows.forEach(function (r) {
      var hit = el("rect", { x: x(r.k) - colW / 2, y: m.t, width: colW, height: H - m.t - m.b, class: "hit" }, svg);
      hit.addEventListener("pointermove", function (e) {
        var rr = [["GEX calls", usd(r.call)], ["GEX puts", usd(r.put)], ["GEX líquido", usd(r.net)]];
        if (ratio()) rr.unshift(["WIN", fmt0.format(toWin(r.k))]);
        showTip(e, "Strike US$ " + fmt2.format(r.k), rr);
      });
      hit.addEventListener("pointerleave", hideTip);
    });
    legendItems("legend1", [
      { name: "GEX calls (+)", color: "var(--series-1)", cls: "sq" },
      { name: "GEX puts (−)", color: "var(--series-2)", cls: "sq" },
      { name: "GEX líquido", color: "var(--text-primary)", cls: "ring" },
      { name: "Gamma Flip", color: "var(--series-7)", dashed: true }
    ]);
    var tb = document.querySelector("#strikeTable tbody"); tb.innerHTML = "";
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      [fmt2.format(r.k), winTxt(r.k), usd(r.call), usd(r.put), usd(r.net)].forEach(function (c) {
        var td = document.createElement("td"); td.className = "num"; td.textContent = c; tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
  }

  /* ---------- grafico 2: curva ---------- */
  function chartCurve() {
    var d = state.latest, host = $("chartCurve"); host.innerHTML = "";
    var c = d.curve; if (!c || c.length < 2) { host.textContent = "Sem curva."; return; }
    var W = 960, H = 300, m = { l: 64, r: 16, t: 24, b: 40 };
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Curva de GEX total pelo preço do EWZ" }, host);
    var xmin = c[0].s, xmax = c[c.length - 1].s;
    var gmin = Math.min.apply(null, c.map(function (p) { return p.gex; })), gmax = Math.max.apply(null, c.map(function (p) { return p.gex; }));
    gmin = Math.min(gmin, 0); gmax = Math.max(gmax, 0); var pad = (gmax - gmin) * 0.08 || 1; gmin -= pad; gmax += pad;
    var x = function (v) { return m.l + (v - xmin) / (xmax - xmin) * (W - m.l - m.r); };
    var y = function (v) { return m.t + (1 - (v - gmin) / (gmax - gmin)) * (H - m.t - m.b); };
    niceTicks(gmin, gmax, 5).forEach(function (t) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: t === 0 ? "axis" : "grid" }, svg);
      txt(svg, m.l - 8, y(t) + 4, axisFmt(t), { "text-anchor": "end" });
    });
    niceTicks(xmin, xmax, 8).forEach(function (t) { txt(svg, x(t), H - m.b + 16, fmt0.format(t), { "text-anchor": "middle" }); });
    txt(svg, m.l, H - 6, "Preço hipotético do EWZ (US$)", { style: "fill:var(--text-muted)" });
    var path = c.map(function (p, i) { return (i ? "L" : "M") + x(p.s).toFixed(1) + " " + y(p.gex).toFixed(1); }).join(" ");
    el("path", { d: path, fill: "none", stroke: "var(--series-1)", "stroke-width": 2, "stroke-linejoin": "round" }, svg);
    var sx = x(d.spot);
    el("line", { x1: sx, x2: sx, y1: m.t, y2: H - m.b, stroke: "var(--text-primary)", "stroke-width": 1.5 }, svg);
    txt(svg, sx + 4, m.t + 4, "EWZ " + fmt2.format(d.spot), { class: "lbl" });
    if (d.flip != null) {
      el("circle", { cx: x(d.flip), cy: y(0), r: 6, fill: "var(--series-7)", stroke: "var(--surface-1)", "stroke-width": 2 }, svg);
      var fl = d.flip < d.spot;
      txt(svg, x(d.flip) + (fl ? -10 : 10), y(0) - 12, "Flip " + fmt2.format(d.flip), { class: "lbl", "text-anchor": fl ? "end" : "start" });
    }
    var cross = el("line", { y1: m.t, y2: H - m.b, stroke: "var(--axis)", "stroke-width": 1, visibility: "hidden" }, svg);
    var hit = el("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, class: "hit" }, svg);
    hit.addEventListener("pointermove", function (e) {
      var b = svg.getBoundingClientRect(), vx = (e.clientX - b.left) / b.width * W;
      var s = xmin + (vx - m.l) / (W - m.l - m.r) * (xmax - xmin), best = c[0];
      c.forEach(function (p) { if (Math.abs(p.s - s) < Math.abs(best.s - s)) best = p; });
      cross.setAttribute("x1", x(best.s)); cross.setAttribute("x2", x(best.s)); cross.setAttribute("visibility", "visible");
      var rr = [["GEX total", usd(best.gex)]]; if (ratio()) rr.unshift(["WIN", fmt0.format(toWin(best.s))]);
      showTip(e, "EWZ US$ " + fmt2.format(best.s), rr);
    });
    hit.addEventListener("pointerleave", function () { hideTip(); cross.setAttribute("visibility", "hidden"); });
  }

  /* ---------- grafico 3: historico ---------- */
  function chartHist() {
    var host = $("chartHist"), note = $("histNote"); host.innerHTML = "";
    var h = state.hist.filter(function (p) { return p.t; });
    legendItems("legend3", [
      { name: "Call Wall", color: "var(--series-1)" }, { name: "Gamma Flip", color: "var(--series-7)" },
      { name: "Put Wall", color: "var(--series-2)" }, { name: "Preço EWZ", color: "var(--text-primary)" }
    ]);
    if (h.length < 2) { note.textContent = "O histórico aparece a partir da segunda coleta."; return; }
    note.textContent = h.some(function (p) { return p.demo; }) ? "Histórico de demonstração (sintético)." : h.length + " coletas registradas.";
    var W = 960, H = 320, m = { l: 56, r: 92, t: 16, b: 40 };
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Histórico dos níveis do EWZ" }, host);
    var ts = h.map(function (p) { return Date.parse(p.t); });
    var tmin = Math.min.apply(null, ts), tmax = Math.max.apply(null, ts);
    var series = [
      { key: "call_wall", name: "Call Wall", color: "var(--series-1)" },
      { key: "flip", name: "Flip", color: "var(--series-7)" },
      { key: "put_wall", name: "Put Wall", color: "var(--series-2)" },
      { key: "spot", name: "EWZ", color: "var(--text-primary)", w: 1.5 }
    ];
    var vals = []; h.forEach(function (p) { series.forEach(function (s) { if (p[s.key] != null) vals.push(p[s.key]); }); });
    var vmin = Math.min.apply(null, vals), vmax = Math.max.apply(null, vals), pad = (vmax - vmin) * 0.1 || 1; vmin -= pad; vmax += pad;
    var x = function (t) { return m.l + (t - tmin) / (tmax - tmin) * (W - m.l - m.r); };
    var y = function (v) { return m.t + (1 - (v - vmin) / (vmax - vmin)) * (H - m.t - m.b); };
    niceTicks(vmin, vmax, 5).forEach(function (t) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: "grid" }, svg);
      txt(svg, m.l - 8, y(t) + 4, fmt2.format(t), { "text-anchor": "end" });
    });
    var nt = 5;
    for (var i = 0; i < nt; i++) {
      var t = tmin + (tmax - tmin) * i / (nt - 1);
      txt(svg, x(t), H - m.b + 16, new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }), { "text-anchor": i === 0 ? "start" : i === nt - 1 ? "end" : "middle" });
    }
    var ends = [];
    series.forEach(function (s) {
      var pts = h.filter(function (p) { return p[s.key] != null; });
      if (!pts.length) return;
      var d = pts.map(function (p, i) { return (i ? "L" : "M") + x(Date.parse(p.t)).toFixed(1) + " " + y(p[s.key]).toFixed(1); }).join(" ");
      el("path", { d: d, fill: "none", stroke: s.color, "stroke-width": s.w || 2, "stroke-linejoin": "round" }, svg);
      var last = pts[pts.length - 1];
      ends.push({ y: y(last[s.key]) + 4, text: s.name + " " + fmt2.format(last[s.key]) });
    });
    ends.sort(function (a, b) { return a.y - b.y; });
    for (var j = 1; j < ends.length; j++) if (ends[j].y - ends[j - 1].y < 14) ends[j].y = ends[j - 1].y + 14;
    ends.forEach(function (e) { txt(svg, W - m.r + 8, e.y, e.text, { class: "lbl" }); });
    var cross = el("line", { y1: m.t, y2: H - m.b, stroke: "var(--axis)", "stroke-width": 1, visibility: "hidden" }, svg);
    var hit = el("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, class: "hit" }, svg);
    hit.addEventListener("pointermove", function (e) {
      var b = svg.getBoundingClientRect(), vx = (e.clientX - b.left) / b.width * W;
      var tt = tmin + (vx - m.l) / (W - m.l - m.r) * (tmax - tmin), best = h[0];
      h.forEach(function (p) { if (Math.abs(Date.parse(p.t) - tt) < Math.abs(Date.parse(best.t) - tt)) best = p; });
      cross.setAttribute("x1", x(Date.parse(best.t))); cross.setAttribute("x2", x(Date.parse(best.t))); cross.setAttribute("visibility", "visible");
      var f = function (v) { return v == null ? "—" : fmt2.format(v); };
      showTip(e, new Date(best.t).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
        [["Call Wall", f(best.call_wall)], ["Flip", f(best.flip)], ["Put Wall", f(best.put_wall)], ["EWZ", f(best.spot)]]);
    });
    hit.addEventListener("pointerleave", function () { hideTip(); cross.setAttribute("visibility", "hidden"); });
  }

  /* ---------- orquestracao ---------- */
  function renderAll() {
    renderTop(); renderKpis(); renderLevels(); chartStrikes(); chartCurve(); chartHist();
  }

  function getJson(path) {
    return fetch(path + "?v=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(path + " (HTTP " + r.status + ")");
      return r.json();
    });
  }

  function init() {
    var saved = parseFloat(store("gex.win"));
    if (saved > 0) { state.win = saved; $("winInput").value = String(saved).replace(".", ","); }
    $("winForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var raw = $("winInput").value.replace(/\./g, "").replace(",", ".");
      var v = parseFloat(raw);
      state.win = v > 0 ? v : null;
      store("gex.win", state.win ? String(state.win) : "");
      if (state.latest) renderAll();
    });
    $("rangeSel").addEventListener("change", function (e) { state.range = parseFloat(e.target.value); chartStrikes(); });

    Promise.all([getJson("data/latest.json"), getJson("data/history.json").catch(function () { return []; })])
      .then(function (r) { state.latest = r[0]; state.hist = r[1]; renderAll(); })
      .catch(function (err) {
        $("status").textContent = "Sem dados.";
        var b = $("errorBanner"); b.hidden = false;
        b.textContent = "Não consegui carregar os dados: " + err.message + ". Abra o site por um servidor (GitHub Pages), não direto do arquivo.";
      });
  }
  init();
})();
