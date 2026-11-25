from datetime import datetime
from typing import Optional, List
from sqlalchemy import Integer, String, Float, ForeignKey, DateTime, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from database import Base

class Restaurant(Base):
    __tablename__ = "restaurants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, index=True)
    city: Mapped[str] = mapped_column(String, index=True)
    region: Mapped[str] = mapped_column(String, index=True) # north, center, south, sharon, shfela
    platform_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Locked official platform identifiers (deterministic, zero guessing)
    google_place_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    wolt_slug: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tenbis_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Calculated & persisted platform scores
    last_score: Mapped[float] = mapped_column(Float, default=0.0)
    bayesian_average: Mapped[float] = mapped_column(Float, default=0.0)
    total_reviews: Mapped[int] = mapped_column(Integer, default=0)
    google_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    google_ratings_total: Mapped[int] = mapped_column(Integer, default=0)
    wolt_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    tenbis_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    google_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    reviews: Mapped[List["Review"]] = relationship("Review", back_populates="restaurant")


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    restaurant_id: Mapped[int] = mapped_column(Integer, ForeignKey("restaurants.id"))
    source: Mapped[str] = mapped_column(String) # google, 10bis
    content: Mapped[str] = mapped_column(String)
    url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # NLP and Algorithm scoring
    sentiment_score: Mapped[float] = mapped_column(Float) # Between -1.0 and 1.0
    weight: Mapped[float] = mapped_column(Float, default=1.0) # Recency decay weight

    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    restaurant: Mapped[Optional["Restaurant"]] = relationship("Restaurant", back_populates="reviews")


def ensure_schema_columns(engine: Engine) -> None:
    """Safely adds any newly introduced columns to an existing SQLite restaurants table."""
    desired = {
        "google_place_id": "TEXT",
        "wolt_slug": "TEXT",
        "tenbis_id": "INTEGER",
        "wolt_rating": "REAL",
        "tenbis_rating": "REAL",
        "google_synced_at": "DATETIME",
    }
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(restaurants)")).fetchall()
        existing = {row[1] for row in rows}
        for col_name, col_type in desired.items():
            if col_name not in existing:
                conn.execute(text(f"ALTER TABLE restaurants ADD COLUMN {col_name} {col_type}"))
