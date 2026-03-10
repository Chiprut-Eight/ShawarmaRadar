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
        DISABLED — Google Places API usage suspended to prevent billing.
        Previously used Text Search API to find Place IDs.
        """
        print(f"[DISABLED] Google Places API call skipped for: {query}")
        return None, None
        
    def fetch_recent_reviews(self, place_id: str):
        """
        DISABLED — Google Places API usage suspended to prevent billing.
        Previously fetched reviews and ratings for a given Google Place ID.
        """
        print(f"[DISABLED] Google Places API call skipped for Place ID: {place_id}")
        return {"reviews": [], "rating": None, "user_ratings_total": 0}
