import argparse
import json
import os
import sys
from datetime import datetime, timezone

getattr(sys.stdout, "reconfigure", lambda **_: None)(encoding="utf-8")

from database import SessionLocal
import models
from regions import get_region_by_city
from scrapers.wolt import WoltTracker, TenBisTracker, CITY_COORDINATES
from nlp import RankingEngine
from export_json import export_all

def add_verified_shawarma(
    name: str,
    city: str,
    address: str,
    lat: float,
    lng: float,
    google_rating: float = 4.5,
    google_ratings_total: int = 350,
    wolt_rating: float = 0.0,
    tenbis_rating: float = 0.0
) -> None:
    db = SessionLocal()
    ai = RankingEngine()

    platform_key = f"{name}_{city}".replace(" ", "_")
    region = get_region_by_city(city) or "center"

    rest = db.query(models.Restaurant).filter(
        (models.Restaurant.platform_id == platform_key)
        | ((models.Restaurant.name == name) & (models.Restaurant.city == city))
    ).first()

    # Try live Wolt & 10Bis lookup if not explicitly provided
    if wolt_rating <= 0.0:
        try:
            wolt = WoltTracker()
            v = wolt.search_venue(name, city, target_lat=lat, target_lng=lng, target_address=address)
            if v and v.get("rating") is not None:
                wolt_rating = float(v["rating"])
        except Exception:
            pass

    if tenbis_rating <= 0.0:
        try:
            tenbis = TenBisTracker()
            tb = tenbis.search_restaurant(name, city, target_lat=lat, target_lng=lng, target_address=address)
            if tb and tb.get("rating"):
                tenbis_rating = float(tb["rating"])
        except Exception:
            pass

    existing_reviews = (
        db.query(models.Review).filter(models.Review.restaurant_id == rest.id).all()
        if rest
        else []
    )
    score = ai.calculate_final_radar_score(
        google_rating=google_rating,
        google_ratings_total=google_ratings_total,
        recent_reviews=existing_reviews,
        wolt_rating=wolt_rating,
        tenbis_rating=tenbis_rating,
        social_volume=len(existing_reviews)
    )

    if not rest:
        rest = models.Restaurant(
            name=name,
            city=city,
            region=region,
            platform_id=platform_key,
            address=address,
            lat=lat,
            lng=lng,
            google_rating=google_rating,
            google_ratings_total=google_ratings_total,
            last_score=ai.calculate_net_sentiment_score(existing_reviews),
            total_reviews=len(existing_reviews),
            bayesian_average=score,
            updated_at=datetime.now(timezone.utc)
        )
        db.add(rest)
    else:
        rest.name = name
        rest.city = city
        rest.region = region
        rest.platform_id = platform_key
        rest.address = address
        rest.lat = lat
        rest.lng = lng
        rest.google_rating = google_rating
        rest.google_ratings_total = google_ratings_total
        rest.bayesian_average = score
        rest.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(rest)

    # Sync master single source of truth: backend/auto_seeds.json
    all_rests = db.query(models.Restaurant).order_by(models.Restaurant.id).all()
    seeds = [
        {
            "id": r.id,
            "name": r.name,
            "query": f"{r.name} {r.city}",
            "city": r.city,
            "address": r.address,
            "lat": r.lat,
            "lng": r.lng
        }
        for r in all_rests
    ]
    seeds_path = os.path.join(os.path.dirname(__file__), "auto_seeds.json")
    with open(seeds_path, "w", encoding="utf-8") as f:
        json.dump(seeds, f, ensure_ascii=False, indent=4)

    all_ranked = [
        x.id
        for x in db.query(models.Restaurant)
        .order_by(models.Restaurant.bayesian_average.desc(), models.Restaurant.id.asc())
        .all()
    ]
    rank = all_ranked.index(rest.id) + 1
    db.close()
    export_all()
    print(f"Added/Updated '{name}' ({city} • {address}) -> Rank #{rank} in Israel | Score: {score}% (Total shawarmas: {len(seeds)})")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Add a verified Shawarma joint to ShawarmaRadar")
    parser.add_argument("--name", required=True, help="Exact Hebrew business name")
    parser.add_argument("--city", required=True, help="Verified city name")
    parser.add_argument("--address", required=True, help="Verified Google street address")
    parser.add_argument("--lat", type=float, default=0.0, help="GPS Latitude")
    parser.add_argument("--lng", type=float, default=0.0, help="GPS Longitude")
    parser.add_argument("--rating", type=float, default=4.5, help="Google rating (1-5)")
    parser.add_argument("--reviews", type=int, default=350, help="Google review count")
    parser.add_argument("--wolt", type=float, default=0.0, help="Optional Wolt rating (0-10)")
    parser.add_argument("--tenbis", type=float, default=0.0, help="Optional 10Bis rating (0-5)")
    args = parser.parse_args()

    default_coords = CITY_COORDINATES.get(args.city, (32.0853, 34.7818))
    final_lat = args.lat if args.lat > 0 else default_coords[0]
    final_lng = args.lng if args.lng > 0 else default_coords[1]

    add_verified_shawarma(
        name=args.name,
        city=args.city,
        address=args.address,
        lat=final_lat,
        lng=final_lng,
        google_rating=args.rating,
        google_ratings_total=args.reviews,
        wolt_rating=args.wolt,
        tenbis_rating=args.tenbis
    )
