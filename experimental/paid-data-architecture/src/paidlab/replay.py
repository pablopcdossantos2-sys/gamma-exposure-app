"""Deterministic replay utilities for normalized event streams."""
from datetime import datetime
from typing import Iterable, Callable, Any

def _ts(event: dict) -> float:
    p = event.get("provenance", {})
    value = p.get("source_timestamp") or p.get("received_at")
    if not value:
        return 0.0
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()

def merge_ordered(*streams: Iterable[dict]):
    rows = []
    for stream_id, stream in enumerate(streams):
        for seq, event in enumerate(stream):
            rows.append((_ts(event), stream_id, seq, event))
    rows.sort(key=lambda x: (x[0], x[1], x[2]))
    for _, _, _, event in rows:
        yield event

def replay(events: Iterable[dict], handler: Callable[[dict], Any]) -> None:
    for event in events:
        handler(event)
