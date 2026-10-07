"""Download/cache NASA POWER data, then build the reproducible demo dataset.

Run .venv/Scripts/python scripts/prepare_data.py [--refresh].
No credentials are required. Raw responses are retained for auditability.
"""
import argparse
import calendar
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

import numpy as np
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "public" / "data"
URL = (
    "https://power.larc.nasa.gov/api/temporal/monthly/point"
    "?parameters=T2M&community=RE&longitude=90.4125&latitude=23.8103"
    "&start=1981&end=2024&format=JSON"
)


def annualize(raw):
    """Use only valid months 01-12; NASA's month 13 is an annual summary."""
    values = raw["properties"]["parameter"]["T2M"]
    fill = raw["header"]["fill_value"]
    monthly, annual, excluded = [], [], []
    for year in range(1981, 2025):
        valid = []
        for month in range(1, 13):
            value = values.get(f"{year}{month:02d}")
            if value is None or value == fill or not np.isfinite(value):
                continue
            if not -90 <= value <= 65:
                raise ValueError(f"Implausible air temperature: {year}-{month}: {value}")
            days = calendar.monthrange(year, month)[1]
            valid.append((float(value), days))
            monthly.append({"date": f"{year}-{month:02d}", "year": year,
                            "month": month, "temperature": float(value)})
        if len(valid) == 12:
            value = sum(v * d for v, d in valid) / sum(d for _, d in valid)
            annual.append({"year": year, "temperature": round(value, 6)})
        else:
            excluded.append(year)
    return monthly, annual, excluded


def analyze(rows):
    """OLS slope; Newey-West/HAC SE, lag 1, Bartlett weights, n/(n-2).

    Approximate two-sided t inference with n-2 degrees of freedom. This
    exploratory interval does not include uncertainty in the source model.
    """
    n = len(rows)
    if n < 10:
        raise ValueError("At least 10 complete annual values are required")
    years = np.array([r["year"] for r in rows], dtype=float)
    if not np.all(np.diff(years) == 1):
        raise ValueError("HAC requires consecutive annual observations")
    y = np.array([r["temperature"] for r in rows])
    x = years - years.mean()
    design = np.column_stack([np.ones(n), x])
    beta = np.linalg.lstsq(design, y, rcond=None)[0]
    fitted = design @ beta
    residual = y - fitted
    bread = np.linalg.inv(design.T @ design)
    scores = design * residual[:, None]
    meat = scores.T @ scores
    lagged = scores[1:].T @ scores[:-1]
    meat += 0.5 * (lagged + lagged.T)
    covariance = bread @ meat @ bread * n / (n - 2)
    se = float(np.sqrt(max(0, covariance[1, 1])))
    critical = float(stats.t.ppf(0.975, n - 2))
    slope = float(beta[1])
    p = float(2 * stats.t.sf(abs(slope / se), n - 2)) if se > 0 else (0.0 if slope else 1.0)
    ci = [(slope - critical * se) * 10, (slope + critical * se) * 10]
    bands = []
    for row, fitted_value, vector in zip(rows, fitted, design):
        margin = critical * np.sqrt(max(0, float(vector @ covariance @ vector)))
        bands.append({**row, "trend": float(fitted_value),
                      "band": [float(fitted_value - margin), float(fitted_value + margin)]})
    r1 = float(np.corrcoef(residual[:-1], residual[1:])[0, 1]) if np.std(residual) > 1e-12 else 0.0
    return {
        "start": int(years[0]), "end": int(years[-1]), "n": n,
        "slopePerDecade": slope * 10, "ci95": ci, "pValue": p,
        "significant": p < 0.05, "mean": float(y.mean()),
        "fittedChange": slope * float(years[-1] - years[0]),
        "residualLag1": r1, "rows": bands,
        "method": "Annual OLS; Newey-West HAC lag 1; Bartlett weights; n/(n-2) correction; approximate t(n-2) inference"
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    path = RAW / "nasa-power-dhaka-1981-2024.json"
    receipt = RAW / "receipt.json"
    if args.refresh or not path.exists():
        request = Request(URL, headers={"User-Agent": "TerraPulseAI/0.1 educational-demo"})
        with urlopen(request, timeout=90) as response:
            payload = response.read()
        raw = json.loads(payload)
        if raw.get("parameters", {}).get("T2M", {}).get("units") != "C":
            raise ValueError("Unexpected source units")
        annualize(raw)  # Validate before replacing the cached response.
        path.write_bytes(payload)
        receipt.write_text(json.dumps({"url": URL, "retrievedAt": datetime.now(timezone.utc).isoformat(),
                                      "sha256": hashlib.sha256(payload).hexdigest()}, indent=2), encoding="utf-8")
    raw = json.loads(path.read_text(encoding="utf-8"))
    provenance = json.loads(receipt.read_text(encoding="utf-8"))
    if hashlib.sha256(path.read_bytes()).hexdigest() != provenance["sha256"]:
        raise ValueError("Raw file differs from its recorded checksum")
    monthly, annual, excluded = annualize(raw)
    if excluded:
        raise ValueError(f"Incomplete years {excluded}; review periods before publishing")
    periods = {}
    for start in (1981, 2001, 2015):
        subset = [r for r in annual if r["year"] >= start]
        periods[f"{start}-2024"] = analyze(subset)
    result = {
        "location": {"name": "Dhaka", "country": "Bangladesh", "latitude": 23.8103, "longitude": 90.4125},
        "source": {"name": "NASA POWER", "model": "MERRA-2", "parameter": "T2M",
                   "variable": "Air temperature at 2 meters", "units": "°C",
                   "resolution": "0.5° latitude × 0.625° longitude",
                   "documentation": "https://power.larc.nasa.gov/docs/services/api/temporal/monthly/",
                   "resolutionDocumentation": "https://power.larc.nasa.gov/docs/faqs/data/",
                   "header": raw["header"], **provenance},
        "quality": {"validMonths": len(monthly), "expectedMonths": 528, "excludedYears": excluded},
        "annual": annual, "monthly": monthly, "periods": periods,
        "limitations": [
            "Regional model grid estimate at Dhaka's coordinates; not a station or city-boundary average.",
            "Air temperature at 2 meters, not land surface temperature or a direct satellite measurement.",
            "Uncertainty describes the fitted trend, not all measurement or model uncertainty.",
            "HAC lag 1 only addresses short-lag dependence; results are exploratory and sensitive to period and assumptions.",
            "A nonsignificant result does not establish no change. Trends do not identify causes or predict the future."
        ]
    }
    target = OUT / "dhaka.json"
    target.write_text(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False), encoding="utf-8")
    print(f"Wrote {target}: {len(monthly)} months, {len(annual)} complete years")
    for label, period in periods.items():
        print(f"{label}: {period['slopePerDecade']:+.4f} C/decade; 95% CI {period['ci95']}; p={period['pValue']:.5f}")


if __name__ == "__main__":
    main()
