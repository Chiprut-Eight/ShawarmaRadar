from .base import PoliteScraper
import urllib.parse

class WoltTracker(PoliteScraper):
    def __init__(self):
        super().__init__(base_url="https://restaurant-api.wolt.com", delay_seconds=3.0)
        
    def search_venue(self, query: str, lat: float = 32.0853, lon: float = 34.7818):
        """
        Searches for a venue on Wolt (by default around Tel Aviv coordinates).
        Returns the venue slug if found.
        """
        encoded_query = urllib.parse.quote(query)
        params = {
            "lat": lat,
            "lon": lon,
            "q": query
        }
        
        # Searching via wolt consumer API
        response = self.get("/v3/venues/search", params=params)
        if response and response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            if results:
                return results[0].get('slug')
        return None

    def check_delivery_load(self, venue_slug: str):
        """
        Checks real-time delivery estimates and availability 
        to indicate load/demand at a specific branch.
        """
        response = self.get(f"/v3/venues/slug/{venue_slug}")
        if response and response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            if results:
                venue = results[0]
                # High delivery times usually mean high load
                estimate = venue.get('delivery_specs', {}).get('delivery_times', {}).get('minute_estimate')
                rating = venue.get('rating', {}).get('score')
                
                print(f"Wolt Load for {venue_slug}: Estimate {estimate} mins, Rating: {rating}")
                return {"estimate_mins": estimate, "rating": rating}
                
        print(f"Failed to fetch Wolt delivery load for venue: {venue_slug}")
        return None
