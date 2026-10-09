"""
gex_core.py - calculo de Gamma Exposure (GEX) a partir da chain de opcoes do CBOE.
Sem dependencias externas (so biblioteca padrao). Veja CALCULO.md.
"""
import math
import re
from datetime import date

OCC = re.compile(r"^(?P<root>[A-Z]+\d?)(?P<y>\d{2})(?P<m>\d{2})(?P<d>\d{2})(?P<cp>[CP])(?P<k>\d{8})$")


def norm_pdf(x):
    return math.exp(-0.5 * x * x) / math.sqrt(2 * math.pi)


def norm_cdf(x):
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def bs_d1_d2(spot, strike, t, iv, r=0.0):
    if spot <= 0 or strike <= 0 or t <= 0 or iv <= 0:
        return None, None
    root_t = math.sqrt(t)
    d1 = (math.log(spot / strike) + (r + 0.5 * iv * iv) * t) / (iv * root_t)
    return d1, d1 - iv * root_t


def bs_delta(spot, strike, t, iv, cp, r=0.0):
    d1, _ = bs_d1_d2(spot, strike, t, iv, r)
    if d1 is None:
        return 0.0
    call = norm_cdf(d1)
    return call if cp == "C" else call - 1.0


def bs_vanna(spot, strike, t, iv, r=0.0):
    """d(delta)/d(sigma); identical for calls/puts in Black-Scholes (q=0)."""
    d1, d2 = bs_d1_d2(spot, strike, t, iv, r)
    if d1 is None:
        return 0.0
    return -norm_pdf(d1) * d2 / iv


def bs_charm_per_day(spot, strike, t, iv, r=0.0):
    """Change in delta for one day elapsed, using trader-time convention."""
    d1, d2 = bs_d1_d2(spot, strike, t, iv, r)
    if d1 is None:
        return 0.0
    root_t = math.sqrt(t)
    denom = 2.0 * t * iv * root_t
    if denom == 0:
        return 0.0
    charm_year = -norm_pdf(d1) * (2.0 * r * t - d2 * iv * root_t) / denom
    return charm_year / 365.0


def bs_gamma(spot, strike, t, iv, r=0.0):
    """Gamma de Black-Scholes (igual para call e put)."""
    if spot <= 0 or strike <= 0 or t <= 0 or iv <= 0:
        return 0.0
    d1, _ = bs_d1_d2(spot, strike, t, iv, r)
    return norm_pdf(d1) / (spot * iv * math.sqrt(t))


def parse_chain(data, today=None, max_dte=None):
    """Extrai (spot, contratos) do campo 'data' da resposta original do CBOE."""
    today = today or date.today()
    spot = float(data["current_price"])
    out = []
    for o in data["options"]:
        m = OCC.match(o["option"])
        if not m:
            continue
        exp = date(2000 + int(m["y"]), int(m["m"]), int(m["d"]))
        dte = (exp - today).days
        if dte < 0 or (max_dte is not None and dte > max_dte):
            continue
        oi = float(o.get("open_interest") or 0)
        if oi <= 0:
            continue
        out.append(dict(cp=m["cp"], strike=int(m["k"]) / 1000.0, dte=dte,
                        expiration=exp.isoformat(),
                        t=max(dte, 0.5) / 365.0, iv=float(o.get("iv") or 0),
                        gamma=float(o.get("gamma") or 0), oi=oi,
                        volume=float(o.get("volume") or 0),
                        delta=float(o.get("delta") or 0),
                        bid=float(o.get("bid") or 0),
                        ask=float(o.get("ask") or 0),
                        last=float(o.get("last_trade_price") or 0)))
    return spot, out


def gex_by_strike(spot, contracts):
    """GEX em $ por 1% de movimento: calls (+) e puts (-) por strike."""
    k = 100 * spot * spot * 0.01
    by = {}
    for c in contracts:
        d = by.setdefault(c["strike"], {"call": 0.0, "put": 0.0})
        v = c["gamma"] * c["oi"] * k
        if c["cp"] == "C":
            d["call"] += v
        else:
            d["put"] -= v
    return by


