import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any, Optional
import httpx
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Load .env from both backend/ and workspace root
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_BACKEND_DIR, ".env"))
load_dotenv(os.path.join(os.path.dirname(_BACKEND_DIR), ".env"))

getattr(sys.stdout, "reconfigure", lambda **_: None)(encoding="utf-8")

from scrapers.google import GoogleBusinessScraper
from scrapers.wolt import WoltTracker, TenBisTracker, CITY_COORDINATES
from nlp import RankingEngine
from database import engine, SessionLocal
import models
from regions import get_region_by_city
from export_json import update_king_history, format_hebrew_duration

# Strictly <= 12/day per radar (12 ShawarmaRadar + 12 SushiRadar = 24/day <= 25/day Quota -> ₪0.00 guaranteed)
DAILY_GOOGLE_REFRESH_LIMIT = 12

BLACKLISTED_TERMS = [
    "סמבוסק", "פיצה", "המבורגר", "בורגר", "סושי", "גלידה",
    "ביס בפיתה", "ביס בלח\"י", "פיתה ביד", "פיתה בשר", "פיתה בסטה",
    "מיט טיים", "שניצליה", "סביח", "קוסקוס",
    "סנדוויץ' שוק", "בית הפול והשווארמה", "אצל מלי", "עבדאללה גריל"
]


def send_telegram_alert(message: str) -> None:
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not bot_token or not chat_id:
        return
    try:
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        httpx.post(
            url,
            json={"chat_id": chat_id, "text": message, "parse_mode": "Markdown"},
            timeout=8.0,
        )
    except Exception as e:
        print(f"Failed to send Telegram alert: {e}")


def sync_auto_seeds_file(db: Session, seeds_path: str) -> None:
    all_rests = db.query(models.Restaurant).order_by(models.Restaurant.id.asc()).all()
    seeds_out: list[dict[str, Any]] = []
    for r in all_rests:
        seeds_out.append({
            "id": r.id,
            "name": r.name,
            "query": f"{r.name} {r.city}",
            "city": r.city,
            "address": r.address or "",
            "lat": r.lat,
            "lng": r.lng,
            "google_place_id": r.google_place_id,
            "wolt_slug": r.wolt_slug,
            "tenbis_id": r.tenbis_id,
        })
    with open(seeds_path, "w", encoding="utf-8") as f:
        json.dump(seeds_out, f, ensure_ascii=False, indent=2)


def upsert_reviews_for_restaurant(
    db: Session,
    ai: RankingEngine,
    restaurant_id: int,
    reviews_payload: list[dict[str, Any]],
) -> None:
    for rev_data in reviews_payload:
        content = str(rev_data.get("text") or "").strip()
        if not content:
            continue
        existing = (
            db.query(models.Review)
            .filter(
                models.Review.restaurant_id == restaurant_id,
                models.Review.content == content,
            )
            .first()
        )
        star_val = rev_data.get("rating") if rev_data.get("rating") is not None else rev_data.get("rank")
        star_float: Optional[float] = float(star_val) if star_val is not None else None
        sentiment = ai.analyze_sentiment(content, star_rating=star_float)

        pub_dt = rev_data.get("published_at")
        if not isinstance(pub_dt, datetime):
            pub_dt = datetime.now(timezone.utc)
        weight = ai.calculate_recency_weight(pub_dt)

        if existing:
            existing.sentiment_score = sentiment
            existing.weight = weight
        else:
            db.add(
                models.Review(
                    restaurant_id=restaurant_id,
                    source=str(rev_data.get("source") or "google"),
                    content=content,
                    sentiment_score=sentiment,
                    weight=weight,
                    published_at=pub_dt,
                )
            )


