import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DOCS = ROOT / "docs"


class TradingViewAssetsTests(unittest.TestCase):
    def setUp(self):
        self.page = (DOCS / "tradingview.html").read_text(encoding="utf-8")
        self.js = (DOCS / "tradingview.js").read_text(encoding="utf-8")
        self.ewz = (DOCS / "tradingview" / "EWZ_GEX_EWZ_V2.pine").read_text(encoding="utf-8")
        self.win = (DOCS / "tradingview" / "EWZ_GEX_WIN_V2.pine").read_text(encoding="utf-8")

    def test_page_exposes_generator_and_downloads(self):
        for expected in (
            'id="tvExportBlock"',
            'id="tvCopyBtn"',
            'id="tvExpirySelect"',
            'tradingview/EWZ_GEX_EWZ_V2.pine',
            'tradingview/EWZ_GEX_WIN_V2.pine',
        ):
            self.assertIn(expected, self.page)

    def test_generator_contract_contains_required_keys(self):
        for key in (
            "EWZGEX2",
            '"spot"',
            '"cw"',
            '"pw"',
            '"flip"',
            '"maxg"',
            '"pain"',
            '"emlo"',
            '"emhi"',
            '"wspot"',
            '"wcw"',
            '"wpw"',
            '"wflip"',
            '"wmaxg"',
            '"wpain"',
            '"wemlo"',
            '"wemhi"',
        ):
            self.assertIn(key, self.js)

    def test_pine_scripts_use_v2_text_block(self):
        for script in (self.ewz, self.win):
            self.assertIn("//@version=6", script)
            self.assertIn('input.text_area("", "Bloco EWZGEX2"', script)
            self.assertIn('str.startswith(appBlock, "EWZGEX2|")', script)
            self.assertNotIn("Call Wall 2", script)
            self.assertNotIn("Gamma resistência", script)
            self.assertNotIn("Gamma suporte", script)

    def test_win_script_uses_exported_win_keys(self):
        for key in ("wspot", "wcw", "wpw", "wflip", "wmaxg", "wpain", "wemlo", "wemhi"):
            self.assertIn(f'f_blockFloat("{key}"', self.win)
        self.assertNotIn("request.security(", self.win)

    def test_latest_json_has_source_levels_needed_by_export(self):
        latest = json.loads((DOCS / "data" / "latest.json").read_text(encoding="utf-8"))
        for key in ("spot", "call_wall", "put_wall", "max_abs_strike", "expiry_profiles"):
            self.assertIn(key, latest)


if __name__ == "__main__":
    unittest.main()