def total_gex_at(s, contracts):
    """GEX total se o ativo estivesse em 's' (gamma recalculado por Black-Scholes)."""
    k = 100 * s * s * 0.01
    tot = 0.0
    for c in contracts:
        g = bs_gamma(s, c["strike"], c["t"], c["iv"])
        tot += (g if c["cp"] == "C" else -g) * c["oi"] * k
    return tot


def gex_curve(spot, contracts, lo=0.8, hi=1.2, steps=161):
    grid = [spot * (lo + (hi - lo) * i / (steps - 1)) for i in range(steps)]
    return [(s, total_gex_at(s, contracts)) for s in grid]


def find_flip(spot, curve):
    """Cruzamento por zero da curva, o mais proximo do spot. None se nao houver."""
    best = None
    for (s0, a), (s1, b) in zip(curve, curve[1:]):
        if a == 0 or a * b < 0:
            x = s0 if a == 0 else s0 + (s1 - s0) * (0 - a) / (b - a)
            if best is None or abs(x - spot) < abs(best - spot):
                best = x
    return best


def advanced_exposures_by_strike(spot, contracts):
    """Dealer-exposure proxies under an explicit uniform short-options assumption.

    DEX: dollar delta notional.
    Vanna exposure: change in dollar delta notional per +1 vol point.
    Charm exposure: change in dollar delta notional per one day elapsed.

    These conventions are intentionally separate from the project's existing
    GEX sign convention (calls + / puts -).
    """
    by = {}
    mult = 100.0
    for c in contracts:
        strike = c["strike"]
        row = by.setdefault(strike, {"dex": 0.0, "vanna": 0.0, "charm": 0.0})
        delta = c.get("delta", 0.0)
        if abs(delta) < 1e-12 and c.get("iv", 0) > 0:
            delta = bs_delta(spot, strike, c["t"], c["iv"], c["cp"])
        vanna = bs_vanna(spot, strike, c["t"], c.get("iv", 0.0))
        charm = bs_charm_per_day(spot, strike, c["t"], c.get("iv", 0.0))

        position_sign = -1.0
        oi = c["oi"]
        row["dex"] += position_sign * delta * oi * mult * spot
        row["vanna"] += position_sign * vanna * 0.01 * oi * mult * spot
        row["charm"] += position_sign * charm * oi * mult * spot

    totals = {
        "net_dex": sum(v["dex"] for v in by.values()),
        "net_vanna": sum(v["vanna"] for v in by.values()),
        "net_charm": sum(v["charm"] for v in by.values()),
    }
    return by, totals


def max_pain(contracts):
    """Strike that minimizes aggregate intrinsic payout at expiration."""
    if not contracts:
        return None, None
    strikes = sorted({c["strike"] for c in contracts})
    if not strikes:
        return None, None
    best_k, best_cost = None, None
    for settle in strikes:
        cost = 0.0
        for c in contracts:
            intrinsic = max(settle - c["strike"], 0.0) if c["cp"] == "C" else max(c["strike"] - settle, 0.0)
            cost += intrinsic * c["oi"] * 100.0
        if best_cost is None or cost < best_cost:
            best_k, best_cost = settle, cost
    return best_k, best_cost


