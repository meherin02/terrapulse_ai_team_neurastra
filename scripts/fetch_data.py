"""Fetch a raw NASA POWER response with the Python standard library only."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

URL = "https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M&community=RE&longitude=90.4125&latitude=23.8103&start=1981&end=2024&format=JSON"

if __name__ == "__main__":
    target = Path(__file__).resolve().parents[1] / "data" / "raw"
    target.mkdir(parents=True, exist_ok=True)
    with urlopen(Request(URL, headers={"User-Agent": "TerraPulseAI/0.1 educational-demo"}), timeout=90) as response:
        payload = response.read()
    parsed = json.loads(payload)
    assert parsed["parameters"]["T2M"]["units"] == "C"
    assert len(parsed["properties"]["parameter"]["T2M"]) >= 528
    (target / "nasa-power-dhaka-1981-2024.json").write_bytes(payload)
    (target / "receipt.json").write_text(json.dumps({"url": URL,
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "sha256": hashlib.sha256(payload).hexdigest()}, indent=2), encoding="utf-8")
    print("Saved verified NASA POWER response and SHA256 receipt.")
