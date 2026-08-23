# -*- coding: utf-8 -*-
import sys
import os
import json

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from database import SessionLocal
import models

def export_data():
    db = SessionLocal()
    restaurants = db.query(models.Restaurant).order_by(models.Restaurant.bayesian_average.desc()).all()
    
    data = []
    for r in restaurants:
        data.append({
            "id": r.id,
            "name": r.name,
            "city": r.city,
            "region": r.region,
            "platform_id": r.platform_id,
            "address": r.address or "",
            "bayesian_average": r.bayesian_average,
            "last_score": r.last_score,
            "total_reviews": r.total_reviews,
            "google_rating": r.google_rating,
            "google_ratings_total": r.google_ratings_total
        })

    os.makedirs("frontend/src/data", exist_ok=True)
    out_path = "frontend/src/data/restaurants_data.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully exported {len(data)} restaurants to {out_path}")
    db.close()

if __name__ == "__main__":
    export_data()