def expected_move(spot, contracts):
    """Expected-move proxy for one expiry.

    Preferred method: ATM straddle mid (call mid + put mid). If a usable pair
    is unavailable, fallback to spot * ATM IV * sqrt(T).
    """
    calls, puts = {}, {}
    for c in contracts:
        (calls if c["cp"] == "C" else puts)[c["strike"]] = c
    common = sorted(set(calls).intersection(puts))
    if not common:
        return {"expected_move": None, "expected_move_source": None, "atm_strike": None,
                "expected_low": None, "expected_high": None}

    atm = min(common, key=lambda k: abs(k - spot))
    call, put = calls[atm], puts[atm]

    def mid(row):
        bid, ask, last = row.get("bid", 0.0), row.get("ask", 0.0), row.get("last", 0.0)
        if ask > 0 and bid >= 0 and ask >= bid:
            m = (bid + ask) / 2.0
            if m > 0:
                return m
        return last if last > 0 else None

    cmid, pmid = mid(call), mid(put)
    source, move = None, None
    if cmid is not None and pmid is not None:
        move = cmid + pmid
        source = "atm_straddle_mid"

    if move is None or move <= 0:
        ivs = [x for x in (call.get("iv", 0.0), put.get("iv", 0.0)) if x and x > 0]
        if ivs:
            iv = sum(ivs) / len(ivs)
            t = max(call.get("t", 0.0), put.get("t", 0.0), 0.5 / 365.0)
            move = spot * iv * math.sqrt(t)
            source = "atm_iv_1sigma"

    if move is None or move <= 0:
        return {"expected_move": None, "expected_move_source": None, "atm_strike": atm,
                "expected_low": None, "expected_high": None}

    return {
        "expected_move": round(move, 4),
        "expected_move_source": source,
        "atm_strike": atm,
        "expected_low": round(spot - move, 4),
        "expected_high": round(spot + move, 4),
        "expected_move_pct": round(move / spot * 100.0, 3) if spot else None,
    }


def compute(spot, contracts):
    """Retorna niveis GEX e exposicoes avancadas para o conjunto informado."""
    by = gex_by_strike(spot, contracts)
    net = {k: v["call"] + v["put"] for k, v in by.items()}
    adv, adv_totals = advanced_exposures_by_strike(spot, contracts)
    curve = gex_curve(spot, contracts)
    expirations = {c.get("expiration") for c in contracts if c.get("expiration")}

    rows = []
    for k, v in sorted(by.items()):
        a = adv.get(k, {})
        rows.append({
            "k": k,
            "call": round(v["call"]),
            "put": round(v["put"]),
            "net": round(v["call"] + v["put"]),
            "dex": round(a.get("dex", 0.0)),
            "vanna": round(a.get("vanna", 0.0)),
            "charm": round(a.get("charm", 0.0)),
        })

    result = {
        "spot": spot,
        "net_gex": sum(net.values()),
        "flip": find_flip(spot, curve),
        "call_wall": max(by, key=lambda k: by[k]["call"]),
        "put_wall": min(by, key=lambda k: by[k]["put"]),
        "max_abs_strike": max(net, key=lambda k: abs(net[k])),
        "strikes": rows,
        "curve": [{"s": round(s, 4), "gex": round(g)} for s, g in curve],
        "n_contracts": len(contracts),
        **{k: round(v) for k, v in adv_totals.items()},
    }

    if len(expirations) == 1:
        pain, payout = max_pain(contracts)
        result["max_pain"] = pain
        result["max_pain_payout"] = round(payout) if payout is not None else None
        result.update(expected_move(spot, contracts))
    else:
        result.update({
            "max_pain": None,
            "max_pain_payout": None,
            "expected_move": None,
            "expected_move_source": None,
            "atm_strike": None,
            "expected_low": None,
            "expected_high": None,
            "expected_move_pct": None,
        })
    return result


def compute_expiry_profiles(spot, contracts):
    """Calcula o mesmo mapa de GEX separadamente para cada vencimento.

    Os perfis sao armazenados no snapshot para permitir heatmap strike x expiry
    e filtros por vencimento no dashboard. A curva completa de 161 pontos nao e
    repetida por expiry para manter os arquivos menores.
    """
    groups = {}
    for contract in contracts:
        expiry = contract.get("expiration") or f"DTE-{contract.get('dte', 0)}"
        groups.setdefault(expiry, []).append(contract)

    profiles = []
    for expiry, rows in sorted(groups.items()):
        profile = compute(spot, rows)
        profile.pop("curve", None)
        profile["expiration"] = expiry
        profile["dte"] = min((r.get("dte", 0) for r in rows), default=0)
        profile["volume"] = round(sum(r.get("volume", 0) for r in rows))
        profile["open_interest"] = round(sum(r.get("oi", 0) for r in rows))
        profiles.append(profile)
    return profiles
