import argparse
import os
import sys
from datetime import datetime, timezone
from typing import Optional
from dotenv import load_dotenv

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_BACKEND_DIR, ".env"))
load_dotenv(os.path.join(os.path.dirname(_BACKEND_DIR), ".env"))

getattr(sys.stdout, "reconfigure", lambda **_: None)(encoding="utf-8")

from database import engine, SessionLocal
import models
from regions import get_region_by_city
from scrapers.google import GoogleBusinessScraper
from scrapers.wolt import WoltTracker, TenBisTracker, CITY_COORDINATES
from nlp import RankingEngine
from worker import sync_auto_seeds_file, upsert_reviews_for_restaurant
from export_json import export_all


def add_verified_shawarma(
    name: str,
    city: str,
    address: str = "",
    lat: float = 0.0,
    lng: float = 0.0,
    google_rating: Optional[float] = None,
    google_ratings_total: Optional[int] = None,
    wolt_rating: float = 0.0,
    tenbis_rating: float = 0.0,
) -> None:
    models.ensure_schema_columns(engine)
    db = SessionLocal()
    ai = RankingEngine()
    google_client = GoogleBusinessScraper()

    platform_key = f"{name}_{city}".replace(" ", "_")
    region = get_region_by_city(city) or "center"

    rest = (
        db.query(models.Restaurant)
        .filter(
            (models.Restaurant.platform_id == platform_key)
            | ((models.Restaurant.name == name) & (models.Restaurant.city == city))
        )
        .first()
    )

    # Fetch 100% Official Google Places data automatically
    g_data = google_client.search_place(
        f"{name} {address} {city}".strip(),
        city=city,
        target_lat=lat if lat > 0 else None,
        target_lng=lng if lng > 0 else None,
    )

    place_id: Optional[str] = None
    g_reviews = []
    if g_data:
        place_id = str(g_data.get("place_id") or "") or None
        if g_data.get("rating") is not None:
            google_rating = float(g_data["rating"])
        if g_data.get("user_ratings_total") is not None:
            google_ratings_total = int(g_data["user_ratings_total"])
        if not address and g_data.get("address"):
            address = str(g_data["address"])
        if lat <= 0 and g_data.get("lat"):
            lat = float(g_data["lat"])
        if lng <= 0 and g_data.get("lng"):
            lng = float(g_data["lng"])
        g_reviews = g_data.get("reviews") or []

    default_coords = CITY_COORDINATES.get(city, (32.0853, 34.7818))
    final_lat = lat if lat > 0 else default_coords[0]
    final_lng = lng if lng > 0 else default_coords[1]
    eff_g_rating = float(google_rating) if google_rating is not None else 4.2
    eff_g_total = int(google_ratings_total) if google_ratings_total is not None else 50

    wolt_slug: Optional[str] = None
    if wolt_rating <= 0.0:
        try:
            wolt = WoltTracker()
            v = wolt.search_venue(name, city, target_lat=final_lat, target_lng=final_lng, target_address=address)
            if v:
                wolt_slug = str(v.get("slug") or "") or None
                if v.get("rating") is not None:
                    wolt_rating = float(v["rating"])
        except Exception:
            pass

    tenbis_id: Optional[int] = None
    tb_reviews = []
    if tenbis_rating <= 0.0:
        try:
            tenbis = TenBisTracker()
            tb = tenbis.search_restaurant(name, city, target_lat=final_lat, target_lng=final_lng, target_address=address)
            if tb:
                tenbis_id = int(tb.get("restaurantId") or 0) or None
                if tb.get("rating"):
                    tenbis_rating = float(tb["rating"])
                if tenbis_id:
                    tb_reviews = tenbis.fetch_reviews(tenbis_id)
        except Exception:
            pass

    if not rest:
        rest = models.Restaurant(
            name=name,
            city=city,
            region=region,
            platform_id=platform_key,
            address=address,
            lat=final_lat,
            lng=final_lng,
            google_place_id=place_id,
            wolt_slug=wolt_slug,
            tenbis_id=tenbis_id,
            google_rating=eff_g_rating,
            google_ratings_total=eff_g_total,
            wolt_rating=wolt_rating if wolt_rating > 0 else None,
            tenbis_rating=tenbis_rating if tenbis_rating > 0 else None,
            google_synced_at=datetime.now(timezone.utc) if place_id else None,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(rest)
        db.commit()
        db.refresh(rest)
    else:
        rest.name = name
        rest.city = city
        rest.region = region
        rest.platform_id = platform_key
        if address:
            rest.address = address
        rest.lat = final_lat
        rest.lng = final_lng
        if place_id:
            rest.google_place_id = place_id
            rest.google_synced_at = datetime.now(timezone.utc)
        if wolt_slug:
            rest.wolt_slug = wolt_slug
        if tenbis_id:
            rest.tenbis_id = tenbis_id
        rest.google_rating = eff_g_rating
        rest.google_ratings_total = eff_g_total
        if wolt_rating > 0:
            rest.wolt_rating = wolt_rating
        if tenbis_rating > 0:
            rest.tenbis_rating = tenbis_rating
        rest.updated_at = datetime.now(timezone.utc)
        db.commit()

    upsert_reviews_for_restaurant(db, ai, rest.id, list(g_reviews) + list(tb_reviews))
    db.commit()

    all_revs = db.query(models.Review).filter(models.Review.restaurant_id == rest.id).all()
    rest.last_score = ai.calculate_net_sentiment_score(all_revs)
    rest.total_reviews = len(all_revs)
    rest.bayesian_average = ai.calculate_final_radar_score(
        google_rating=eff_g_rating,
        google_ratings_total=eff_g_total,
        recent_reviews=all_revs,
        wolt_rating=float(rest.wolt_rating or 0.0),
        tenbis_rating=float(rest.tenbis_rating or 0.0),
        social_volume=len(all_revs),
    )
    db.commit()

    seeds_path = os.path.join(_BACKEND_DIR, "auto_seeds.json")
    sync_auto_seeds_file(db, seeds_path)

    all_ranked = [
        x.id
        for x in db.query(models.Restaurant)
        .order_by(models.Restaurant.bayesian_average.desc(), models.Restaurant.id.asc())
        .all()
    ]
    rank = all_ranked.index(rest.id) + 1
    total_count = len(all_ranked)
    db.close()
    export_all()
    print(
        f"Added/Updated '{name}' ({city} • {rest.address}) | place_id={place_id} | "
        f"Google={eff_g_rating} ({eff_g_total}) -> Rank #{rank}/{total_count} | Score: {rest.bayesian_average}%"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Add a verified Shawarma joint using Official Google Places API")
    parser.add_argument("--name", required=True, help="Business name")
    parser.add_argument("--city", required=True, help="City name")
    parser.add_argument("--address", default="", help="Optional street address override")
    parser.add_argument("--lat", type=float, default=0.0, help="Optional GPS Latitude")
    parser.add_argument("--lng", type=float, default=0.0, help="Optional GPS Longitude")
    args = parser.parse_args()

    add_verified_shawarma(
        name=args.name,
        city=args.city,
        address=args.address,
        lat=args.lat,
        lng=args.lng,
    )
