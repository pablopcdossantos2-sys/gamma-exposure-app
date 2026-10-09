import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from paidlab.mock_provider import MockProvider
from paidlab.flow import classify_trade
from paidlab.storage import JsonlEventStore
from paidlab.replay import merge_ordered
from paidlab.backfill import CostGuard, CostEstimate
from paidlab.microstructure import trade_pressure, top_of_book_imbalance
from paidlab.models import WinEvent
from paidlab.pipeline import ResearchPipeline

class PaidLabTests(unittest.TestCase):
    def test_mock_provider_contract(self):
        p = MockProvider()
        p.connect()
        events = list(p.stream_option_events())
        self.assertEqual(len(events), 2)
        self.assertTrue(p.capabilities.supports_signed_option_flow)
        p.close()

    def test_signed_flow_keeps_provenance(self):
        p = MockProvider(); p.connect()
        trade = list(p.stream_option_events())[1]
        c = classify_trade(trade)
        self.assertEqual(c.side, "buy")
        self.assertEqual(c.side_source, "provider")
        self.assertGreater(c.signed_delta_flow, 0)

    def test_jsonl_store_and_replay(self):
        p = MockProvider(); p.connect()
        events = list(p.stream_option_events())
        with tempfile.TemporaryDirectory() as td:
            store = JsonlEventStore(td)
            for e in events:
                store.append("mock", "options", "2099-01-01", e)
            rows = list(store.read_raw("mock", "options", "2099-01-01"))
            self.assertEqual(len(rows), 2)
            merged = list(merge_ordered(rows))
            self.assertEqual(len(merged), 2)


    def test_cost_guard_blocks_over_budget(self):
        guard = CostGuard(max_amount=10, max_bytes=1_000_000)
        ok, _ = guard.approve(CostEstimate(bytes=1000, amount=5))
        self.assertTrue(ok)
        ok, reason = guard.approve(CostEstimate(bytes=1000, amount=20))
        self.assertFalse(ok)
        self.assertIn("exceeds", reason)

    def test_win_trade_pressure_and_book_imbalance(self):
        p = MockProvider(); p.connect()
        prov = next(p.stream_win_events()).provenance
        events = [
            WinEvent(prov, "WINFUT", "trade", price=100, size=5, aggressor_side="buy"),
            WinEvent(prov, "WINFUT", "trade", price=99, size=2, aggressor_side="sell"),
        ]
        pressure = trade_pressure(events)
        self.assertEqual(pressure.delta, 3)
        quote = WinEvent(prov, "WINFUT", "quote", bid=99, ask=100, bid_size=30, ask_size=10)
        self.assertAlmostEqual(top_of_book_imbalance(quote), .5)

    def test_pipeline_runs_mock_provider(self):
        p = MockProvider()
        result = ResearchPipeline(p).run_options_once()
        self.assertEqual(len(result), 2)
        self.assertFalse(p.connected)

if __name__ == "__main__":
    unittest.main()
