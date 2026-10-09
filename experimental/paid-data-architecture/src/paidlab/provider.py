"""Provider-neutral adapter contract."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Iterable, Mapping, Any

@dataclass(frozen=True)
class ProviderCapabilities:
    provider_id: str
    mode: str
    supports_ewz_options_chain: bool = False
    supports_ewz_option_trades: bool = False
    supports_signed_option_flow: bool = False
    supports_winfut_quotes: bool = False
    supports_winfut_trades: bool = False
    supports_winfut_orderbook: bool = False
    supports_historical_backfill: bool = False
    latency_class: str = "unknown"
    redistribution_policy: str = "unknown"
    requires_credentials: bool = True
    requires_paid_entitlement: bool = True

class ProviderAdapter(ABC):
    @property
    @abstractmethod
    def capabilities(self) -> ProviderCapabilities:
        raise NotImplementedError

    @abstractmethod
    def connect(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def close(self) -> None:
        raise NotImplementedError

    def stream_option_events(self) -> Iterable[Any]:
        raise NotImplementedError("option stream unsupported")

    def stream_win_events(self) -> Iterable[Any]:
        raise NotImplementedError("WIN stream unsupported")

    def fetch_historical(self, request: Mapping[str, Any]) -> Iterable[Any]:
        raise NotImplementedError("historical backfill unsupported")
