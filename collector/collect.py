"""
collect.py - baixa a chain do CBOE (gratis, dados atrasados), calcula os niveis
e grava os JSON consumidos pelo site.

Além do latest.json, cada coleta real gera um snapshot histórico compacto com
os níveis e o GEX por strike, indexado por data/hora de Brasília.
"""
import argparse
import gzip
import json
import os
import sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gex_core  # noqa: E402

URL = "https://cdn.cboe.com/api/global/delayed_quotes/options/{sym}.json"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL_TZ = ZoneInfo("America/Sao_Paulo")
WIN_OPEN_MINUTE = 9 * 60


def fetch_chain(symbol):
    import requests
    r = None
    for sym in (symbol, "_" + symbol):
        r = requests.get(URL.format(sym=sym), timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code == 200:
            return r.json()
    raise RuntimeError(
        f"CBOE nao retornou dados para {symbol} (HTTP {r.status_code}). "
        "Veja o README para fontes e limitacoes."
    )


def load_raw(path):
    opener = gzip.open if path.endswith(".gz") else open
    with opener(path, "rt", encoding="utf-8") as f:
        return json.load(f)


def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))


def _load_json(path, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def archive_snapshot(latest, outdir, now):
    """Guarda uma fotografia navegável da coleta sem a curva de 161 pontos."""
    local = now.astimezone(LOCAL_TZ)
    day = local.strftime("%Y-%m-%d")
    hhmmss = local.strftime("%H%M%S")
    local_time = local.strftime("%H:%M:%S")

    snap = dict(latest)
    snap.pop("curve", None)
    snap["snapshot_version"] = 1
    snap["snapshot_timezone"] = "America/Sao_Paulo"

    rel_file = f"data/gex-snapshots/{day}/{hhmmss}.json"
    abs_file = os.path.join(outdir, "gex-snapshots", day, f"{hhmmss}.json")
    write_json(abs_file, snap)

    index_path = os.path.join(outdir, "gex-snapshots", "index.json")
    index = _load_json(index_path, {
        "version": 1,
        "timezone": "America/Sao_Paulo",
        "win_open": "09:00",
        "snapshots": [],
    })
    items = [x for x in index.get("snapshots", []) if x.get("generated_at") != latest["generated_at"]]

    minute = local.hour * 60 + local.minute + local.second / 60
    items.append({
        "generated_at": latest["generated_at"],
        "local_date": day,
        "local_time": local_time,
        "file": rel_file,
        "spot": latest["spot"],
        "net_gex": round(latest["net_gex"]),
        "flip": latest["flip"],
        "call_wall": latest["call_wall"],
        "put_wall": latest["put_wall"],
        "max_abs": latest["max_abs_strike"],
        "cboe_timestamp": latest.get("cboe_timestamp"),
        "distance_to_win_open_minutes": round(abs(minute - WIN_OPEN_MINUTE), 2),
        "is_win_open_reference": False,
    })

    # Em cada dia, marca somente o snapshot cuja coleta ficou mais próxima de 09:00 BRT.
    by_day = {}
    for item in items:
        item["is_win_open_reference"] = False
        by_day.setdefault(item.get("local_date"), []).append(item)
    for day_items in by_day.values():
        nearest = min(day_items, key=lambda x: x.get("distance_to_win_open_minutes", 9999))
        nearest["is_win_open_reference"] = True

    items.sort(key=lambda x: x.get("generated_at", ""), reverse=True)
    index["snapshots"] = items
    write_json(index_path, index)
    return rel_file


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
            json.dump(raw, f)

    spot, contracts = gex_core.parse_chain(raw["data"], max_dte=a.max_dte)
    if not contracts:
        raise RuntimeError("Chain vazia apos filtros.")
    res = gex_core.compute(spot, contracts)
    expiry_profiles = gex_core.compute_expiry_profiles(spot, contracts)

    latest = {
        "symbol": symbol,
        "demo": False,
        "generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "cboe_timestamp": raw["data"].get("timestamp") or raw.get("timestamp"),
        "max_dte": a.max_dte,
        "raw_file": raw_file,
        "expiry_profiles": expiry_profiles,
        **res,
    }
    write_json(os.path.join(a.outdir, "latest.json"), latest)
    snapshot_file = archive_snapshot(latest, a.outdir, now)

    hist_path = os.path.join(a.outdir, "history.json")
    hist = _load_json(hist_path, [])
    hist = [h for h in hist if not h.get("demo") and h.get("t") != latest["generated_at"]]
    hist.append({
        "t": latest["generated_at"],
        "spot": round(spot, 4),
        "net_gex": round(res["net_gex"]),
        "flip": None if res["flip"] is None else round(res["flip"], 4),
        "call_wall": res["call_wall"],
        "put_wall": res["put_wall"],
        "max_abs": res["max_abs_strike"],
    })
    hist.sort(key=lambda h: h.get("t", ""))
    write_json(hist_path, hist)

    print(
        f"{latest['generated_at']} {symbol} spot={spot:.2f} flip={res['flip']} "
        f"call_wall={res['call_wall']} put_wall={res['put_wall']} "
        f"contratos={res['n_contracts']} snapshot={snapshot_file}"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("erro:", e, file=sys.stderr)
        sys.exit(1)
