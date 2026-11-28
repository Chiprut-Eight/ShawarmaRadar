import json
import math
import os
import re
from datetime import datetime, timezone
from typing import Any, Optional
import httpx
from dotenv import load_dotenv

# Load .env from backend/ or workspace root
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_BASE_DIR, ".env"))
load_dotenv(os.path.join(os.path.dirname(_BASE_DIR), ".env"))

QUOTA_LEDGER_PATH = os.path.join(_BASE_DIR, "google_quota_ledger.json")

# Per-radar hard monthly caps (450 ShawarmaRadar + 450 SushiRadar <= 900, safely under Google's 1,000 free tier -> ₪0.00 guaranteed)
MONTHLY_HARD_CAP_GET_PLACE = 450
MONTHLY_HARD_CAP_SEARCH_TEXT = 450


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return r * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def _clean_formatted_address(formatted: str, city: str = "") -> str:
    if not formatted:
        return ""
    parts = [p.strip() for p in formatted.split(",") if p.strip()]
    cleaned: list[str] = []
    for p in parts:
        if any(skip in p for skip in ("ישראל", "Israel", "מחוז", "נפת")):
            continue
        if re.match(r"^\d{5,7}$", p):
            continue
        # Strip trailing postal codes attached to city name (e.g. "תל אביב-יפו, 65251")
        p_no_zip = re.sub(r"\s+\d{5,7}$", "", p).strip()
        if city and (p_no_zip == city or city in p_no_zip or p_no_zip in city):
            continue
        cleaned.append(p_no_zip)
    return ", ".join(cleaned[:2])


