import asyncio
import os
import time
import json
import requests
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from scrapers.google import GoogleBusinessScraper
from scrapers.wolt import WoltTracker, TenBisTracker
from nlp import RankingEngine
from database import get_db, SessionLocal
import models
from regions import get_region_by_city

def send_telegram_alert(message: str):
    """ Helper to send Telegram notifications """
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not bot_token or not chat_id:
        return
    try:
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        requests.post(
            url,
            json={"chat_id": chat_id, "text": message, "parse_mode": "Markdown"},
            timeout=8.0
        )
    except Exception as e:
        print(f"Failed to send Telegram alert: {e}")

def process_restaurant(
    scraper: GoogleBusinessScraper,
    wolt: WoltTracker,
    tenbis: TenBisTracker,
    ai: RankingEngine,
    db: Session,
    search_query: str,
    default_city: str
):
    print(f"\n--- [Daily Scan] Processing: {search_query} ({default_city}) ---")
    
    # 1. Clean Display Name
    display_name = search_query.replace(f" {default_city}", "").strip()
    
    # 2. Free Google Scraper
    google_data = scraper.fetch_place_data(search_query)
    google_rating = google_data.get("rating")
    google_ratings_total = google_data.get("user_ratings_total", 0)
    google_address = google_data.get("address")
    google_reviews = google_data.get("reviews", [])

    # 3. Wolt Free API
    wolt_rating = 0.0
    wolt_address = None
    try:
        slug = wolt.search_venue(display_name, default_city)
        if slug:
            load_data = wolt.check_delivery_load(slug)
            if load_data:
                if load_data.get("rating") is not None:
                    wolt_rating = float(load_data["rating"])
                wolt_address = load_data.get("address")
    except Exception as e:
        print(f"Wolt lookup error: {e}")

    # 4. 10Bis Free API
    tenbis_rating = 0.0
    tenbis_address = None
    try:
        tb_data = tenbis.search_restaurant(display_name)
        if tb_data:
            tenbis_rating = tb_data.get("rating", 0.0)
            tenbis_address = tb_data.get("address")
    except Exception as e:
        print(f"10bis lookup error: {e}")

    # Pick best address
    best_address = google_address or wolt_address or tenbis_address or ""
    
    # Unique platform ID / key based on normalized name and city
    platform_key = f"{display_name}_{default_city}".replace(" ", "_")

    # 5. Get or Create Restaurant in DB
    restaurant = db.query(models.Restaurant).filter(
        (models.Restaurant.platform_id == platform_key) | 
        ((models.Restaurant.name == display_name) & (models.Restaurant.city == default_city))
    ).first()

    region = get_region_by_city(default_city) or "center"

    if not restaurant:
        restaurant = models.Restaurant(
            name=display_name,
            city=default_city,
            region=region,
            platform_id=platform_key,
            address=best_address,
            google_rating=google_rating,
            google_ratings_total=google_ratings_total
        )
        db.add(restaurant)
        db.commit()
        db.refresh(restaurant)
    else:
        if google_rating:
            restaurant.google_rating = google_rating
        if google_ratings_total:
            restaurant.google_ratings_total = google_ratings_total
        if best_address and not restaurant.address:
            restaurant.address = best_address
        restaurant.region = region
        db.commit()

    # 6. Process Reviews with Local Hebrew Sentiment
    for rev_data in google_reviews:
        content = rev_data.get("text", "")
        if not content:
            continue
            
        existing = db.query(models.Review).filter(
            models.Review.restaurant_id == restaurant.id,
            models.Review.content == content
        ).first()
        
        if existing:
            continue
            
        sentiment = ai.analyze_sentiment(content)
        published_at = datetime.now(timezone.utc)
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
        
    db.commit()

    # 7. Recalculate Final Radar Score
    all_reviews = db.query(models.Review).filter(models.Review.restaurant_id == restaurant.id).all()
    
    restaurant.last_score = ai.calculate_net_sentiment_score(all_reviews)
    restaurant.total_reviews = len(all_reviews)
    
    restaurant.bayesian_average = ai.calculate_final_radar_score(
        google_rating=restaurant.google_rating or 3.5,
        google_ratings_total=restaurant.google_ratings_total or 0,
        recent_reviews=all_reviews,
        wolt_rating=wolt_rating,
        tenbis_rating=tenbis_rating,
        social_volume=len(all_reviews)
    )
    
    restaurant.updated_at = datetime.now(timezone.utc)
    db.commit()
    print(f"-> Updated {restaurant.name} ({restaurant.city}) | Radar Score: {restaurant.bayesian_average}%")