def run_daily_scan_sync() -> None:
    """
    Deterministic Daily Scan:
    1. Ensures all seeds exist in DB.
    2. Refreshes up to DAILY_GOOGLE_REFRESH_LIMIT (12) oldest-synced businesses from Official Google Places API (New) by locked `place_id`.
    3. Refreshes Wolt & 10Bis ratings + customer reviews for ALL businesses by locked `wolt_slug` / `tenbis_id`.
    4. Recalculates scores, updates `auto_seeds.json`, and sends the daily Telegram report.
    """
    print("==================================================")
    print("[ShawarmaRadar] Starting Deterministic Daily Scan...")
    print("==================================================")

    models.ensure_schema_columns(engine)
    db: Session = SessionLocal()
    google_client = GoogleBusinessScraper()
    wolt = WoltTracker()
    tenbis = TenBisTracker()
    ai = RankingEngine()

    seeds_path = os.path.join(_BACKEND_DIR, "auto_seeds.json")
    seed_targets: list[dict[str, Any]] = []
    if os.path.exists(seeds_path):
        try:
            with open(seeds_path, "r", encoding="utf-8") as f:
                seed_targets = json.load(f)
            print(f"Loaded {len(seed_targets)} targets from {seeds_path}")
        except Exception as e:
            print(f"Error loading seeds: {e}")

    start_time = time.time()

    # Snapshot previous national rankings & scores before running the scan
    prev_ordered = (
        db.query(models.Restaurant)
        .order_by(models.Restaurant.bayesian_average.desc(), models.Restaurant.id.asc())
        .all()
    )
    prev_ranks: dict[int, int] = {r.id: idx for idx, r in enumerate(prev_ordered, 1)}
    prev_scores: dict[int, float] = {r.id: float(r.bayesian_average or 0.0) for r in prev_ordered}

    # 1. Ensure any newly added seed in auto_seeds.json exists in DB
    for target in seed_targets:
        s_name = str(target.get("name") or "").strip()
        s_city = str(target.get("city") or "").strip()
        if not s_name or not s_city:
            q_raw = str(target.get("query") or "").strip()
            s_name = s_name or q_raw.replace(f" {s_city}", "").strip()
        if not s_name or any(term in s_name for term in BLACKLISTED_TERMS):
            continue

        platform_key = f"{s_name}_{s_city}".replace(" ", "_")
        rest = (
            db.query(models.Restaurant)
            .filter(
                (models.Restaurant.platform_id == platform_key)
                | ((models.Restaurant.name == s_name) & (models.Restaurant.city == s_city))
            )
            .first()
        )
        if not rest:
            city_coords = CITY_COORDINATES.get(s_city, (32.0853, 34.7818))
            rest = models.Restaurant(
                name=s_name,
                city=s_city,
                region=get_region_by_city(s_city) or "center",
                platform_id=platform_key,
                address=str(target.get("address") or ""),
                lat=float(target["lat"]) if isinstance(target.get("lat"), (int, float)) else city_coords[0],
                lng=float(target["lng"]) if isinstance(target.get("lng"), (int, float)) else city_coords[1],
                google_place_id=target.get("google_place_id"),
                wolt_slug=target.get("wolt_slug"),
                tenbis_id=int(target["tenbis_id"]) if target.get("tenbis_id") else None,
            )
            db.add(rest)
        else:
            if not rest.google_place_id and target.get("google_place_id"):
                rest.google_place_id = str(target["google_place_id"])
            if not rest.wolt_slug and target.get("wolt_slug"):
                rest.wolt_slug = str(target["wolt_slug"])
            if not rest.tenbis_id and target.get("tenbis_id"):
                rest.tenbis_id = int(target["tenbis_id"])
    db.commit()

    # 2. Select up to DAILY_GOOGLE_REFRESH_LIMIT (20) restaurants for Official Google Places refresh tonight
    all_restaurants = db.query(models.Restaurant).all()
    all_restaurants_sorted_for_google = sorted(
        all_restaurants,
        key=lambda r: (
            0 if not r.google_place_id else 1,
            0 if r.google_synced_at is None else 1,
            r.google_synced_at.timestamp() if r.google_synced_at else 0.0,
            r.id,
        ),
    )
    google_refresh_ids = {
        r.id for r in all_restaurants_sorted_for_google[:DAILY_GOOGLE_REFRESH_LIMIT]
    }

    google_refreshed_count = 0
    closed_warnings: list[str] = []
    address_warnings: list[str] = []
    success_count = 0
    failure_count = 0

    for rest in all_restaurants:
        try:
            # A. Official Google Places API refresh (for tonight's scheduled batch)
            if rest.id in google_refresh_ids and google_client.api_key:
                g_data: Optional[dict[str, Any]] = None
                if rest.google_place_id:
                    g_data = google_client.get_place_by_id(rest.google_place_id, city=rest.city)
                else:
                    g_data = google_client.search_place(
                        f"{rest.name} {rest.address or ''} {rest.city}".strip(),
                        city=rest.city,
                        target_lat=rest.lat,
                        target_lng=rest.lng,
                    )

                if g_data:
                    if g_data.get("business_status") == "CLOSED_PERMANENTLY":
                        closed_warnings.append(f"{rest.name} ({rest.city}) דווח כסגור לצמיתות בגוגל")
                    else:
                        if g_data.get("place_id"):
                            rest.google_place_id = str(g_data["place_id"])
                        if g_data.get("rating") is not None:
                            rest.google_rating = float(g_data["rating"])
                        if g_data.get("user_ratings_total"):
                            rest.google_ratings_total = int(g_data["user_ratings_total"])
                        if g_data.get("lat") and g_data.get("lng"):
                            rest.lat = float(g_data["lat"])
                            rest.lng = float(g_data["lng"])
                        if not rest.address and g_data.get("address"):
                            rest.address = str(g_data["address"])
                        upsert_reviews_for_restaurant(db, ai, rest.id, g_data.get("reviews") or [])
                        rest.google_synced_at = datetime.now(timezone.utc)
                        google_refreshed_count += 1

            # B. Deterministic Wolt lookup (locked slug first, discovery fallback only if unlocked)
            w_data: Optional[dict[str, Any]] = None
            if rest.wolt_slug:
                w_data = wolt.get_venue_by_slug(rest.wolt_slug, rest.city)
            else:
                w_data = wolt.search_venue(
                    rest.name,
                    rest.city,
                    target_lat=rest.lat,
                    target_lng=rest.lng,
                    target_address=rest.address or "",
                )
                if w_data and w_data.get("slug"):
                    rest.wolt_slug = str(w_data["slug"])

            if w_data and w_data.get("rating") is not None:
                rest.wolt_rating = float(w_data["rating"])

            # C. Deterministic 10Bis lookup (locked restaurantId first, discovery fallback only if unlocked)
            tb_data: Optional[dict[str, Any]] = None
            if rest.tenbis_id:
                tb_data = tenbis.get_restaurant_by_id(rest.tenbis_id, rest.city)
            else:
                tb_data = tenbis.search_restaurant(
                    rest.name,
                    rest.city,
                    target_lat=rest.lat,
                    target_lng=rest.lng,
                    target_address=rest.address or "",
                )
                if tb_data and tb_data.get("restaurantId"):
                    rest.tenbis_id = int(tb_data["restaurantId"])

            if tb_data:
                if tb_data.get("rating"):
                    rest.tenbis_rating = float(tb_data["rating"])
                tb_id = int(tb_data.get("restaurantId") or 0)
                if tb_id > 0:
                    tb_revs = tenbis.fetch_reviews(tb_id)
                    upsert_reviews_for_restaurant(db, ai, rest.id, tb_revs)

            if not rest.address:
                address_warnings.append(f"חסרה כתובת עבור '{rest.name}' ({rest.city})")

            db.flush()

            # D. Recalculate Final Radar Score from persisted official numbers
            all_revs = db.query(models.Review).filter(models.Review.restaurant_id == rest.id).all()
            eff_g_rating = float(rest.google_rating) if rest.google_rating is not None else 3.5
            eff_g_total = rest.google_ratings_total or 0
            eff_wolt = float(rest.wolt_rating or 0.0)
            eff_tenbis = float(rest.tenbis_rating or 0.0)

            rest.last_score = ai.calculate_net_sentiment_score(all_revs)
            rest.total_reviews = len(all_revs)
            rest.bayesian_average = ai.calculate_final_radar_score(
                google_rating=eff_g_rating,
                google_ratings_total=eff_g_total,
                recent_reviews=all_revs,
                wolt_rating=eff_wolt,
                tenbis_rating=eff_tenbis,
                social_volume=len(all_revs),
            )
            rest.updated_at = datetime.now(timezone.utc)
            success_count += 1
        except Exception as e:
            failure_count += 1
            print(f"Error processing {rest.name} ({rest.city}): {e}")

    db.commit()
    sync_auto_seeds_file(db, seeds_path)

    duration_mins = (time.time() - start_time) / 60.0
    print(f"Daily Scan Completed in {duration_mins:.1f} minutes (Google Places refreshed: {google_refreshed_count}).")

    # Build Telegram Report
    top_king = db.query(models.Restaurant).order_by(models.Restaurant.bayesian_average.desc()).first()
    regions = ["north", "center", "south", "sharon", "shfela"]
    region_labels = {
        "north": "צפון",
        "center": "מרכז",
        "south": "דרום",
        "sharon": "שרון",
        "shfela": "שפלה",
    }

    regional_kings_text = ""
    for r in regions:
        r_king = (
            db.query(models.Restaurant)
            .filter(models.Restaurant.region == r)
            .order_by(models.Restaurant.bayesian_average.desc())
            .first()
        )
        if r_king:
            regional_kings_text += f"• *{region_labels[r]}*: {r_king.name} ({r_king.city}) — `{r_king.bayesian_average}%`\n"

    king_info = f"{top_king.name} ({top_king.city}) — `{top_king.bayesian_average}%`" if top_king else "אין נתונים"

    reign_summary_text = ""
    if top_king:
        try:
            history_path = os.path.join(_BACKEND_DIR, "..", "frontend", "src", "data", "king_history.json")
            top_king_dict = {
                "platform_id": top_king.platform_id,
                "name": top_king.name,
                "city": top_king.city,
                "address": top_king.address or "",
                "bayesian_average": top_king.bayesian_average,
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
    combined_warnings = closed_warnings + address_warnings
    if combined_warnings:
        warnings_text = f"\n⚠️ *התראות ({len(combined_warnings)}):*\n"
        for w in combined_warnings[:10]:
            warnings_text += f"- {w}\n"

    new_ordered = (
        db.query(models.Restaurant)
        .order_by(models.Restaurant.bayesian_average.desc(), models.Restaurant.id.asc())
        .all()
    )
    movements: list[tuple[int, str]] = []
    for new_rank, r in enumerate(new_ordered, 1):
        old_rank = prev_ranks.get(r.id)
        old_score = prev_scores.get(r.id, float(r.bayesian_average or 0.0))
        new_score = float(r.bayesian_average or 0.0)
        if old_rank is None:
            movements.append((999, f"🆕 *{r.name}* ({r.city}): נכנסה למקום #{new_rank} (`{new_score}%`)"))
        elif old_rank != new_rank:
            diff = old_rank - new_rank
            if diff > 0:
                movements.append((abs(diff), f"🟢 *{r.name}* ({r.city}): עלתה ממקום #{old_rank} למקום #{new_rank} (+{diff} | `{old_score}%` ⬅️ `{new_score}%`)"))
            else:
                movements.append((abs(diff), f"🔴 *{r.name}* ({r.city}): ירדה ממקום #{old_rank} למקום #{new_rank} ({diff} | `{old_score}%` ⬅️ `{new_score}%`)"))

    movements.sort(key=lambda x: x[0], reverse=True)
    if movements:
        shown_moves = [m[1] for m in movements[:15]]
        extra_moves = f"\n...ועוד {len(movements) - 15} תנועות נוספות בטבלה." if len(movements) > 15 else ""
        movements_text = f"📈 *תנועות בדירוג הבוקר ({len(movements)} שינויי מיקום):*\n" + "\n".join(shown_moves) + f"{extra_moves}\n"
    else:
        movements_text = "📈 *תנועות בדירוג הבוקר:*\n➖ לא הייתה שום תנועה בדירוגים הבוקר (הטבלה יציבה ללא שינויי מיקום).\n"

    usage = google_client.get_monthly_usage()
    quota_line = f"• מכסת גוגל של שווארמה רדאר החודש (חינם): `{usage.get('get_place', 0)}/450` רענונים\n"

    telegram_report = (
        f"👑 *ShawarmaRadar — דו\"ח סריקה יומי רשמי*\n\n"
        f"📊 *סיכום סריקה:*\n"
        f"• עודכנו בהצלחה: {success_count} עסקים (מתוכם {google_refreshed_count} רועננו ישירות מגוגל הלילה)\n"
        f"{quota_line}"
        f"• שגיאות: {failure_count} | משך: {duration_mins:.1f} דק'\n"
        f"{warnings_text}\n"
        f"🏆 *מלך השווארמה הארצי להיום:*\n"
        f"👉 *{king_info}*\n"
        f"{reign_summary_text}\n"
        f"📍 *מובילי האזורים:*\n"
        f"{regional_kings_text}\n"
        f"{movements_text}\n"
        f"🌐 האתר מעודכן: [ShawarmaRadar Live](https://shawarmaradar-app.web.app)"
    )

    send_telegram_alert(telegram_report)
    print("Telegram report dispatched.")
    db.close()


async def run_daily_scan() -> None:
    await asyncio.to_thread(run_daily_scan_sync)


if __name__ == "__main__":
    run_daily_scan_sync()
