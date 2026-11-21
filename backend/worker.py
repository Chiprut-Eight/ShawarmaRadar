import asyncio
import os
from dotenv import load_dotenv
load_dotenv()
import time
import json
import re
import requests
import sys
from datetime import datetime, timezone
from sqlalchemy.orm import Session

sys.stdout.reconfigure(encoding='utf-8')

from scrapers.google import GoogleBusinessScraper
from scrapers.wolt import WoltTracker, TenBisTracker
from nlp import RankingEngine
from database import get_db, SessionLocal
import models
from regions import get_region_by_city
from export_json import update_king_history, format_hebrew_duration

def clean_address(raw_address: str, business_name: str = "", city: str = "") -> str:
    if not raw_address:
        return ""
    if raw_address.strip() == city:
        return ""
    parts = [p.strip() for p in raw_address.split(",")]
    if len(parts) == 1:
        if parts[0] == city:
            return ""
        return parts[0]
    
    bname_words = set(business_name.split()) if business_name else set()
    clean_parts = []
    
    for part in parts:
        stripped = part.strip()
        if not stripped:
            continue
        if business_name and (stripped == business_name or stripped in business_name or business_name in stripped):
            continue
        if city and (stripped == city or city in stripped or stripped in city):
            continue
        if any(skip in stripped for skip in ["נפת", "מחוז", "ישראל", "district", "Israel"]):
            continue
        if re.match(r'^\d{5,}$', stripped):
            continue
        part_words = set(stripped.split())
        if bname_words and len(part_words) > 0 and part_words.issubset(bname_words):
            continue
        if re.match(r'^[\u0600-\u06FF\s\u200F]+$', stripped):
            continue
        clean_parts.append(stripped)
    
    return ", ".join(clean_parts[:2])

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
    default_city: str,
    address_warnings: list,
    seed_name: str = "",
    seed_address: str = ""
):
    print(f"\n--- [Daily Scan] Processing: {search_query} ({default_city}) ---")
    
    # 1. Clean Display Name
    display_name = seed_name.strip() if seed_name else search_query.replace(f" {default_city}", "").strip()
    
    # Unique platform ID / key based on normalized name and city
    platform_key = f"{display_name}_{default_city}".replace(" ", "_")

    # Look up existing restaurant early so we know if it already has a verified address
    restaurant = db.query(models.Restaurant).filter(
        (models.Restaurant.platform_id == platform_key) | 
        ((models.Restaurant.name == display_name) & (models.Restaurant.city == default_city))
    ).first()

    existing_address = (restaurant.address or "").strip() if restaurant else ""
    verified_address = seed_address.strip() or existing_address

    # 2. Free Google Scraper
    google_data = scraper.fetch_place_data(search_query, city=default_city, skip_address_lookup=bool(verified_address))
    google_rating = google_data.get("rating")
    google_ratings_total = google_data.get("user_ratings_total", 0)
    google_address = google_data.get("address")
    google_reviews = google_data.get("reviews", [])

    # 3. Wolt Free API
    wolt_rating = 0.0
    wolt_address = None
    try:
        venue_data = wolt.search_venue(display_name, default_city)
        if venue_data:
            if venue_data.get("rating") is not None:
                wolt_rating = float(venue_data["rating"])
            wolt_address = venue_data.get("address")
    except Exception as e:
        print(f"Wolt lookup error: {e}")

    # 4. 10Bis Free API
    tenbis_rating = 0.0
    tenbis_address = None
    try:
        tb_data = tenbis.search_restaurant(display_name, default_city)
        if tb_data:
            tenbis_rating = tb_data.get("rating", 0.0)
            tenbis_address = tb_data.get("address")
    except Exception as e:
        print(f"10bis lookup error: {e}")

    # Priority: Verified seed/DB address -> Google scraped address -> Wolt address -> 10Bis address
    if verified_address:
        best_address = verified_address
    else:
        valid_wolt = wolt_address and default_city in wolt_address
        valid_tenbis = tenbis_address and default_city in tenbis_address
        raw_candidate = ""
        if google_address:
            raw_candidate = google_address
        elif valid_wolt:
            raw_candidate = wolt_address
        elif valid_tenbis:
            raw_candidate = tenbis_address
        best_address = clean_address(raw_candidate, business_name=display_name, city=default_city)
    
    if not best_address:
        warning_msg = f"No address for '{display_name}' in '{default_city}'"
        print(warning_msg)
        address_warnings.append(warning_msg)
    
    # Filter non-shawarma places that slipped into the radar
    blacklisted_terms = ["סמבוסק", "פיצה", "המבורגר", "בורגר", "סושי", "גלידה"]
    is_invalid = any(term in display_name for term in blacklisted_terms)
    
    # Also check if snippets explicitly mention it's a pizza place or something else and NOT shawarma
    if not is_invalid and google_reviews:
        snippet_text = " ".join([r.get("text", "") for r in google_reviews])
        if any(term in snippet_text for term in blacklisted_terms) and "שווארמה" not in display_name and "שוארמה" not in display_name:
            is_invalid = True

    if is_invalid:
        print(f"Skipping {display_name} - Detected as non-shawarma (Blacklist match).")
        return

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
        restaurant.name = display_name
        restaurant.city = default_city
        restaurant.platform_id = platform_key
        if google_rating:
            restaurant.google_rating = google_rating
        if google_ratings_total:
            restaurant.google_ratings_total = google_ratings_total
        if best_address:
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
    address_warnings = []
    start_time = time.time()
    
    for target in seed_targets:
        try:
            process_restaurant(
                scraper,
                wolt,
                tenbis,
                ai,
                db,
                target["query"],
                target["city"],
                address_warnings,
                seed_name=target.get("name", ""),
                seed_address=target.get("address", "")
            )
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

    # Update King Reign History and build private reign summary for Telegram
    reign_summary_text = ""
    if top_king:
        try:
            history_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "data", "king_history.json")
            top_king_dict = {
                "platform_id": top_king.platform_id,
                "name": top_king.name,
                "city": top_king.city,
                "address": top_king.address or "",
                "bayesian_average": top_king.bayesian_average
            }
            history_data = update_king_history(top_king_dict, history_path)
            reigns = history_data.get("reigns", [])
            if reigns:
                current_reign = reigns[-1]
                cur_dur_str = format_hebrew_duration(current_reign.get("duration_seconds", 0))
                past_reigns = [
                    r for r in reigns[:-1]
                    if r.get("platform_id") == top_king.platform_id
                    or (r.get("name") == top_king.name and r.get("city") == top_king.city)
                ]
                reign_summary_text = f"⏱️ *רצף נוכחי בפסגה:* {cur_dur_str}\n"
                if past_reigns:
                    past_secs = sum(r.get("duration_seconds", 0) for r in past_reigns)
                    past_dur_str = format_hebrew_duration(past_secs)
                    reign_summary_text += f"📜 *היסטוריה קודמת בפסגה:* {past_dur_str} ({len(past_reigns)} קדנציות בעבר)\n"
                if len(reigns) > 1:
                    prev_king = reigns[-2]
                    prev_dur_str = format_hebrew_duration(prev_king.get("duration_seconds", 0))
                    reign_summary_text += f"👑 *המלך הקודם:* {prev_king.get('name')} ({prev_king.get('city')}) — שלט {prev_dur_str}\n"
        except Exception as e:
            print(f"Error building reign summary: {e}")

    warnings_text = ""
    if address_warnings:
        warnings_text = f"\n⚠️ *אזהרות כתובות ({len(address_warnings)}):*\n"
        for w in address_warnings[:15]:
            warnings_text += f"- {w}\n"
        if len(address_warnings) > 15:
            warnings_text += f"... ועוד {len(address_warnings)-15} שגיאות."

    telegram_report = (
        f"👑 *ShawarmaRadar — דו\"ח סריקה יומי*\n\n"
        f"📊 *סיכום סריקה:*\n"
        f"• נסרקו בהצלחה: {success_count} עסקים\n"
        f"• שגיאות: {failure_count}\n"
        f"• משך סריקה: {duration_mins:.1f} דקות\n"
        f"{warnings_text}\n"
        f"🏆 *מלך השווארמה הארצי להיום:*\n"
        f"👉 *{king_info}*\n"
        f"{reign_summary_text}\n"
        f"📍 *מובילי האזורים:*\n"
        f"{regional_kings_text}\n"
        f"🌐 האתר מעודכן: [ShawarmaRadar Live](https://shawarmaradar-app.web.app)"
    )

    send_telegram_alert(telegram_report)
    print("Telegram report dispatched.")
    db.close()

async def run_daily_scan():
    """ Async wrapper to run in background """
    await asyncio.to_thread(run_daily_scan_sync)

if __name__ == "__main__":
    run_daily_scan_sync()
