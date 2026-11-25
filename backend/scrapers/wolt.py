from .base import PoliteScraper
import urllib.parse
import re
from typing import Any, Optional

CITY_COORDINATES = {
    "תל אביב": (32.0853, 34.7818),
    "חיפה": (32.7940, 34.9896),
    "נשר": (32.7700, 35.0394),
    "טירת כרמל": (32.7606, 34.9719),
    "קרית אתא": (32.8064, 35.1053),
    "קריית אתא": (32.8064, 35.1053),
    "קרית מוצקין": (32.8372, 35.0778),
    "קריית מוצקין": (32.8372, 35.0778),
    "קרית ביאליק": (32.8364, 35.0869),
    "קריית ביאליק": (32.8364, 35.0869),
    "קרית ים": (32.8492, 35.0697),
    "קריית ים": (32.8492, 35.0697),
    "ירושלים": (31.7683, 35.2137),
    "מבשרת ציון": (31.8022, 35.1506),
    "אבו גוש": (31.8058, 35.1094),
    "באר שבע": (31.2529, 34.7915),
    "ראשון לציון": (31.9730, 34.7925),
    "נס ציונה": (31.9314, 34.7981),
    "רחובות": (31.8928, 34.8113),
    "יבנה": (31.8763, 34.7397),
    "באר יעקב": (31.9369, 34.8322),
    "גן יבנה": (31.7903, 34.7047),
    "קרית מלאכי": (31.7294, 34.7469),
    "לוד": (31.9514, 34.8881),
    "רמלה": (31.9275, 34.8625),
    "מודיעין": (31.8903, 35.0104),
    "פתח תקווה": (32.0840, 34.8878),
    "אשדוד": (31.8044, 34.6553),
    "אשקלון": (31.6688, 34.5743),
    "שדרות": (31.5244, 34.5961),
    "נתיבות": (31.4194, 34.5886),
    "רהט": (31.3925, 34.7544),
    "דימונה": (31.0694, 35.0333),
    "קרית גת": (31.6100, 34.7642),
    "קריית גת": (31.6100, 34.7642),
    "אילת": (29.5577, 34.9519),
    "נתניה": (32.3215, 34.8532),
    "אבן יהודה": (32.2697, 34.8875),
    "בני דרור": (32.2603, 34.8942),
    "חדרה": (32.4340, 34.9197),
    "חריש": (32.4589, 35.0489),
    "פרדס חנה-כרכור": (32.4719, 34.9708),
    "פרדס חנה": (32.4719, 34.9708),
    "כפר יונה": (32.3167, 34.9358),
    "משמר השרון": (32.3611, 34.9044),
    "באקה אל-ע'רביה": (32.4189, 35.0408),
    "כפר סבא": (32.1782, 34.9076),
    "רעננה": (32.1848, 34.8713),
    "הרצליה": (32.1663, 34.8432),
    "הוד השרון": (32.1558, 34.8911),
    "רמת השרון": (32.1469, 34.8394),
    "טירה": (32.2333, 34.9500),
    "טייבה": (32.2667, 35.0167),
    "כפר קאסם": (32.1147, 34.9753),
    "ג'לג'וליה": (32.1544, 34.9519),
    "קלנסווה": (32.2858, 34.9819),
    "כפר קרע": (32.5025, 35.0567),
    "חולון": (32.0158, 34.7874),
    "אזור": (32.0242, 34.8053),
    "בת ים": (32.0197, 34.7500),
    "בני ברק": (32.0841, 34.8354),
    "רמת גן": (32.0684, 34.8248),
    "גבעתיים": (32.0722, 34.8089),
    "קרית אונו": (32.0628, 34.8569),
    "קריית אונו": (32.0628, 34.8569),
    "אור יהודה": (32.0294, 34.8572),
    "יהוד": (32.0331, 34.8894),
    "יהוד-מונוסון": (32.0331, 34.8894),
    "יהוד מונוסון": (32.0331, 34.8894),
    "ראש העין": (32.0956, 34.9567),
    "נצרת": (32.6996, 35.3035),
    "כפר כנא": (32.7475, 35.3414),
    "נוף הגליל": (32.7050, 35.3333),
    "עכו": (32.9278, 35.0818),
    "כרמיאל": (32.9199, 35.2901),
    "טבריה": (32.7959, 35.5312),
    "עפולה": (32.6074, 35.2891),
    "נהריה": (33.0059, 35.0941),
    "צפת": (32.9646, 35.4960),
    "קרית שמונה": (33.2073, 35.5701),
    "עוספיא": (32.7167, 35.0500),
    "דאלית אל-כרמל": (32.6917, 35.0528),
    "סח'נין": (32.8644, 35.3000),
    "סכנין": (32.8644, 35.3000),
    "טמרה": (32.8536, 35.1986),
    "שפרעם": (32.8056, 35.1706),
    "אום אל-פחם": (32.5186, 35.1536),
    "אום אל פחם": (32.5186, 35.1536),
    "מע'אר": (32.8889, 35.4056)
}

