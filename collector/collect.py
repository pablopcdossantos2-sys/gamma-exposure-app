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
MARKET_TZ = ZoneInfo("America/New_York")
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


def _safe_float(value):
    try:
        return float(value or 0)
    except Exception:
        return 0.0


def _parse_source_timestamp(value):
    if not value:
        return None
    text = str(value).strip()
    for parser in (
        lambda s: datetime.fromisoformat(s.replace("Z", "+00:00")),
        lambda s: datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc),
    ):
        try:
            dt = parser(text)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    return None


def assess_quality(raw_data, contracts, now):
    """Technical data-quality metadata; does not claim the public feed is realtime."""
    options = raw_data.get("options", []) if isinstance(raw_data, dict) else []
    source_value = raw_data.get("timestamp") if isinstance(raw_data, dict) else None
    source_dt = _parse_source_timestamp(source_value)
    age = max(0, int((now - source_dt.astimezone(timezone.utc)).total_seconds())) if source_dt else None

    total = len(options)
    valid_iv = sum(1 for o in options if _safe_float(o.get("iv")) > 0)
    valid_quote = sum(
        1 for o in options
        if _safe_float(o.get("bid")) > 0
        and _safe_float(o.get("ask")) >= _safe_float(o.get("bid"))
    )
    with_oi = sum(1 for o in options if _safe_float(o.get("open_interest")) > 0)

    calls = sum(1 for x in contracts if x.get("cp") == "C")
    puts = sum(1 for x in contracts if x.get("cp") == "P")
    expiries = len({x.get("expiration") for x in contracts if x.get("expiration")})
    strikes = len({x.get("strike") for x in contracts})

    now_ny = now.astimezone(MARKET_TZ)
    minute = now_ny.hour * 60 + now_ny.minute
    if now_ny.weekday() >= 5:
        session = "weekend"
    elif 570 <= minute < 960:
        session = "regular"
    elif minute < 570:
        session = "pre_market"
    else:
        session = "after_hours"

    iv_pct = round(valid_iv / total * 100.0, 1) if total else 0.0
    quote_pct = round(valid_quote / total * 100.0, 1) if total else 0.0
    oi_pct = round(with_oi / total * 100.0, 1) if total else 0.0

    flags = []
    severity = "ok"
    if total == 0 or not contracts or calls == 0 or puts == 0:
        flags.append("chain_incomplete")
        severity = "critical"
    if len(contracts) < 100 and severity != "critical":
        flags.append("low_contract_count")
        severity = "warning"
    if iv_pct < 60:
        flags.append("low_iv_coverage")
        severity = "critical" if iv_pct < 35 else "warning"
    elif iv_pct < 80:
        flags.append("partial_iv_coverage")
        if severity == "ok":
            severity = "warning"
    if age is None:
        flags.append("source_timestamp_missing")
        if severity == "ok":
            severity = "warning"
    elif age > 3600:
        flags.append("source_timestamp_very_old")
        severity = "critical"
    elif age > 1200:
        flags.append("source_timestamp_old")
        if severity == "ok":
            severity = "warning"

    return {
        "status": severity,
        "flags": flags,
        "source_timestamp": source_value,
        "source_age_seconds": age,
        "collection_timestamp": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "market_session_ny": session,
        "market_time_ny": now_ny.isoformat(),
        "public_delayed_source": True,
        "contracts_used": len(contracts),
        "raw_options": total,
        "calls_used": calls,
        "puts_used": puts,
        "expiries": expiries,
        "strikes": strikes,
        "iv_coverage_pct": iv_pct,
        "bid_ask_coverage_pct": quote_pct,
        "open_interest_positive_pct": oi_pct,
    }


def archive_snapshot(latest, outdir, now):
    """Guarda uma fotografia navegável da coleta sem a curva de 161 pontos."""
    local = now.astimezone(LOCAL_TZ)
    day = local.strftime("%Y-%m-%d")
    hhmmss = local.strftime("%H%M%S")
    local_time = local.strftime("%H:%M:%S")

    snap = dict(latest)
    snap.pop("curve", None)
    snap["snapshot_version"] = 4
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
        "snapshot_version": latest.get("snapshot_version", 4),
        "quality_status": (latest.get("quality") or {}).get("status"),
        "source_age_seconds": (latest.get("quality") or {}).get("source_age_seconds"),
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
    term_structure = gex_core.compute_term_structure(expiry_profiles)
    quality = assess_quality(raw["data"], contracts, now)

    latest = {
        "symbol": symbol,
        "demo": False,
        "generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "cboe_timestamp": raw["data"].get("timestamp") or raw.get("timestamp"),
        "max_dte": a.max_dte,
        "raw_file": raw_file,
        "snapshot_version": 4,
        "expiry_profiles": expiry_profiles,
        "term_structure": term_structure,
        "quality": quality,
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
