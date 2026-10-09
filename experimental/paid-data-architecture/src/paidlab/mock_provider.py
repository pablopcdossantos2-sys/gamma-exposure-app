"""Mock provider proving the adapter contract without paid credentials."""
from datetime import datetime, timezone
from .provider import ProviderAdapter, ProviderCapabilities
from .models import Provenance, OptionQuote, OptionTrade, WinEvent

class MockProvider(ProviderAdapter):
    def __init__(self):
        self.connected = False

    @property
    def capabilities(self):
        return ProviderCapabilities(
            provider_id="mock",
            mode="replay",
            supports_ewz_options_chain=True,
            supports_ewz_option_trades=True,
            supports_signed_option_flow=True,
            supports_winfut_quotes=True,
            supports_winfut_trades=True,
            supports_winfut_orderbook=False,
            supports_historical_backfill=True,
            latency_class="synthetic",
            redistribution_policy="test-only",
            requires_credentials=False,
            requires_paid_entitlement=False,
        )

    def connect(self):
        self.connected = True

    def close(self):
        self.connected = False

    def _p(self):
        now = datetime.now(timezone.utc).isoformat()
        return Provenance("mock", now, now, "replay", "test")

    def stream_option_events(self):
        if not self.connected:
            raise RuntimeError("provider not connected")
        yield OptionQuote(self._p(), "EWZ", "EWZ_MOCK_C43", "2099-01-01", 43.0, "C",
                          bid=1.0, ask=1.1, volume=250, open_interest=1200,
                          implied_volatility=.30, delta=.52, gamma=.08)
        yield OptionTrade(self._p(), "EWZ", "EWZ_MOCK_C43", "2099-01-01", 43.0, "C",
                          price=1.1, size=25, bid=1.0, ask=1.1, aggressor_side="buy",
                          delta=.52, gamma=.08, underlying_price=43.2)

    def stream_win_events(self):
        if not self.connected:
            raise RuntimeError("provider not connected")
        yield WinEvent(self._p(), "WINFUT", "trade", price=208000, size=5, aggressor_side="buy")

    def fetch_historical(self, request):
        self.connect()
        yield from self.stream_option_events()