def _normalize_hebrew(text: str) -> str:
    if not text:
        return ""
    s = text.lower().strip()
    s = re.sub(r'[׳\'״"\-–|]', ' ', s)
    s = s.replace("שוארמה", "שווארמה").replace("שאוורמה", "שווארמה").replace("שוורמה", "שווארמה")
    s = s.replace("חאזן", "חזן").replace("ח׳אזן", "חזן").replace("ח'אזן", "חזן")
    s = s.replace("קריית", "קרית")
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def _has_whole_phrase(haystack: str, needle: str) -> bool:
    if not haystack or not needle:
        return False
    pattern = rf'(?:^|\s){re.escape(needle)}(?=\s|$)'
    return bool(re.search(pattern, haystack))

NON_SHAWARMA_VENUE_WORDS = [
    "פיצה", "בורגר", "המבורגר", "סושי", "גלידה", "מקסיקני", "סמבוסק",
    "פסטה", "קפה", "מאפייה", "קונדיטוריה", "שניצליה", "חומוסיה"
]

def _is_incompatible_venue_name(venue_name: str, query_name: str) -> bool:
    v_norm = _normalize_hebrew(venue_name)
    q_norm = _normalize_hebrew(query_name)
    for bad in NON_SHAWARMA_VENUE_WORDS:
        if bad in v_norm and bad not in q_norm:
            return True
    return False

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    import math
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return r * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

class WoltTracker(PoliteScraper):
    def __init__(self):
        super().__init__(base_url="https://restaurant-api.wolt.com", delay_seconds=0.35)
        self.city_venues_cache: dict[str, dict[str, dict[str, Any]]] = {}

    def _preload_city(self, city: str) -> dict[str, dict[str, Any]]:
        """ Preloads and caches all restaurants for a given city from Wolt discovery """
        if city in self.city_venues_cache:
            return self.city_venues_cache[city]
            
        coords = CITY_COORDINATES.get(city)
        if not coords:
            return {}
            
        lat, lon = coords
        url = f"/v1/pages/restaurants?lat={lat}&lon={lon}"
        
        venues: dict[str, dict[str, Any]] = {}
        try:
            response = self.get(url)
            if response and response.status_code == 200:
                data = response.json()
                for section in data.get("sections", []):
                    for item in section.get("items", []):
                        venue = item.get("venue")
                        if venue:
                            name = venue.get("name", "").strip()
                            slug = venue.get("slug") or name.lower()
                            rating_obj = venue.get("rating") or {}
                            rating = rating_obj.get("score")
                            volume = rating_obj.get("volume") or 0
                            address = venue.get("address") or ""
                            short_desc = venue.get("short_description") or ""
                            tags = venue.get("tags") or []
                            loc = venue.get("location")
                            v_lat = float(loc[1]) if isinstance(loc, list) and len(loc) == 2 else lat
                            v_lng = float(loc[0]) if isinstance(loc, list) and len(loc) == 2 else lon
                            venues[str(slug)] = {
                                "name": name,
                                "slug": slug,
                                "rating": float(rating) if rating is not None else None,
                                "volume": int(volume),
                                "address": address,
                                "short_description": short_desc,
                                "tags": tags,
                                "lat": v_lat,
                                "lng": v_lng
                            }
        except Exception as e:
            print(f"Wolt preloading error for {city}: {e}")
            
        self.city_venues_cache[city] = venues
        return venues

    def _extract_brand_core(self, text: str) -> str:
        """
        Extracts the distinctive brand name by removing parentheticals, branch suffixes after | or -,
        and generic category words like 'שווארמה', 'וגריל', 'מסעדת'.
        """
        cleaned = text.lower().strip()
        cleaned = re.sub(r'\s*\([^)]*\)\s*', ' ', cleaned)
        cleaned = re.split(r'\s*[\|\-–]\s*', cleaned)[0].strip()
        cleaned = _normalize_hebrew(cleaned)
        generic_words = [
            "שווארמה", "השווארמה", "של", "מסעדת", "וגריל", "גריל", "בשרים",
            "ועל", "האש", "על", "ושיפודים", "גחלים", "כיד", "המלך", "בעמ",
            "כשר", "למהדרין", "shawarma", " ופלאפל", "פלאפל"
        ]
        for gw in generic_words:
            cleaned = re.sub(rf'(?:^|\s){re.escape(gw.strip())}(?=\s|$)', ' ', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    def search_venue(
        self,
        query: str,
        city: str = "תל אביב",
        target_lat: Optional[float] = None,
        target_lng: Optional[float] = None,
        target_address: str = ""
    ) -> Optional[dict[str, Any]]:
        """
        Searches for a venue on Wolt using the discovery cache for the city,
        combining normalized Hebrew name/brand matching with GPS/address proximity.
        """
        city_venues = self._preload_city(city)
        if not city_venues:
            return None
            
        query_norm = _normalize_hebrew(query)
        query_core = _normalize_hebrew(re.sub(r'\s*\([^)]*\)\s*', ' ', query))
        query_brand = self._extract_brand_core(query)
        addr_norm = _normalize_hebrew(target_address)
        addr_num_match = re.search(r'\d+', addr_norm)
        addr_num = addr_num_match.group(0) if addr_num_match else ""

        candidates: list[tuple[float, dict[str, Any]]] = []

        for _, vdata in city_venues.items():
            v_name_raw = vdata.get("name", "")
            if _is_incompatible_venue_name(v_name_raw, query):
                continue
            v_name = _normalize_hebrew(v_name_raw)
            v_brand = self._extract_brand_core(v_name_raw)
            v_addr = _normalize_hebrew(vdata.get("address", ""))

            score = 0.0
            # Name / brand match (strict whole-word / whole-phrase matching only)
            if query_norm == v_name or (query_core and query_core == v_name):
                score += 100.0
            elif query_core and (_has_whole_phrase(v_name, query_core) or _has_whole_phrase(query_core, v_name)):
                score += 80.0
            elif query_brand and len(query_brand) >= 2 and v_brand:
                if query_brand == v_brand:
                    score += 75.0
                elif len(query_brand) >= 3 and (
                    _has_whole_phrase(v_brand, query_brand)
                    or (len(v_brand) >= 3 and _has_whole_phrase(query_brand, v_brand))
                ):
                    score += 60.0

            if score == 0.0:
                continue

            # Coordinate / address proximity bonus
            dist_km = 999.0
            if target_lat and target_lng and vdata.get("lat") and vdata.get("lng"):
                dist_km = _haversine_km(target_lat, target_lng, float(vdata["lat"]), float(vdata["lng"]))
                if dist_km <= 0.15:
                    score += 50.0
                elif dist_km <= 0.40:
                    score += 25.0
                elif dist_km > 1.8:
                    # Different branch or unrelated business across town
                    score -= 40.0

            if addr_num and _has_whole_phrase(v_addr, addr_num):
                score += 20.0

            if score >= 60.0:
                candidates.append((score, vdata))

        if not candidates:
            return None

        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]

