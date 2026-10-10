import math
import os
import sys
import unittest
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gex_core
import collect


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


    def test_iv_skew_metrics(self):
        m = gex_core.iv_skew_metrics(self.spot, self.contracts)
        self.assertAlmostEqual(m["atm_iv_pct"], 22.5, places=6)
        self.assertEqual(m["call25_strike"], 105.0)
        self.assertEqual(m["put25_strike"], 95.0)
        self.assertAlmostEqual(m["rr25_vol_points"], -3.0, places=6)
        self.assertAlmostEqual(m["bf25_vol_points"], 3.0, places=6)

    def test_term_structure(self):
        profiles = [
            {"expiration": "2026-10-10", "dte": 1, "atm_iv_pct": 30.0, "rr25_vol_points": -4.0, "bf25_vol_points": 2.0},
            {"expiration": "2026-11-08", "dte": 30, "atm_iv_pct": 24.0, "rr25_vol_points": -3.0, "bf25_vol_points": 1.5},
            {"expiration": "2026-12-08", "dte": 60, "atm_iv_pct": 23.0, "rr25_vol_points": -2.0, "bf25_vol_points": 1.0},
        ]
        ts = gex_core.compute_term_structure(profiles)
        self.assertEqual(ts["regime"], "backwardation")
        self.assertLess(ts["slope_30d_vol_points"], 0)
        self.assertEqual(len(ts["points"]), 3)

    def test_oi_delta_by_strike(self):
        prev = [
            {"k": 100.0, "oi_call": 100, "oi_put": 80},
            {"k": 105.0, "oi_call": 50, "oi_put": 70},
        ]
        cur = [
            {"k": 100.0, "oi_call": 120, "oi_put": 75},
            {"k": 105.0, "oi_call": 40, "oi_put": 90},
        ]
        rows = {r["k"]: r for r in gex_core.oi_delta_by_strike(prev, cur)}
        self.assertEqual(rows[100.0]["d_call"], 20)
        self.assertEqual(rows[100.0]["d_put"], -5)
        self.assertEqual(rows[100.0]["d_net"], 25)
        self.assertEqual(rows[105.0]["d_net"], -30)

    def test_compute_preserves_oi_iv_fields(self):
        res = gex_core.compute(self.spot, self.contracts)
        atm = next(r for r in res["strikes"] if r["k"] == 100.0)
        self.assertEqual(atm["oi_call"], 150)
        self.assertEqual(atm["oi_put"], 170)
        self.assertAlmostEqual(atm["iv_call"], .22, places=6)
        self.assertAlmostEqual(atm["iv_put"], .23, places=6)

    def test_quality_metadata(self):
        now = datetime(2026, 10, 9, 16, 0, tzinfo=timezone.utc)
        raw_options = []
        for i, c in enumerate(self.contracts):
            raw_options.append({
                "iv": c["iv"], "bid": c["bid"], "ask": c["ask"],
                "open_interest": c["oi"]
            })
        q = collect.assess_quality(
            {"timestamp": "2026-10-09 15:59:30", "options": raw_options},
            self.contracts,
            now,
        )
        self.assertEqual(q["source_age_seconds"], 30)
        self.assertEqual(q["iv_coverage_pct"], 100.0)
        self.assertEqual(q["bid_ask_coverage_pct"], 100.0)
        self.assertIn(q["status"], {"ok", "warning"})


    def test_pinning_scores_are_ranked_and_normalized(self):
        rows = gex_core.pinning_scores(self.spot, self.contracts)
        self.assertTrue(rows)
        self.assertEqual(rows[0]["score"], 100.0)
        self.assertTrue(all(0 <= r["score"] <= 100 for r in rows))
        self.assertEqual(rows, sorted(rows, key=lambda r: r["score"], reverse=True))
        self.assertTrue(all("distance_pct" in r and "oi" in r and "abs_gex" in r for r in rows))

    def test_compute_single_expiry_contains_pinning(self):
        res = gex_core.compute(self.spot, self.contracts)
        self.assertIn("pinning", res)
        self.assertTrue(res["pinning"])


    def test_put_call_metrics(self):
        m = gex_core.put_call_metrics(self.contracts)
        self.assertEqual(m["call_oi"], 340)
        self.assertEqual(m["put_oi"], 360)
        self.assertAlmostEqual(m["put_call_oi_ratio"], 360/340, places=4)
        self.assertEqual(m["call_volume"], 82)
        self.assertEqual(m["put_volume"], 88)
        self.assertAlmostEqual(m["put_call_volume_ratio"], 88/82, places=4)

    def test_compute_contains_put_call_ratios(self):
        res = gex_core.compute(self.spot, self.contracts)
        self.assertIn("put_call_oi_ratio", res)
        self.assertIn("put_call_volume_ratio", res)
        self.assertGreater(res["put_call_oi_ratio"], 0)
        self.assertGreater(res["put_call_volume_ratio"], 0)


    def test_activity_metrics_include_zero_oi_volume(self):
        activity = list(self.contracts) + [
            {"cp": "C", "strike": 110.0, "dte": 10, "expiration": "2026-10-19", "t": 10/365,
             "iv": .30, "gamma": .01, "oi": 0, "volume": 100, "delta": .10, "bid": .2, "ask": .3, "last": .25}
        ]
        res = gex_core.compute(self.spot, self.contracts)
        gex_core.merge_activity_metrics(res, activity)
        self.assertEqual(res["call_volume"], 182)
        row = next(r for r in res["strikes"] if r["k"] == 110.0)
        self.assertEqual(row["volume_call"], 100)
        self.assertEqual(row["net"], 0)

    def test_parse_chain_can_keep_zero_oi_for_activity(self):
        data = {
            "current_price": 100,
            "options": [
                {"option": "EWZ261019C00100000", "open_interest": 0, "volume": 12,
                 "iv": .2, "gamma": .01, "delta": .2, "bid": 1, "ask": 1.2, "last_trade_price": 1.1}
            ]
        }
        _, gex_contracts = gex_core.parse_chain(data, today=datetime(2026, 10, 9).date())
        _, activity_contracts = gex_core.parse_chain(data, today=datetime(2026, 10, 9).date(), include_zero_oi=True)
        self.assertEqual(len(gex_contracts), 0)
        self.assertEqual(len(activity_contracts), 1)
        self.assertEqual(activity_contracts[0]["volume"], 12)


    def test_volume_weighted_gamma_metrics(self):
        m = gex_core.volume_weighted_gamma_metrics(self.spot, self.contracts)
        self.assertIn("volume_gamma_total", m)
        self.assertIn("volume_call_wall", m)
        self.assertIn("volume_put_wall", m)
        self.assertTrue(m["volume_gamma_strikes"])
        self.assertTrue(any(abs(r["net"]) > 0 for r in m["volume_gamma_strikes"]))

    def test_merge_activity_adds_volume_gamma_fields(self):
        res = gex_core.compute(self.spot, self.contracts)
        gex_core.merge_activity_metrics(res, self.contracts)
        self.assertIn("volume_gamma_total", res)
        self.assertIn("volume_gamma_strikes", res)
        self.assertTrue(all("volume_gamma_net" in row for row in res["strikes"]))


