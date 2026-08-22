from .base import PoliteScraper
import urllib.parse
import re

CITY_COORDINATES = {
    "תל אביב": (32.0853, 34.7818),
    "חיפה": (32.7940, 34.9896),
    "ירושלים": (31.7683, 35.2137),
    "באר שבע": (31.2529, 34.7915),
    "ראשון לציון": (31.9730, 34.7925),
    "פתח תקווה": (32.0840, 34.8878),
    "אשדוד": (31.8044, 34.6553),
    "נתניה": (32.3215, 34.8532),
    "חולון": (32.0158, 34.7874),
    "בני ברק": (32.0841, 34.8354),
    "רמת גן": (32.0684, 34.8248),
    "בת ים": (32.0197, 34.7500),
    "אשקלון": (31.6688, 34.5743),
    "הרצליה": (32.1663, 34.8432),
    "כפר סבא": (32.1782, 34.9076),
    "חדרה": (32.4340, 34.9197),
    "רעננה": (32.1848, 34.8713),
    "מודיעין": (31.8903, 35.0104),
    "רחובות": (31.8928, 34.8113),
    "נצרת": (32.6996, 35.3035),
    "עכו": (32.9278, 35.0818),
    "כרמיאל": (32.9199, 35.2901),
    "טבריה": (32.7959, 35.5312),
    "עפולה": (32.6074, 35.2891),
    "אילת": (29.5577, 34.9519)
}

class WoltTracker(PoliteScraper):
    def __init__(self):
        super().__init__(base_url="https://restaurant-api.wolt.com", delay_seconds=0.5)
        self.city_venues_cache = {} # Cache discovered venues by city to minimize network calls

    def _preload_city(self, city: str):
        """ Preloads and caches all restaurants for a given city from Wolt discovery """
        if city in self.city_venues_cache:
            return self.city_venues_cache[city]
            
        lat, lon = CITY_COORDINATES.get(city, (32.0853, 34.7818))
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
        Searches for a venue on Wolt using the discovery cache.
        Returns the venue dict if found.
        """
        city_venues = self._preload_city(city)
        query_norm = query.lower().strip()
        
        # Exact or partial match
        for venue_name, vdata in city_venues.items():
            if query_norm in venue_name or venue_name in query_norm:
                return vdata
                
        # Word overlap match
        query_words = [w for w in re.findall(r'[\w]+', query_norm) if len(w) > 2 and w not in ["שווארמה", "שוארמה"]]
        if query_words:
            for venue_name, vdata in city_venues.items():
                if any(w in venue_name for w in query_words):
                    return vdata
                    
        return None

    def check_delivery_load(self, venue_slug: str):
        """
        Checks detailed load for a venue slug.
        """
        try:
            response = self.get(f"/v3/venues/slug/{venue_slug}")
            if response and response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                if results:
                    venue = results[0]
                    estimate = venue.get('delivery_specs', {}).get('delivery_times', {}).get('minute_estimate')
                    rating = venue.get('rating', {}).get('score')
                    address = venue.get('address')
                    
                    return {
                        "estimate_mins": estimate,
                        "rating": float(rating) if rating is not None else None,
                        "address": address
                    }
        except Exception as e:
            print(f"Wolt venue lookup error for {venue_slug}: {e}")
        return None

class TenBisTracker(PoliteScraper):
    def __init__(self):
        super().__init__(base_url="https://www.10bis.co.il", delay_seconds=0.5)
        
    def search_restaurant(self, query: str):
        """
        Searches 10bis for a restaurant.
        """
        encoded_query = urllib.parse.quote(query)
        endpoint = f"/NextApi/SearchRestaurants?deliveryMethod=pickup&FilterByPassCard=false&FilterByShowTbisInfo=false&SortBy=rating&searchPhrase={encoded_query}"
        
        try:
            response = self.get(endpoint)
            if response and response.status_code == 200:
                data = response.json()
                results = data.get('Data', {}).get('restaurantsList', [])
                if results:
                    first = results[0]
                    return {
                        "name": first.get("restaurantName"),
                        "rating": float(first.get("reviewsScore", 0.0)),
                        "reviews_count": int(first.get("reviewsCount", 0)),
                        "address": first.get("restaurantAddress"),
                        "is_kosher": first.get("isKosher", False)
                    }
        except Exception as e:
            print(f"10bis search error for {query}: {e}")
                
        return None
