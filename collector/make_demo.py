"""
make_demo.py - gera uma resposta sintetica no formato do CBOE e dados de demonstracao
para o site funcionar antes da primeira coleta real. NAO sao dados de mercado.

    python collector/make_demo.py            # grava docs/data/{latest,history}.json (demo)
    python collector/make_demo.py --raw-out demo_raw.json   # tambem salva o raw sintetico
"""
import argparse
import json
import math
import os
import sys
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gex_core  # noqa: E402
from collect import write_json, ROOT  # noqa: E402


def synthetic_raw(spot=30.0, today=None):
    today = today or date.today()
    options = []
    for dte in (7, 21, 49):
        exp = today + timedelta(days=dte)
        for k in range(22, 39):
            iv = 0.30 + 0.004 * abs(k - spot)
            g = gex_core.bs_gamma(spot, k, dte / 365, iv)
            for cp in ("C", "P"):
                wall = (cp == "C" and k == 33) or (cp == "P" and k == 27)
                oi = (45000 if wall else 1500 + 250 * (k - 22 if cp == "C" else 38 - k)) // (1 + dte // 25)
                options.append({"option": f"EWZ{exp:%y%m%d}{cp}{k * 1000:08d}", "iv": iv,
                                "gamma": g, "open_interest": oi})
    return {"data": {"current_price": spot, "timestamp": "demo", "options": options}}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw-out", default=None)
    a = ap.parse_args()
    raw = synthetic_raw()
    if a.raw_out:
        with open(a.raw_out, "w") as f:
            json.dump(raw, f)
    spot, contracts = gex_core.parse_chain(raw["data"])
    res = gex_core.compute(spot, contracts)
    now = datetime.now(timezone.utc)
    write_json(os.path.join(ROOT, "docs", "data", "latest.json"),
               {"symbol": "EWZ", "demo": True, "generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "cboe_timestamp": None, "max_dte": None, "raw_file": None, **res})
    hist = []
    for i in range(12, -1, -1):
        s = spot + 0.6 * math.sin(i / 2.0)
        hist.append({"t": (now - timedelta(days=i)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                     "spot": round(s, 2), "net_gex": round(res["net_gex"] * (1 + 0.25 * math.sin(i))),
                     "flip": round(res["flip"] + 0.25 * math.cos(i / 1.5), 2) if res["flip"] else None,
                     "call_wall": 33 if i > 4 else 34, "put_wall": 27 if i > 7 else 26,
                     "max_abs": 33, "demo": True})
    write_json(os.path.join(ROOT, "docs", "data", "history.json"), hist)
    print("demo gerado: flip", res["flip"], "call", res["call_wall"], "put", res["put_wall"])


if __name__ == "__main__":
    main()
