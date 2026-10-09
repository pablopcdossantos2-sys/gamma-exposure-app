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

if __name__ == "__main__":
    unittest.main()
