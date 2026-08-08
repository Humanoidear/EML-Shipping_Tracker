import json
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen

NOMINATIM = "https://nominatim.openstreetmap.org"


def _get(url: str) -> dict:
    req = Request(url, headers={"User-Agent": "EML-Shipping-Tracker/1.0"})
    with urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def forward_geocode(query: str):
    if not query:
        return []
    url = f"{NOMINATIM}/search?{urlencode({'q': query, 'format': 'json', 'limit': 8})}"
    try:
        results = _get(url)
    except Exception:
        return []
    return [
        {
            "lat": float(r["lat"]),
            "lng": float(r["lon"]),
            "name": r.get("display_name", ""),
        }
        for r in results
    ]


def reverse_geocode(lat, lng):
    try:
        r = _get(f"{NOMINATIM}/reverse?{urlencode({'lat': lat, 'lon': lng, 'format': 'json'})}")
    except Exception:
        return None
    return {"name": r.get("display_name", "")}
