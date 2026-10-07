"""Checks for the scientific calculations and the bundled source snapshot."""
import calendar
import json
import unittest
from pathlib import Path

import numpy as np
from scipy import stats
from prepare_data import analyze, annualize

ROOT = Path(__file__).resolve().parents[1]


class AnalysisTests(unittest.TestCase):
    def test_weighting_and_month13_exclusion(self):
        values = {f"2000{m:02d}": float(m) for m in range(1, 13)}
        values["200013"] = 9999  # Must never contaminate the calculation.
        raw = {"properties": {"parameter": {"T2M": values}}, "header": {"fill_value": -999}}
        monthly, annual, _ = annualize(raw)
        expected = sum(m * calendar.monthrange(2000, m)[1] for m in range(1, 13)) / 366
        self.assertEqual(len(monthly), 12)
        self.assertEqual(len(annual), 1)
        self.assertAlmostEqual(annual[0]["temperature"], expected, places=6)

    def test_incomplete_year_is_excluded(self):
        values = {f"2000{m:02d}": 20.0 for m in range(1, 13)}
        values["200002"] = -999
        raw = {"properties": {"parameter": {"T2M": values}}, "header": {"fill_value": -999}}
        monthly, annual, excluded = annualize(raw)
        self.assertEqual(len(monthly), 11)
        self.assertEqual(annual, [])
        self.assertIn(2000, excluded)

    def test_known_slope_and_constant_series(self):
        rows = [{"year": 1981 + i, "temperature": 20 + i * 0.02} for i in range(44)]
        self.assertAlmostEqual(analyze(rows)["slopePerDecade"], 0.2, places=10)
        constant = [{"year": 1981 + i, "temperature": 20.0} for i in range(44)]
        self.assertAlmostEqual(analyze(constant)["slopePerDecade"], 0.0, places=10)

    def test_invalid_time_axis_rejected(self):
        rows = [{"year": 1981 + 2*i, "temperature": 20 + i} for i in range(10)]
        with self.assertRaises(ValueError):
            analyze(rows)
        with self.assertRaises(ValueError):
            analyze(rows[:5])

    def test_real_data_slope_agrees_with_scipy(self):
        data = json.loads((ROOT / "public/data/dhaka.json").read_text(encoding="utf-8"))
        raw = json.loads((ROOT / "data/raw/nasa-power-dhaka-1981-2024.json").read_text(encoding="utf-8"))
        monthly, annual, excluded = annualize(raw)
        self.assertEqual(len(monthly), 528)
        self.assertEqual(len(annual), 44)
        self.assertEqual(excluded, [])
        self.assertEqual(data["annual"], annual)
        for period in data["periods"].values():
            x = [r["year"] for r in period["rows"]]
            y = [r["temperature"] for r in period["rows"]]
            regression = stats.linregress(x, y)
            self.assertAlmostEqual(regression.slope * 10, period["slopePerDecade"], places=10)
            self.assertLessEqual(period["ci95"][0], period["slopePerDecade"])
            self.assertGreaterEqual(period["ci95"][1], period["slopePerDecade"])
            self.assertTrue(0 <= period["pValue"] <= 1)
            excludes_zero = period["ci95"][0] > 0 or period["ci95"][1] < 0
            self.assertEqual(excludes_zero, period["significant"])


if __name__ == "__main__":
    unittest.main()
