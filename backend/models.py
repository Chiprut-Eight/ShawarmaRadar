from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    city = Column(String, index=True)
    region = Column(String, index=True) # north, center, south, sharon, shfela
    platform_id = Column(String, unique=True, index=True) # e.g. google place id
    
    # Calculated scores
    last_score = Column(Float, default=0.0)
    bayesian_average = Column(Float, default=0.0)
    total_reviews = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    reviews = relationship("Review", back_populates="restaurant")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"))
    source = Column(String) # google, wolt, tiktok, twitter, facebook
    content = Column(String)
    url = Column(String, nullable=True)
    
    # NLP and Algorithm scoring
    sentiment_score = Column(Float) # Between -1.0 and 1.0
    weight = Column(Float, default=1.0) # Recency decay weight
    
    published_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    restaurant = relationship("Restaurant", back_populates="reviews")
