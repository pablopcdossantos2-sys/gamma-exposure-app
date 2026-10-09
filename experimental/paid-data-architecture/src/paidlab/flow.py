"""Signed-flow research primitives. No provider-specific assumptions."""
from dataclasses import dataclass
from typing import Optional
from .models import OptionTrade

@dataclass(frozen=True)
class ClassifiedTrade:
    trade: OptionTrade
    side: Optional[str]
    side_source: str
    signed_delta_flow: Optional[float]
    signed_gamma_flow: Optional[float]
    hedge_notional_proxy: Optional[float]

def classify_side(trade: OptionTrade) -> tuple[Optional[str], str]:
    if trade.aggressor_side in ("buy", "sell"):
        return trade.aggressor_side, "provider"
    if trade.bid is not None and trade.ask is not None and trade.ask >= trade.bid:
        mid = (trade.bid + trade.ask) / 2
        if trade.price > mid:
            return "buy", "quote_test_proxy"
        if trade.price < mid:
            return "sell", "quote_test_proxy"
    return None, "unknown"

def classify_trade(trade: OptionTrade, multiplier: float = 100.0) -> ClassifiedTrade:
    side, source = classify_side(trade)
    sign = 1.0 if side == "buy" else -1.0 if side == "sell" else None
    delta_flow = None if sign is None or trade.delta is None else sign * trade.size * trade.delta * multiplier
    gamma_flow = None if sign is None or trade.gamma is None else sign * trade.size * trade.gamma * multiplier
    hedge = None
    if delta_flow is not None and trade.underlying_price is not None:
        hedge = delta_flow * trade.underlying_price
    return ClassifiedTrade(trade, side, source, delta_flow, gamma_flow, hedge)
