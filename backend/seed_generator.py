import os
import requests
import json
import time
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv('GOOGLE_PLACES_API_KEY')

CITIES = [
    # Major Cities
    "תל אביב", "חיפה", "ירושלים", "באר שבע", "ראשון לציון", "פתח תקווה", 
    "אשדוד", "נתניה", "חולון", "בני ברק", "רמת גן", "בת ים", "אשקלון", 
    "הרצליה", "כפר סבא", "חדרה",
    # Arab Towns and Villages
    "נצרת", "דאלית אל-כרמל", "כפר קאסם", "אום אל-פחם", "רהט", "טייבה", 
    "טירה", "סח'נין", "שפרעם", "עוספיא", "טמרה", "קלנסווה", "כפר כנא",
    "יפיע", "מע'אר", "עראבה", "כפר מנדא", "מג'ד אל-כרום", "אבו גוש"
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
        
        while url:
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
                    
                    # Negative Title Filter to catch false-positives (Burgers, Sushi, etc)
                    negative_words = ["בורגר", "burger", "פיצה", "pizza", "סושי", "sushi", "סטיישן", "station", "קפה", "cafe", "גלידה"]
                    if any(nw in name.lower() for nw in negative_words):
                        # Make sure it's not a legitimate mixed place, but usually "Burger" means it's a burger joint.
                        if "שווארמה" not in name and "שוארמה" not in name:
                            continue
                    
                    # Deduplicate
                    if place_id in seen_places:
                        continue
                    seen_places.add(place_id)
                    
                    seeds.append({
                        "query": f"{name} {city}",
                        "city": city
                    })
                    
                # Pagination
                next_page_token = data.get("next_page_token")
                if next_page_token:
                    url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken={next_page_token}&key={API_KEY}"
                    time.sleep(2.0) # Google requires short delay between pagination loops
                else:
                    url = None
                    
            except Exception as e:
                print(f"Error fetching for {city}: {e}")
                url = None
                
        # Delay between cities
        time.sleep(1.5)

    # Save to JSON
    output_path = os.path.join(os.path.dirname(__file__), "auto_seeds.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(seeds, f, ensure_ascii=False, indent=4)
        
    print(f"Successfully generated {len(seeds)} authentic shawarma seeds to {output_path}")

if __name__ == "__main__":
    generate_seeds()
