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


def bs_gamma(spot, strike, t, iv, r=0.0):
    """Gamma de Black-Scholes (igual para call e put)."""
    if spot <= 0 or strike <= 0 or t <= 0 or iv <= 0:
        return 0.0
    d1 = (math.log(spot / strike) + (r + 0.5 * iv * iv) * t) / (iv * math.sqrt(t))
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
                        t=max(dte, 0.5) / 365.0, iv=float(o.get("iv") or 0),
                        gamma=float(o.get("gamma") or 0), oi=oi))
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


def compute(spot, contracts):
    """Retorna dict com niveis, GEX por strike e curva."""
    by = gex_by_strike(spot, contracts)
    net = {k: v["call"] + v["put"] for k, v in by.items()}
    curve = gex_curve(spot, contracts)
    return {
        "spot": spot,
        "net_gex": sum(net.values()),
        "flip": find_flip(spot, curve),
        "call_wall": max(by, key=lambda k: by[k]["call"]),
        "put_wall": min(by, key=lambda k: by[k]["put"]),
        "max_abs_strike": max(net, key=lambda k: abs(net[k])),
        "strikes": [{"k": k, "call": round(v["call"]), "put": round(v["put"]),
                     "net": round(v["call"] + v["put"])} for k, v in sorted(by.items())],
        "curve": [{"s": round(s, 4), "gex": round(g)} for s, g in curve],
        "n_contracts": len(contracts),
    }
