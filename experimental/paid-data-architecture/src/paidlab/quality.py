"""Quality/freshness checks for licensed streams."""
from datetime import datetime, timezone

def parse_ts(value: str) -> datetime:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

def event_age_seconds(event: dict, now: datetime | None = None) -> float | None:
    p = event.get("provenance") or {}
    value = p.get("source_timestamp")
    if not value:
        return None
    now = now or datetime.now(timezone.utc)
    return max(0.0, (now - parse_ts(value).astimezone(timezone.utc)).total_seconds())

def quality_flags(event: dict, stale_after_seconds: float) -> list[str]:
    flags = list((event.get("provenance") or {}).get("quality_flags") or [])
    age = event_age_seconds(event)
    if age is None:
        flags.append("source_timestamp_missing")
    elif age > stale_after_seconds:
        flags.append("stale")
    return sorted(set(flags))