class GoogleBusinessScraper:
    """
    100% Official, Deterministic Google Places API (New) Client.
    Replaces all legacy web/search-engine scraping with exact `place_id` lookups,
    protected by both Google Cloud Quotas and a local hard monthly quota ledger ($0.00 guaranteed).
    """

    PLACES_BASE = "https://places.googleapis.com/v1"
    DETAIL_MASK = "id,displayName,formattedAddress,location,rating,userRatingCount,businessStatus,reviews"
    SEARCH_MASK = (
        "places.id,places.displayName,places.formattedAddress,places.location,"
        "places.rating,places.userRatingCount,places.businessStatus,places.reviews"
    )

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = (api_key or os.getenv("GOOGLE_PLACES_API_KEY") or "").strip()

    def _current_month_key(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m")

    def _load_ledger(self) -> dict[str, dict[str, int]]:
        if os.path.exists(QUOTA_LEDGER_PATH):
            try:
                with open(QUOTA_LEDGER_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        return data
            except Exception:
                pass
        return {}

    def _check_and_increment_quota(self, sku_key: str, cap: int) -> bool:
        month = self._current_month_key()
        ledger = self._load_ledger()
        month_entry = ledger.setdefault(month, {"get_place": 0, "search_text": 0})
        current = month_entry.get(sku_key, 0)
        if current >= cap:
            print(f"[QuotaGuard] Hard monthly free cap reached for '{sku_key}' ({current}/{cap} in {month}). Blocking call to guarantee ₪0 cost.")
            return False
        month_entry[sku_key] = current + 1
        try:
            with open(QUOTA_LEDGER_PATH, "w", encoding="utf-8") as f:
                json.dump(ledger, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[QuotaGuard] Warning saving quota ledger: {e}")
        return True

    def get_monthly_usage(self) -> dict[str, int]:
        month = self._current_month_key()
        ledger = self._load_ledger()
        return ledger.get(month, {"get_place": 0, "search_text": 0})

    def _parse_place_payload(self, place: dict[str, Any], city: str = "") -> dict[str, Any]:
        place_id = str(place.get("id") or "")
        disp = (place.get("displayName") or {}).get("text") or ""
        formatted_addr = str(place.get("formattedAddress") or "")
        clean_addr = _clean_formatted_address(formatted_addr, city=city)
        loc = place.get("location") or {}
        lat = float(loc["latitude"]) if loc.get("latitude") is not None else None
        lng = float(loc["longitude"]) if loc.get("longitude") is not None else None
        rating = float(place["rating"]) if place.get("rating") is not None else None
        count = int(place.get("userRatingCount") or 0)
        status = str(place.get("businessStatus") or "OPERATIONAL")

        parsed_reviews: list[dict[str, Any]] = []
        for rv in place.get("reviews") or []:
            txt_obj = rv.get("text") or rv.get("originalText") or {}
            txt = str(txt_obj.get("text") or "").strip()
            rv_rating = float(rv["rating"]) if rv.get("rating") is not None else None
            pub_str = rv.get("publishTime")
            pub_dt: Optional[datetime] = None
            if pub_str:
                try:
                    pub_dt = datetime.fromisoformat(pub_str.replace("Z", "+00:00"))
                except Exception:
                    pub_dt = None
            if txt:
                parsed_reviews.append({
                    "text": txt,
                    "rating": rv_rating,
                    "published_at": pub_dt,
                    "source": "google",
                })

        return {
            "place_id": place_id,
            "official_name": disp,
            "rating": rating,
            "user_ratings_total": count,
            "address": clean_addr,
            "formatted_address": formatted_addr,
            "lat": lat,
            "lng": lng,
            "business_status": status,
            "reviews": parsed_reviews,
        }

    def get_place_by_id(self, place_id: str, city: str = "") -> Optional[dict[str, Any]]:
        """Fetches 100% deterministic official Google data for a locked `place_id`."""
        if not self.api_key or not place_id:
            return None
        if not self._check_and_increment_quota("get_place", MONTHLY_HARD_CAP_GET_PLACE):
            return None

        url = f"{self.PLACES_BASE}/places/{place_id}"
        headers = {
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": self.DETAIL_MASK,
        }
        params = {"languageCode": "he", "regionCode": "IL"}
        try:
            res = httpx.get(url, headers=headers, params=params, timeout=12.0)
            if res.status_code == 200:
                return self._parse_place_payload(res.json(), city=city)
            print(f"[GooglePlaces] get_place_by_id({place_id}) returned HTTP {res.status_code}: {res.text[:200]}")
        except Exception as e:
            print(f"[GooglePlaces] Error in get_place_by_id({place_id}): {e}")
        return None

    def search_place(
        self,
        query: str,
        city: str = "",
        target_lat: Optional[float] = None,
        target_lng: Optional[float] = None,
    ) -> Optional[dict[str, Any]]:
        """
        Searches Official Google Places API (New) to discover & lock a business's `place_id`,
        official rating, review count, coordinates, address, and reviews.
        """
        if not self.api_key or not query:
            return None
        if not self._check_and_increment_quota("search_text", MONTHLY_HARD_CAP_SEARCH_TEXT):
            return None

        full_query = query if (city and city in query) else f"{query} {city}".strip()
        url = f"{self.PLACES_BASE}/places:searchText"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": self.SEARCH_MASK,
        }
        payload: dict[str, Any] = {
            "textQuery": full_query,
            "languageCode": "he",
            "regionCode": "IL",
            "maxResultCount": 5,
        }
        if target_lat and target_lng:
            payload["locationBias"] = {
                "circle": {
                    "center": {"latitude": target_lat, "longitude": target_lng},
                    "radius": 5000.0,
                }
            }

        try:
            res = httpx.post(url, headers=headers, json=payload, timeout=15.0)
            if res.status_code != 200:
                print(f"[GooglePlaces] search_place('{full_query}') returned HTTP {res.status_code}: {res.text[:200]}")
                return None

            places = res.json().get("places") or []
            if not places:
                return None

            scored: list[tuple[float, dict[str, Any]]] = []
            stop_words = {
                "שווארמה", "שוארמה", "השווארמה", "מסעדת", "shawarma", "על", "גחלים",
            }
            if city:
                stop_words.update(re.findall(r"[א-תa-zA-Z0-9]{2,}", city.lower()))

            def _norm_he(s: str) -> str:
                return (
                    s.lower()
                    .replace("שווארמא", "שווארמ")
                    .replace("שאוורמ", "שווארמ")
                    .replace("שוארמ", "שווארמ")
                    .replace("שוורמ", "שווארמ")
                )

            q_words = [
                _norm_he(w)
                for w in re.findall(r"[א-תa-zA-Z0-9]{2,}", query.lower())
                if w not in stop_words
            ]

            for idx, p in enumerate(places):
                p_name = str((p.get("displayName") or {}).get("text") or "").lower()
                p_name_norm = _norm_he(p_name)
                # Never match a shopping mall or unrelated non-shawarma business
                bad_place_names = ("פיצה", "סושי", "מאפייה", "קונדיטוריה", "סופרמרקט", "תחנת דלק")
                if any(bad in p_name and bad not in query.lower() for bad in bad_place_names):
                    continue
                if p_name in ("מול החוף וילג'", "מול החוף וילג", "גרנד קניון", "קניון לב המפרץ", "קניון הזהב"):
                    continue

                score = max(0.0, 30.0 - idx * 6.0)  # Google's own relevance rank bonus
                status = str(p.get("businessStatus") or "OPERATIONAL")
                if status == "OPERATIONAL":
                    score += 25.0
                elif status == "CLOSED_PERMANENTLY":
                    score -= 60.0

                p_addr = str(p.get("formattedAddress") or "")
                if q_words:
                    hits = sum(1 for w in q_words if w in p_name_norm)
                    score += hits * 35.0
                if city and city in p_addr:
                    score += 20.0

                loc = p.get("location") or {}
                if target_lat and target_lng and loc.get("latitude") and loc.get("longitude"):
                    dist = _haversine_km(target_lat, target_lng, float(loc["latitude"]), float(loc["longitude"]))
                    if dist <= 0.3:
                        score += 40.0
                    elif dist <= 1.5:
                        score += 20.0
                    elif dist > 12.0:
                        score -= 35.0

                scored.append((score, p))

            scored.sort(key=lambda x: x[0], reverse=True)
            return self._parse_place_payload(scored[0][1], city=city)
        except Exception as e:
            print(f"[GooglePlaces] Error in search_place('{full_query}'): {e}")
            return None
