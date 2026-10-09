"""Normalized paid/entitled market-data models. Isolated from the active app."""
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any

@dataclass(frozen=True)
class Provenance:
    provider: str
    source_timestamp: str
    received_at: str
    mode: str
    entitlement: str = "unknown"
    quality_flags: tuple[str, ...] = ()

@dataclass(frozen=True)
class OptionQuote:
    provenance: Provenance
    underlying: str
    option_symbol: str
    expiration: str
    strike: float
    option_type: str
    bid: Optional[float] = None
    ask: Optional[float] = None
    last: Optional[float] = None
    volume: Optional[float] = None
    open_interest: Optional[float] = None
    implied_volatility: Optional[float] = None
    delta: Optional[float] = None
    gamma: Optional[float] = None
    vega: Optional[float] = None
    theta: Optional[float] = None

@dataclass(frozen=True)
class OptionTrade:
    provenance: Provenance
    underlying: str
    option_symbol: str
    expiration: str
    strike: float
    option_type: str
    price: float
    size: float
    bid: Optional[float] = None
    ask: Optional[float] = None
    aggressor_side: Optional[str] = None
    complex_order_id: Optional[str] = None
    delta: Optional[float] = None
    gamma: Optional[float] = None
    underlying_price: Optional[float] = None

@dataclass(frozen=True)
class BookLevel:
    price: float
    size: float
    orders: Optional[int] = None

@dataclass(frozen=True)
class WinEvent:
    provenance: Provenance
    symbol: str
    event_type: str
    price: Optional[float] = None
    size: Optional[float] = None
    bid: Optional[float] = None
    ask: Optional[float] = None
    bid_size: Optional[float] = None
    ask_size: Optional[float] = None
    aggressor_side: Optional[str] = None
    bids: tuple[BookLevel, ...] = ()
    asks: tuple[BookLevel, ...] = ()

def to_dict(event: Any) -> Dict[str, Any]:
    return asdict(event)
