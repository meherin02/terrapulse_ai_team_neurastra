"""Cache Natural Earth's public-domain 1:110m country boundaries for the locator."""
import json
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"

if __name__ == "__main__":
    with urlopen(URL, timeout=60) as response:
        world = json.load(response)
    features = []
    for f in world["features"]:
        name = f["properties"]["ADMIN"]
        if name in {"Bangladesh", "India", "Myanmar", "Nepal", "Bhutan"}:
            features.append({"type": "Feature", "properties": {"name": name}, "geometry": f["geometry"]})
    if not any(f["properties"]["name"] == "Bangladesh" for f in features):
        raise ValueError("Bangladesh boundary missing")
    target = ROOT / "public" / "data" / "region.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps({"type": "FeatureCollection", "source": URL,
                                  "license": "Natural Earth public domain", "features": features}), encoding="utf-8")
    print(f"Saved {len(features)} country boundaries to {target}")
