"""Append-only JSONL store for normalized events and offline replay."""
import json
from pathlib import Path
from typing import Iterable, Any
from .models import to_dict

class JsonlEventStore:
    def __init__(self, root: str | Path):
        self.root = Path(root)

    def path_for(self, provider: str, stream: str, session: str) -> Path:
        return self.root / provider / stream / f"{session}.jsonl"

    def append(self, provider: str, stream: str, session: str, event: Any) -> Path:
        path = self.path_for(provider, stream, session)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(to_dict(event), ensure_ascii=False, separators=(",", ":")) + "\n")
        return path

    def read_raw(self, provider: str, stream: str, session: str) -> Iterable[dict]:
        path = self.path_for(provider, stream, session)
        if not path.exists():
            return []
        def rows():
            with path.open("r", encoding="utf-8") as fh:
                for line in fh:
                    if line.strip():
                        yield json.loads(line)
        return rows()