class GexSpecificationTests(unittest.TestCase):
    def _c(self, cp, strike, gamma, oi):
        return {
            "cp": cp,
            "strike": float(strike),
            "dte": 10,
            "expiration": "2026-10-20",
            "t": 10 / 365,
            "iv": 0.25,
            "gamma": float(gamma),
            "oi": float(oi),
            "volume": 0.0,
            "delta": 0.5 if cp == "C" else -0.5,
            "bid": 1.0,
            "ask": 1.1,
            "last": 1.05,
        }

    def test_spec_formula_call_and_put_sign(self):
        # Especificação: 0,05 × 1000 × 100 × 40² × 0,01 = 80.000
        contracts = [
            self._c("C", 40, 0.05, 1000),
            self._c("P", 41, 0.05, 1000),
        ]
        by = gex_core.gex_by_strike(40.0, contracts)
        self.assertAlmostEqual(by[40.0]["call"], 80000.0, places=6)
        self.assertEqual(by[40.0]["put"], 0.0)
        self.assertAlmostEqual(by[41.0]["put"], -80000.0, places=6)
        self.assertEqual(by[41.0]["call"], 0.0)

    def test_spec_aggregates_multiple_contracts_same_strike(self):
        contracts = [
            self._c("C", 40, 0.05, 1000),
            self._c("C", 40, 0.025, 1000),
            self._c("P", 40, 0.01, 1000),
        ]
        by = gex_core.gex_by_strike(40.0, contracts)
        self.assertAlmostEqual(by[40.0]["call"], 120000.0, places=6)
        self.assertAlmostEqual(by[40.0]["put"], -16000.0, places=6)
        self.assertAlmostEqual(by[40.0]["call"] + by[40.0]["put"], 104000.0, places=6)

    def test_spec_walls_max_abs_and_strike_order(self):
        contracts = [
            self._c("C", 42, 0.01, 1000),
            self._c("P", 42, 0.04, 1000),
            self._c("C", 40, 0.05, 1000),
            self._c("P", 40, 0.01, 1000),
            self._c("C", 41, 0.02, 1000),
            self._c("P", 41, 0.02, 1000),
        ]
        res = gex_core.compute(40.0, contracts)
        self.assertEqual([r["k"] for r in res["strikes"]], [40.0, 41.0, 42.0])
        self.assertEqual(res["call_wall"], 40.0)
        self.assertEqual(res["put_wall"], 42.0)
        expected_max_abs = max(res["strikes"], key=lambda r: abs(r["net"]))["k"]
        self.assertEqual(res["max_abs_strike"], expected_max_abs)


if __name__ == "__main__":
    unittest.main()
