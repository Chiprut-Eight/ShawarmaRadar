import os
import requests
from dotenv import load_dotenv

load_dotenv()
key = os.getenv('GOOGLE_PLACES_API_KEY')

queries = ['שווארמה עומרי נצרת', 'שווארמה סבאח באר שבע', 'שווארמה אליעזר באר שבע']

for q in queries:
    res = requests.get(f"https://maps.googleapis.com/maps/api/place/textsearch/json?query={q}&language=iw&key={key}")
    data = res.json().get('results', [])
    print(f"\n--- {q} ---")
    if data:
        print(f"Name: {data[0].get('name')}")
        print(f"Address: {data[0].get('formatted_address')}")
        print(f"Rating: {data[0].get('rating')} ({data[0].get('user_ratings_total')} reviews)")
    else:
        print("NOT FOUND")
