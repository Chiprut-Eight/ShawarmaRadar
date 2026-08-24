import json
from scrapers.google import GoogleBusinessScraper
g = GoogleBusinessScraper()
data = g.fetch_place_data("שווארמה שמש נס ציונה ישפרו סנטר ראשון לציון")
print("Address:")
print(data.get('address'))
