"""Run with: python experimental/paid-data-architecture/selftest.py"""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))

from paidlab.mock_provider import MockProvider
from paidlab.flow import classify_trade

def main():
    p = MockProvider()
    p.connect()
    events = list(p.stream_option_events())
    trade = next(e for e in events if e.__class__.__name__ == "OptionTrade")
    classified = classify_trade(trade)
    assert classified.side == "buy"
    assert classified.side_source == "provider"
    assert classified.signed_delta_flow is not None
    assert p.capabilities.supports_signed_option_flow
    p.close()
    print("paid-data-architecture selftest: OK")

if __name__ == "__main__":
    main()
