import asyncio
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from scrapers.google import GoogleBusinessScraper
from nlp import RankingEngine
from database import engine, get_db
import models
from regions import get_region_by_city

async def process_restaurant(scraper: GoogleBusinessScraper, ai: RankingEngine, db: Session, search_query: str, default_city: str):
    print(f"\n--- Processing {search_query} ---")
    
    # 1. Search for Place ID
    place_id = scraper.search_place(search_query)
    if not place_id:
        print(f"Could not find Place ID for {search_query}")
        return
        
    # 2. Fetch Reviews
    reviews_data = scraper.fetch_recent_reviews(place_id)
    if not reviews_data:
        print(f"Skipping {search_query} due to lack of data.")
        return
        
    # 3. Get or Create Restaurant in DB
    restaurant = db.query(models.Restaurant).filter(models.Restaurant.platform_id == place_id).first()
    
    if not restaurant:
        # Determine Region
        region = get_region_by_city(default_city) or "center" # fallback
        
        # Using search_query as name for now, or extract from Google API (which we don't have deeply parsed right now)
        display_name = search_query.replace(f" {default_city}", "").strip()
        
        restaurant = models.Restaurant(
            name=display_name,
            city=default_city,
            region=region,
            platform_id=place_id
        )
        db.add(restaurant)
        db.commit()
        db.refresh(restaurant)

    # 4. Process Reviews 
    new_reviews_count = 0
    for rev_data in reviews_data:
        # Check if we already have this review (in real life we'd check author/time, but here we just take last 5 as distinct by published_at approx or just add them if we don't have matching content)
        # For simplicity in this early version, we will just add them if text isn't in DB for this restaurant
        content = rev_data.get("text", "")
        if not content:
            continue
            
        existing = db.query(models.Review).filter(
            models.Review.restaurant_id == restaurant.id,
            models.Review.content == content
        ).first()
        
        if existing:
            continue
            
        # Analyze new review
        sentiment = ai.analyze_sentiment(content)
        
        # We need a proper datetime from Google's 'time' (timestamp)
        timestamp = rev_data.get("time")
        published_at = datetime.fromtimestamp(timestamp, tz=timezone.utc) if timestamp else datetime.now(timezone.utc)
        
        weight = ai.calculate_recency_weight(published_at)
        
        review = models.Review(
            restaurant_id=restaurant.id,
            source="google",
            content=content,
            sentiment_score=sentiment,
            weight=weight,
            published_at=published_at
        )
        db.add(review)
        new_reviews_count += 1
        
    db.commit()
    
    # 5. Recalculate Scores
    all_reviews = db.query(models.Review).filter(models.Review.restaurant_id == restaurant.id).all()
    
    if all_reviews:
        # Calculate Net Sentiment (0 to 100 percentage)
        restaurant.last_score = ai.calculate_net_sentiment_score(all_reviews)
        restaurant.total_reviews = len(all_reviews)
        
        # Calculate Global Average for Bayesian (mocking global as 50 here for simplicity, or we can calculate real global)
        global_avg = 50.0 
        # C = 5 (confidence threshold for shawarma stands since we pull 5 per run)
        restaurant.bayesian_average = ai.calculate_bayesian_average(
            total_reviews=restaurant.total_reviews,
            average_score=restaurant.last_score,
            confidence_threshold=5,
            global_average=global_avg
        )
        
        db.commit()
        print(f"Updated {restaurant.name} -> New Bayesian Score: {restaurant.bayesian_average:.2f}")

async def run_cron_cycle():
    print("Starting background worker cycle...")
    db: Session = next(get_db())
    scraper = GoogleBusinessScraper()
    ai = RankingEngine()
    
    # Seeds for popular cities
    seed_targets = [
        {"query": "הקוסם תל אביב", "city": "תל אביב"},
        {"query": "מפגש רמבם תל אביב", "city": "תל אביב"},
        {"query": "שווארמה חזן חיפה", "city": "חיפה"},
        {"query": "שווארמה אמיל חיפה", "city": "חיפה"},
        {"query": "סעיד באר שבע", "city": "באר שבע"},
        {"query": "במבינו באר שבע", "city": "באר שבע"},
        {"query": "שאולי חדרה", "city": "חדרה"}
    ]
    
    for target in seed_targets:
        await process_restaurant(scraper, ai, db, target["query"], target["city"])
        
    print("Cycle complete.")

if __name__ == "__main__":
    asyncio.run(run_cron_cycle())
