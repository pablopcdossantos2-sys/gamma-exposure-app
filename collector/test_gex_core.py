import math
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gex_core


class GexCoreTests(unittest.TestCase):
    def setUp(self):
        self.spot = 100.0
        self.contracts = [
            {"cp": "C", "strike": 95.0, "dte": 10, "expiration": "2026-10-19", "t": 10/365,
             "iv": .25, "gamma": .02, "oi": 100, "volume": 20, "delta": .70, "bid": 6.0, "ask": 6.2, "last": 6.1},
            {"cp": "P", "strike": 95.0, "dte": 10, "expiration": "2026-10-19", "t": 10/365,
             "iv": .27, "gamma": .018, "oi": 80, "volume": 18, "delta": -.25, "bid": 1.0, "ask": 1.2, "last": 1.1},
            {"cp": "C", "strike": 100.0, "dte": 10, "expiration": "2026-10-19", "t": 10/365,
             "iv": .22, "gamma": .03, "oi": 150, "volume": 40, "delta": .51, "bid": 2.0, "ask": 2.2, "last": 2.1},
            {"cp": "P", "strike": 100.0, "dte": 10, "expiration": "2026-10-19", "t": 10/365,
             "iv": .23, "gamma": .031, "oi": 170, "volume": 45, "delta": -.49, "bid": 2.1, "ask": 2.3, "last": 2.2},
            {"cp": "C", "strike": 105.0, "dte": 10, "expiration": "2026-10-19", "t": 10/365,
             "iv": .24, "gamma": .019, "oi": 90, "volume": 22, "delta": .27, "bid": .9, "ask": 1.1, "last": 1.0},
            {"cp": "P", "strike": 105.0, "dte": 10, "expiration": "2026-10-19", "t": 10/365,
             "iv": .26, "gamma": .02, "oi": 110, "volume": 25, "delta": -.72, "bid": 5.8, "ask": 6.0, "last": 5.9},
        ]

    def test_expected_move_uses_atm_straddle_mid(self):
        m = gex_core.expected_move(self.spot, self.contracts)
        self.assertEqual(m["atm_strike"], 100.0)
        self.assertEqual(m["expected_move_source"], "atm_straddle_mid")
        self.assertAlmostEqual(m["expected_move"], 4.3, places=6)
        self.assertAlmostEqual(m["expected_low"], 95.7, places=6)
        self.assertAlmostEqual(m["expected_high"], 104.3, places=6)

    def test_max_pain_returns_chain_strike(self):
        strike, payout = gex_core.max_pain(self.contracts)
        self.assertIn(strike, {95.0, 100.0, 105.0})
        self.assertGreaterEqual(payout, 0)

    def test_advanced_exposures_are_finite(self):
        by, totals = gex_core.advanced_exposures_by_strike(self.spot, self.contracts)
        self.assertEqual(set(by), {95.0, 100.0, 105.0})
        for row in by.values():
            for value in row.values():
                self.assertTrue(math.isfinite(value))
        for value in totals.values():
            self.assertTrue(math.isfinite(value))

    def test_compute_single_expiry_contains_a4_b1_fields(self):
        res = gex_core.compute(self.spot, self.contracts)
        self.assertIsNotNone(res["max_pain"])
        self.assertIsNotNone(res["expected_move"])
        self.assertIn("net_dex", res)
        self.assertIn("net_vanna", res)
        self.assertIn("net_charm", res)
        self.assertTrue(all("dex" in row and "vanna" in row and "charm" in row for row in res["strikes"]))


if __name__ == "__main__":
    unittest.main()
