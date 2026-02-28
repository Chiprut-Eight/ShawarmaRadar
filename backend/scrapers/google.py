from .base import PoliteScraper
from dotenv import load_dotenv
import os
import json

load_dotenv()

class GoogleBusinessScraper(PoliteScraper):
    def __init__(self):
        super().__init__(base_url="https://maps.googleapis.com/maps/api/place", delay_seconds=1.5)
        self.api_key = os.getenv("GOOGLE_PLACES_API_KEY")
        
    def search_place(self, query: str):
        """
        Uses Text Search API to find a fresh Place ID for a given restaurant name.
        """
        if not self.api_key:
            return None
            
        params = {
            "query": f"{query} israel",
            "key": self.api_key,
            "language": "iw"
        }
        
        response = self.get("/textsearch/json", params=params)
        if response and response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            if results:
                place_id = results[0]["place_id"]
                address = results[0].get("formatted_address", "")
                print(f"Found lively Place ID for {query}: {place_id} at {address}")
                return place_id, address
        return None, None
        
    def fetch_recent_reviews(self, place_id: str):
        """
        Fetches the most recent reviews and the overall rating for a given Google Place ID 
        using the real Google Places API.
        """
        if not self.api_key:
            print("Error: GOOGLE_PLACES_API_KEY is not set.")
            return {"reviews": [], "rating": None, "user_ratings_total": 0}
            
        params = {
            "place_id": place_id,
            "key": self.api_key,
            "fields": "reviews,user_ratings_total,rating,name",
            "language": "iw" # Hebrew
        }
        
        response = self.get("/details/json", params=params)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("status") == "OK":
                result = data.get("result", {})
                reviews = result.get("reviews", [])
                rating = result.get("rating")
                user_ratings_total = result.get("user_ratings_total", 0)
                print(f"Successfully fetched {len(reviews)} reviews for Place ID {place_id}. Rating: {rating} ({user_ratings_total})")
                return {"reviews": reviews, "rating": rating, "user_ratings_total": user_ratings_total}
            else:
                print(f"Google API Error: {data.get('status')} - {data.get('error_message', 'Unknown Error')}")
        else:
            print(f"Failed to fetch Google Reviews. Status Code: {response.status_code if response else 'No Response'}")
            
        return {"reviews": [], "rating": None, "user_ratings_total": 0}
