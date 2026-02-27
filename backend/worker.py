import asyncio
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from scrapers.google import GoogleBusinessScraper
from nlp import RankingEngine
from database import engine, get_db
import models
from regions import get_region_by_city
from scrapers.social import SocialMediaScanner
from scrapers.wolt import WoltTracker

async def process_restaurant(scraper: GoogleBusinessScraper, social: SocialMediaScanner, wolt: WoltTracker, ai: RankingEngine, db: Session, search_query: str, default_city: str):
    print(f"\n--- Processing {search_query} ---")
    
    # 1. Search for Place ID
    place_id, address = scraper.search_place(search_query)
    if not place_id:
        print(f"Could not find Place ID for {search_query}")
        return
        
    # 2. Fetch Reviews from all sources
    google_reviews = scraper.fetch_recent_reviews(place_id) or []
    for gr in google_reviews:
        gr["source"] = "google"
        
    social_reviews = []
    if social and social.client:
        base_hashtag = search_query.replace(" ", "")
        print(f"Pulling Tiktok/Insta for #{base_hashtag}...")
        try:
            tiktok_data = social.scan_tiktok_hashtags([base_hashtag])
            if tiktok_data:
                for item in tiktok_data:
                    social_reviews.append({"text": item.get("text", ""), "source": "tiktok", "time": None})
            
            insta_data = social.scan_instagram_tags([base_hashtag])
            if insta_data:
                for item in insta_data:
                    social_reviews.append({"text": item.get("text", ""), "source": "instagram", "time": None})
        except Exception as e:
            print(f"Warning: Social scraping failed - {e}")
            
    # Combine reviews
    reviews_data = google_reviews + social_reviews
    
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
            platform_id=place_id,
            address=address
        )
        db.add(restaurant)
        db.commit()
        db.refresh(restaurant)

    # 4. Process Reviews 
    new_reviews_count = 0
    for rev_data in reviews_data:
        content = rev_data.get("text", "")
        source_name = rev_data.get("source", "google")
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
            source=source_name,
            content=content,
            sentiment_score=sentiment,
            weight=weight,
            published_at=published_at
        )
        db.add(review)
        new_reviews_count += 1
        
    db.commit()
    
    # 5. Get Wolt Rating (Optional)
    try:
        slug = wolt.search_venue(search_query)
        if slug:
            load = wolt.check_delivery_load(slug)
            if load and load.get("rating"):
                print(f"Wolt rating found: {load.get('rating')}")
    except Exception as e:
        pass
    
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

def run_cron_cycle_sync():
    print("Starting background worker cycle...")
    db: Session = next(get_db())
    scraper = GoogleBusinessScraper()
    social = SocialMediaScanner()
    wolt = WoltTracker()
    ai = RankingEngine()
    
    # Seeds for strictly verified Shawarma stands across Israel
    seed_targets = [
        {"query": "שווארמה הקוסם תל אביב", "city": "תל אביב"},
        {"query": "שווארמה מפגש רמבם תל אביב", "city": "תל אביב"},
        {"query": "שווארמה חזן חיפה", "city": "חיפה"},
        {"query": "שווארמה אמיל חיפה", "city": "חיפה"},
        {"query": "שווארמה שמש רמת גן", "city": "רמת גן"},
        {"query": "שווארמה בכור את שושי אור יהודה", "city": "אור יהודה"},
        {"query": "שווארמה שאולי חדרה", "city": "חדרה"},
        {"query": "שווארמה אליעזר באר שבע", "city": "באר שבע"},
        {"query": "שווארמה סבאח באר שבע", "city": "באר שבע"},
        {"query": "שווארמה עומרי נצרת", "city": "נצרת"}
    ]
    
    for target in seed_targets:
        # Create a new event loop just for this thread execution
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(process_restaurant(scraper, social, wolt, ai, db, target["query"], target["city"]))
        loop.close()
        
    print("Cycle complete.")

async def run_cron_cycle():
    # Helper to prevent blocking main event loop since Apify client is sync
    import asyncio
    await asyncio.to_thread(run_cron_cycle_sync)

if __name__ == "__main__":
    asyncio.run(run_cron_cycle())
