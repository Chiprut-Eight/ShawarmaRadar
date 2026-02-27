import asyncio
from scrapers.google import GoogleBusinessScraper
from nlp import RankingEngine
from database import engine, get_db
import models
from sqlalchemy.orm import Session

async def run_tel_aviv_demo():
    print("Starting Tel Aviv Data Pipeline Demo...")
    
    # 1. Initialize our tools
    scraper = GoogleBusinessScraper()
    ai = RankingEngine()
    db: Session = next(get_db())
    
    target_places = ["הקוסם תל אביב", "מפגש רמבם תל אביב", "שווארמה בינו תל אביב"]
    
    for target in target_places:
        print(f"\n--- Scanning {target} ---")
        place_id = scraper.search_place(target)
        if not place_id:
            print(f"Could not find a place ID for {target}")
            continue
            
        reviews_data = scraper.fetch_recent_reviews(place_id)
        
        if not reviews_data:
            print(f"Skipping {target} due to lack of data.")
            continue
            
        print(f"Loaded {len(reviews_data)} reviews. Analyzing sentiment...")
        
        for review in reviews_data[:3]: # limit to 3 for demo costs
            text = review.get("text", "")
            if text:
                score = ai.analyze_sentiment(text)
                print(f"Review: {text[:50]}... | Sentiment Score: {score}")

if __name__ == "__main__":
    asyncio.run(run_tel_aviv_demo())
