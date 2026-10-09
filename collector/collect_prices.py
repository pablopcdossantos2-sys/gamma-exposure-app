"""
Coleta candles de 5 minutos do TradingView em modo público/anônimo.

Símbolos:
- AMEX:EWZ
- BMFBOVESPA:WIN1!

A interface websocket usada pelo TradingView não é uma API pública oficial e pode
mudar. O script foi isolado justamente para permitir troca de fonte sem afetar o
restante do projeto.
"""
import json
import os
import random
import re
import string
import time
from datetime import datetime, timezone

import websocket

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "data", "prices.json")
WS_URL = "wss://data.tradingview.com/socket.io/websocket"
SYMBOLS = {
    "ewz": "AMEX:EWZ",
    "win": "BMFBOVESPA:WIN1!",
}
INTERVAL = "5"
BARS = 700


def _session(prefix):
    tail = "".join(random.choice(string.ascii_lowercase) for _ in range(12))
    return f"{prefix}_{tail}"


def _frame(method, params):
    payload = json.dumps({"m": method, "p": params}, separators=(",", ":"))
    return f"~m~{len(payload)}~m~{payload}"


def _send(ws, method, params):
    ws.send(_frame(method, params))


def _iter_frames(raw):
    pos = 0
    while True:
        m = re.search(r"~m~(\d+)~m~", raw[pos:])
        if not m:
            return
        start = pos + m.end()
        length = int(m.group(1))
        payload = raw[start:start + length]
        yield payload
        pos = start + length


def fetch_bars(symbol, interval=INTERVAL, bars=BARS):
    cs = _session("cs")
    alias = "symbol_1"
    series = "s1"
    data = {}

    ws = websocket.create_connection(
        WS_URL,
        timeout=12,
        origin="https://www.tradingview.com",
        cookie="",
    )
    try:
        _send(ws, "set_auth_token", ["unauthorized_user_token"])
        _send(ws, "chart_create_session", [cs, ""])
        _send(ws, "switch_timezone", [cs, "Etc/UTC"])
        desc = json.dumps({
            "symbol": symbol,
            "adjustment": "splits",
            "session": "regular",
        }, separators=(",", ":"))
        _send(ws, "resolve_symbol", [cs, alias, "=" + desc])
        _send(ws, "create_series", [cs, series, series, alias, interval, bars])

        deadline = time.time() + 30
        completed = False
        while time.time() < deadline and not completed:
            try:
                raw = ws.recv()
            except Exception:
                break
            if not isinstance(raw, str):
                continue
            for payload in _iter_frames(raw):
                if payload.startswith("~h~"):
                    ws.send(_frame("heartbeat", [payload]))
                    continue
                try:
                    obj = json.loads(payload)
                except Exception:
                    continue

                method = obj.get("m")
                params = obj.get("p") or []
                if method == "timescale_update" and len(params) > 1:
                    update = params[1] or {}
                    block = update.get(series) or {}
                    for row in block.get("s") or []:
                        values = row.get("v") or []
                        if len(values) < 6:
                            continue
                        try:
                            ts = int(float(values[0]))
                            o, h, l, c = map(float, values[1:5])
                            v = float(values[5] or 0)
                        except Exception:
                            continue
                        data[ts] = {
                            "t": ts,
                            "o": round(o, 6),
                            "h": round(h, 6),
                            "l": round(l, 6),
                            "c": round(c, 6),
                            "v": round(v, 2),
                        }
                elif method == "series_completed" and series in params:
                    completed = True
        out = [data[k] for k in sorted(data)]
        if not out:
            raise RuntimeError(f"TradingView não retornou candles para {symbol}")
        return out
    finally:
        try:
            ws.close()
        except Exception:
            pass


def load_existing():
    if not os.path.exists(OUT):
        return {}
    try:
        with open(OUT, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def latest_status(bars):
    if not bars:
        return None
    return datetime.fromtimestamp(bars[-1]["t"], timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main():
    previous = load_existing()
    payload = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "interval": "5m",
        "source": "TradingView public/anonymous feed",
        "source_note": "Pode ser atrasado e depende da disponibilidade pública do símbolo.",
    }
    errors = []

    for key, symbol in SYMBOLS.items():
        try:
            bars = fetch_bars(symbol)
            payload[key] = {
                "symbol": symbol,
                "last_bar_at": latest_status(bars),
                "bars": bars,
            }
            print(f"{symbol}: {len(bars)} candles")
        except Exception as exc:
            errors.append(f"{symbol}: {exc}")
            old = previous.get(key)
            if old and old.get("bars"):
                payload[key] = old
                payload[key]["stale"] = True
            else:
                payload[key] = {"symbol": symbol, "bars": [], "error": str(exc)}

    payload["errors"] = errors
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    if errors:
        print("avisos:", " | ".join(errors))


if __name__ == "__main__":
    main()
