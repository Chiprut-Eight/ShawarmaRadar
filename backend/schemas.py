from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ReviewBase(BaseModel):
    source: str
    content: str
    url: Optional[str] = None
    sentiment_score: float
    weight: float = 1.0
    published_at: datetime

class ReviewCreate(ReviewBase):
    pass

class ReviewSchema(ReviewBase):
    id: int
    restaurant_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class RestaurantBase(BaseModel):
    name: str
    city: str
    platform_id: str
    address: Optional[str] = None

class RestaurantCreate(RestaurantBase):
    pass

class RestaurantSchema(RestaurantBase):
    id: int
    region: str
    last_score: float
    bayesian_average: float
    total_reviews: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    reviews: List[ReviewSchema] = []

    class Config:
        from_attributes = True
