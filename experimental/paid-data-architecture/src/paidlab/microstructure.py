"""WINFUT microstructure research helpers."""
from dataclasses import dataclass
from typing import Optional
from .models import WinEvent

@dataclass(frozen=True)
class TradePressure:
    buy_volume: float
    sell_volume: float
    unknown_volume: float
    delta: float

def trade_pressure(events: list[WinEvent]) -> TradePressure:
    buy = sell = unknown = 0.0
    for e in events:
        if e.event_type != "trade":
            continue
        size = float(e.size or 0)
        if e.aggressor_side == "buy":
            buy += size
        elif e.aggressor_side == "sell":
            sell += size
        else:
            unknown += size
    return TradePressure(buy, sell, unknown, buy - sell)

def top_of_book_imbalance(event: WinEvent) -> Optional[float]:
    if event.bid_size is None or event.ask_size is None:
        return None
    total = event.bid_size + event.ask_size
    if total <= 0:
        return None
    return (event.bid_size - event.ask_size) / total

def depth_imbalance(event: WinEvent) -> Optional[float]:
    if event.event_type != "book":
        return None
    bid = sum(level.size for level in event.bids)
    ask = sum(level.size for level in event.asks)
    total = bid + ask
    return None if total <= 0 else (bid - ask) / total
