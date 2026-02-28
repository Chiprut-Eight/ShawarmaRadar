import os
import requests
import json
import time
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv('GOOGLE_PLACES_API_KEY')

CITIES = [
    "תל אביב",
    "חיפה",
    "ירושלים",
    "באר שבע",
    "ראשון לציון",
    "פתח תקווה",
    "אשדוד",
    "נתניה",
    "חולון",
    "בני ברק",
    "רמת גן",
    "בת ים",
    "אשקלון",
    "הרצליה",
    "כפר סבא",
    "חדרה"
]

def generate_seeds():
    if not API_KEY:
        print("Missing API Key")
        return

    seeds = []
    seen_places = set()

    for city in CITIES:
        print(f"Searching for shawarma in {city}...")
        url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query=שווארמה ב{city}&language=iw&key={API_KEY}"
        
        try:
            res = requests.get(url)
            data = res.json()
            results = data.get("results", [])
            
            for place in results:
                # Basic quality filtering
                status = place.get("business_status", "")
                if status != "OPERATIONAL":
                    continue
                    
                rating = place.get("rating", 0.0)
                reviews = place.get("user_ratings_total", 0)
                if rating < 3.5 or reviews < 50:
                    continue
                
                name = place.get("name", "")
                place_id = place.get("place_id")
                
                # Deduplicate
                if place_id in seen_places:
                    continue
                seen_places.add(place_id)
                
                seeds.append({
                    "query": f"{name} {city}",
                    "city": city
                })
        except Exception as e:
            print(f"Error fetching for {city}: {e}")
            
        # Polite delay to respect API limits
        time.sleep(1.5)

    # Save to JSON
    output_path = os.path.join(os.path.dirname(__file__), "auto_seeds.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(seeds, f, ensure_ascii=False, indent=4)
        
    print(f"Successfully generated {len(seeds)} authentic shawarma seeds to {output_path}")

if __name__ == "__main__":
    generate_seeds()
