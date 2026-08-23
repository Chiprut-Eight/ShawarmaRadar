from .base import PoliteScraper
import urllib.parse
import re

CITY_COORDINATES = {
    "תל אביב": (32.0853, 34.7818),
    "חיפה": (32.7940, 34.9896),
    "ירושלים": (31.7683, 35.2137),
    "באר שבע": (31.2529, 34.7915),
    "ראשון לציון": (31.9730, 34.7925),
    "נס ציונה": (31.9314, 34.7981),
    "רחובות": (31.8928, 34.8113),
    "יבנה": (31.8763, 34.7397),
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
    "חדרה": (32.4340, 34.9197),
    "כפר סבא": (32.1782, 34.9076),
    "רעננה": (32.1848, 34.8713),
    "הרצליה": (32.1663, 34.8432),
    "הוד השרון": (32.1558, 34.8911),
    "רמת השרון": (32.1469, 34.8394),
    "טירה": (32.2333, 34.9500),
    "טייבה": (32.2667, 35.0167),
    "כפר קאסם": (32.1147, 34.9753),
    "קלנסווה": (32.2858, 34.9819),
    "חולון": (32.0158, 34.7874),
    "בת ים": (32.0197, 34.7500),
    "בני ברק": (32.0841, 34.8354),
    "רמת גן": (32.0684, 34.8248),
    "גבעתיים": (32.0722, 34.8089),
    "קרית אונו": (32.0628, 34.8569),
    "אור יהודה": (32.0294, 34.8572),
    "יהוד": (32.0331, 34.8894),
    "ראש העין": (32.0956, 34.9567),
    "נצרת": (32.6996, 35.3035),
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

class WoltTracker(PoliteScraper):
    def __init__(self):
        super().__init__(base_url="https://restaurant-api.wolt.com", delay_seconds=0.5)
        self.city_venues_cache = {} # Cache discovered venues by city

    def _preload_city(self, city: str):
        """ Preloads and caches all restaurants for a given city from Wolt discovery """
        if city in self.city_venues_cache:
            return self.city_venues_cache[city]
            
        coords = CITY_COORDINATES.get(city)
        if not coords:
            return {}
            
        lat, lon = coords
        url = f"/v1/pages/restaurants?lat={lat}&lon={lon}"
        
        venues = {}
        try:
            response = self.get(url)
            if response and response.status_code == 200:
                data = response.json()
                for section in data.get("sections", []):
                    for item in section.get("items", []):
                        venue = item.get("venue")
                        if venue:
                            name = venue.get("name", "").strip()
                            slug = venue.get("slug")
                            rating = venue.get("rating", {}).get("score")
                            address = venue.get("address")
                            venues[name.lower()] = {
                                "name": name,
                                "slug": slug,
                                "rating": float(rating) if rating is not None else None,
                                "address": address
                            }
        except Exception as e:
            print(f"Wolt preloading error for {city}: {e}")
            
        self.city_venues_cache[city] = venues
        return venues

    def search_venue(self, query: str, city: str = "תל אביב"):
        """
        Searches for a venue on Wolt using the discovery cache strictly within that city.
        """
        city_venues = self._preload_city(city)
        if not city_venues:
            return None
            
        query_norm = query.lower().strip()
        
        # 1. Exact match
        for venue_name, vdata in city_venues.items():
            if query_norm == venue_name:
                return vdata
                
        # 2. Strict containment
        for venue_name, vdata in city_venues.items():
            if query_norm in venue_name or venue_name in query_norm:
                return vdata
                
        return None

class TenBisTracker(PoliteScraper):
    def __init__(self):
        super().__init__(base_url="https://www.10bis.co.il", delay_seconds=0.5)

    def search_restaurant(self, restaurant_name: str, city: str = "תל אביב"):
        return None
