"""
collect.py - baixa a chain do CBOE (gratis, ~15 min de atraso), calcula os niveis
e grava os JSON consumidos pelo site (docs/data).

    python collector/collect.py --symbol EWZ              # coleta normal
    python collector/collect.py --save-raw               # tambem guarda a resposta original
    python collector/collect.py --from-raw arquivo.json  # recalcula a partir de um raw salvo
"""
import argparse
import gzip
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gex_core  # noqa: E402

URL = "https://cdn.cboe.com/api/global/delayed_quotes/options/{sym}.json"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def fetch_chain(symbol):
    import requests
    r = None
    for sym in (symbol, "_" + symbol):  # indices usam prefixo "_"
        r = requests.get(URL.format(sym=sym), timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code == 200:
            return r.json()
    raise RuntimeError(f"CBOE nao retornou dados para {symbol} (HTTP {r.status_code}). "
                       "ETFs podem exigir assinatura - veja o README.")


def load_raw(path):
    opener = gzip.open if path.endswith(".gz") else open
    with opener(path, "rt", encoding="utf-8") as f:
        return json.load(f)


def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--symbol", default="EWZ")
    ap.add_argument("--max-dte", type=int, default=None, help="so vencimentos ate N dias")
    ap.add_argument("--save-raw", action="store_true", help="guarda a resposta original (.json.gz)")
    ap.add_argument("--from-raw", default=None, help="usa um arquivo raw em vez de baixar")
    ap.add_argument("--outdir", default=os.path.join(ROOT, "docs", "data"))
    ap.add_argument("--rawdir", default=os.path.join(ROOT, "data", "raw"))
    a = ap.parse_args()
    symbol = a.symbol.upper()

    raw = load_raw(a.from_raw) if a.from_raw else fetch_chain(symbol)
    now = datetime.now(timezone.utc)
    stamp = now.strftime("%Y%m%d_%H%M%S")

    raw_file = None
    if a.save_raw and not a.from_raw:
        os.makedirs(a.rawdir, exist_ok=True)
        raw_file = f"{symbol}_{stamp}.json.gz"
        with gzip.open(os.path.join(a.rawdir, raw_file), "wt", encoding="utf-8") as f:
            json.dump(raw, f)  # resposta original, sem alteracao

    spot, contracts = gex_core.parse_chain(raw["data"], max_dte=a.max_dte)
    if not contracts:
        raise RuntimeError("Chain vazia apos filtros.")
    res = gex_core.compute(spot, contracts)

    latest = {
        "symbol": symbol, "demo": False,
        "generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "cboe_timestamp": raw["data"].get("timestamp") or raw.get("timestamp"),
        "max_dte": a.max_dte, "raw_file": raw_file, **res,
    }
    write_json(os.path.join(a.outdir, "latest.json"), latest)

    hist_path = os.path.join(a.outdir, "history.json")
    hist = []
    if os.path.exists(hist_path):
        with open(hist_path, encoding="utf-8") as f:
            hist = json.load(f)
        hist = [h for h in hist if not h.get("demo")]
    hist.append({"t": latest["generated_at"], "spot": round(spot, 4),
                 "net_gex": round(res["net_gex"]),
                 "flip": None if res["flip"] is None else round(res["flip"], 4),
                 "call_wall": res["call_wall"], "put_wall": res["put_wall"],
                 "max_abs": res["max_abs_strike"]})
    write_json(hist_path, hist)
    print(f"{latest['generated_at']} {symbol} spot={spot:.2f} flip={res['flip']} "
          f"call_wall={res['call_wall']} put_wall={res['put_wall']} contratos={res['n_contracts']}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("erro:", e, file=sys.stderr)
        sys.exit(1)