class TenBisTracker(PoliteScraper):
    def __init__(self):
        super().__init__(base_url="https://www.10bis.co.il", delay_seconds=0.3)
        self.city_cache: dict[str, list[dict[str, Any]]] = {}
        self.reviews_cache: dict[int, list[dict[str, Any]]] = {}

    def _preload_city(self, city: str) -> list[dict[str, Any]]:
        if city in self.city_cache:
            return self.city_cache[city]

        coords = CITY_COORDINATES.get(city)
        if not coords:
            self.city_cache[city] = []
            return []

        lat, lon = coords
        by_id: dict[int, dict[str, Any]] = {}
        for mode in ("pickup", "delivery"):
            try:
                endpoint = f"/NextApi/SearchRestaurants?deliveryMethod={mode}&latitude={lat}&longitude={lon}"
                res = self.get(endpoint)
                if res and res.status_code == 200:
                    data = res.json()
                    rlist = data.get("Data", {}).get("restaurantsList", []) or []
                    for item in rlist:
                        rid = item.get("restaurantId")
                        if rid and rid not in by_id:
                            by_id[int(rid)] = item
            except Exception as e:
                print(f"10Bis preload error for {city} ({mode}): {e}")

        self.city_cache[city] = list(by_id.values())
        return self.city_cache[city]

    def _extract_brand_core(self, text: str) -> str:
        cleaned = text.lower().strip()
        cleaned = re.sub(r'\s*\([^)]*\)\s*', ' ', cleaned)
        cleaned = re.split(r'\s*[\|\-–]\s*', cleaned)[0].strip()
        cleaned = _normalize_hebrew(cleaned)
        generic_words = [
            "שווארמה", "השווארמה", "של", "מסעדת", "וגריל", "גריל", "בשרים",
            "ועל", "האש", "על", "ושיפודים", "גחלים", "כיד", "המלך", "בעמ",
            "כשר", "למהדרין", "shawarma", "פלאפל"
        ]
        for gw in generic_words:
            cleaned = re.sub(rf'(?:^|\s){re.escape(gw.strip())}(?=\s|$)', ' ', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    def fetch_reviews(self, restaurant_id: int) -> list[dict[str, Any]]:
        """
        Fetches verified customer reviews for a 10Bis restaurantId via GetRestaurantReviews.
        """
        if not restaurant_id:
            return []
        if restaurant_id in self.reviews_cache:
            return self.reviews_cache[restaurant_id]

        reviews: list[dict[str, Any]] = []
        try:
            res = self.get(f"/NextApi/GetRestaurantReviews?restaurantId={restaurant_id}")
            if res and res.status_code == 200:
                data = res.json()
                raw_list = data.get("Data", {}).get("reviewsList", []) or []
                for rv in raw_list[:20]:
                    txt = (rv.get("reviewText") or "").strip()
                    rank = rv.get("reviewRank")
                    if txt or rank:
                        reviews.append({
                            "text": txt,
                            "rank": float(rank) if rank is not None else None,
                            "source": "10bis"
                        })
        except Exception:
            pass

        self.reviews_cache[restaurant_id] = reviews
        return reviews

    def search_restaurant(
        self,
        restaurant_name: str,
        city: str = "תל אביב",
        target_lat: Optional[float] = None,
        target_lng: Optional[float] = None,
        target_address: str = ""
    ) -> Optional[dict[str, Any]]:
        """
        Searches for a restaurant on 10Bis using coordinate-based SearchRestaurants discovery,
        matching by brand name and GPS/address proximity.
        """
        if not restaurant_name:
            return None

        city_items = self._preload_city(city)
        if not city_items:
            return None

        query_norm = _normalize_hebrew(restaurant_name)
        query_core = _normalize_hebrew(re.sub(r'\s*\([^)]*\)\s*', ' ', restaurant_name))
        query_brand = self._extract_brand_core(restaurant_name)
        addr_norm = _normalize_hebrew(target_address)
        addr_num_match = re.search(r'\d+', addr_norm)
        addr_num = addr_num_match.group(0) if addr_num_match else ""

        candidates: list[tuple[float, dict[str, Any]]] = []

        for item in city_items:
            r_name_raw = (item.get("restaurantName") or "").strip()
            if not r_name_raw or _is_incompatible_venue_name(r_name_raw, restaurant_name):
                continue
            r_name = _normalize_hebrew(r_name_raw)
            r_brand = self._extract_brand_core(r_name_raw)
            r_addr = _normalize_hebrew(item.get("restaurantAddress") or "")

            score = 0.0
            if query_norm == r_name or (query_core and query_core == r_name):
                score += 100.0
            elif query_core and (_has_whole_phrase(r_name, query_core) or _has_whole_phrase(query_core, r_name)):
                score += 80.0
            elif query_brand and len(query_brand) >= 2 and r_brand:
                if query_brand == r_brand:
                    score += 75.0
                elif len(query_brand) >= 3 and (
                    _has_whole_phrase(r_brand, query_brand)
                    or (len(r_brand) >= 3 and _has_whole_phrase(query_brand, r_brand))
                ):
                    score += 60.0

            if score == 0.0:
                continue

            item_lat = item.get("latitude")
            item_lng = item.get("longitude")
            if target_lat and target_lng and item_lat and item_lng:
                dist_km = _haversine_km(target_lat, target_lng, float(item_lat), float(item_lng))
                if dist_km <= 0.15:
                    score += 50.0
                elif dist_km <= 0.40:
                    score += 25.0
                elif dist_km > 1.8:
                    score -= 40.0

            if addr_num and _has_whole_phrase(r_addr, addr_num):
                score += 20.0

            if score >= 60.0:
                candidates.append((score, item))

        if not candidates:
            return None

        candidates.sort(key=lambda x: x[0], reverse=True)
        best = candidates[0][1]

        raw_dec = best.get("reviewsRankDecimal")
        raw_int = best.get("reviewsRank")
        rating_val = 0.0
        if raw_dec and float(raw_dec) > 0:
            rating_val = float(raw_dec)
            if rating_val > 5.0:
                rating_val = rating_val / 2.0
        elif raw_int and float(raw_int) > 0:
            rating_val = float(raw_int)
            if rating_val > 5.0:
                rating_val = rating_val / 2.0

        return {
            "restaurantId": int(best.get("restaurantId") or 0),
            "name": best.get("restaurantName"),
            "rating": round(min(5.0, max(1.0, rating_val)), 2) if rating_val > 0 else 0.0,
            "numOfReviews": int(best.get("numOfReviews") or 0),
            "address": best.get("restaurantAddress")
        }