def run_daily_scan_sync():
    """
    Executes the 100% Free Daily Scan across all seeds.
    Sends a rich summary to Telegram at completion.
    """
    print("==================================================")
    print("[ShawarmaRadar] Starting Daily Scan Cycle...")
    print("==================================================")
    
    db: Session = SessionLocal()
    scraper = GoogleBusinessScraper()
    wolt = WoltTracker()
    tenbis = TenBisTracker()
    ai = RankingEngine()
    
    seeds_path = os.path.join(os.path.dirname(__file__), "auto_seeds.json")
    seed_targets = []
    if os.path.exists(seeds_path):
        try:
            with open(seeds_path, "r", encoding="utf-8") as f:
                seed_targets = json.load(f)
            print(f"Loaded {len(seed_targets)} targets from {seeds_path}")
        except Exception as e:
            print(f"Error loading seeds: {e}")
            
    if not seed_targets:
        seed_targets = [
            {"query": "שווארמה הקוסם תל אביב", "city": "תל אביב"},
            {"query": "שווארמה חזן חיפה", "city": "חיפה"},
            {"query": "שווארמה שמש רמת גן", "city": "רמת גן"},
            {"query": "שווארמה אמיל חיפה", "city": "חיפה"},
            {"query": "שווארמה בנדורה תל אביב", "city": "תל אביב"}
        ]
        
    success_count = 0
    failure_count = 0
    start_time = time.time()
    
    for target in seed_targets:
        try:
            process_restaurant(scraper, wolt, tenbis, ai, db, target["query"], target["city"])
            success_count += 1
            time.sleep(1.0) # Polite delay
        except Exception as e:
            failure_count += 1
            print(f"Error processing {target.get('query')}: {e}")

    duration_mins = (time.time() - start_time) / 60.0
    print(f"Daily Scan Completed in {duration_mins:.1f} minutes.")
    
    # 8. Query Top Rankings for Telegram Report
    top_king = db.query(models.Restaurant).order_by(models.Restaurant.bayesian_average.desc()).first()
    
    regions = ["north", "center", "south", "sharon", "shfela"]
    region_labels = {
        "north": "צפון",
        "center": "מרכז",
        "south": "דרום",
        "sharon": "שרון",
        "shfela": "שפלה"
    }
    
    regional_kings_text = ""
    for r in regions:
        r_king = db.query(models.Restaurant).filter(models.Restaurant.region == r).order_by(models.Restaurant.bayesian_average.desc()).first()
        if r_king:
            regional_kings_text += f"• *{region_labels[r]}*: {r_king.name} ({r_king.city}) — `{r_king.bayesian_average}%`\n"

    king_info = f"{top_king.name} ({top_king.city}) — `{top_king.bayesian_average}%`" if top_king else "אין נתונים"

    telegram_report = (
        f"👑 *ShawarmaRadar — דו\"ח סריקה יומי*\n\n"
        f"📊 *סיכום סריקה:*\n"
        f"• נסרקו בהצלחה: {success_count} עסקים\n"
        f"• שגיאות: {failure_count}\n"
        f"• משך סריקה: {duration_mins:.1f} דקות\n\n"
        f"🏆 *מלך השווארמה הארצי להיום:*\n"
        f"👉 *{king_info}*\n\n"
        f"📍 *מובילי האזורים:*\n"
        f"{regional_kings_text}\n"
        f"🌐 האתר מעודכן: [ShawarmaRadar Live](https://shawarma-frontend.onrender.com)"
    )

    send_telegram_alert(telegram_report)
    print("Telegram report dispatched.")
    db.close()

async def run_daily_scan():
    """ Async wrapper to run in background """
    await asyncio.to_thread(run_daily_scan_sync)

if __name__ == "__main__":
    run_daily_scan_sync()
