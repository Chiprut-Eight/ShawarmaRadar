from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import uvicorn

import models, schemas
from database import engine, get_db

# Create db tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ShawarmaRadar API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/radar")
async def websocket_radar(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # In a real app, this loop would listen to a Redis PubSub or Message Queue
            # and push updates to the client
            await manager.broadcast(f"Client said: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/api/rankings/national")
def get_national_king(db: Session = Depends(get_db)):
    """ Returns the top 1 'King' and the next top runners up nationally """
    # Sort by bayesian_average descending
    top_restaurants = db.query(models.Restaurant).order_by(models.Restaurant.bayesian_average.desc()).limit(10).all()
    
    if not top_restaurants:
        return {"king": None, "runnersUp": []}
        
    return {
        "king": top_restaurants[0],
        "runnersUp": top_restaurants[1:]
    }

@app.get("/api/rankings/region/{region_id}")
def get_regional_rankings(region_id: str, db: Session = Depends(get_db)):
    """ Returns the top restaurants for a specific region ID (north, center, south, etc) """
    regional_restaurants = db.query(models.Restaurant)\
        .filter(models.Restaurant.region == region_id)\
        .order_by(models.Restaurant.bayesian_average.desc())\
        .limit(10).all()
        
    return regional_restaurants

@app.get("/api/regions/{region_name}", response_model=List[schemas.RestaurantSchema])
def get_restaurants_by_region(region_name: str, db: Session = Depends(get_db)):
    restaurants = db.query(models.Restaurant).filter(models.Restaurant.region == region_name).order_by(models.Restaurant.bayesian_average.desc()).all()
    return restaurants

@app.get("/api/reviews/recent")
def get_recent_reviews(limit: int = 20, db: Session = Depends(get_db)):
    """ Returns the most recent reviews combined with restaurant data for the Live Feed """
    recent_reviews = db.query(models.Review)\
        .order_by(models.Review.published_at.desc())\
        .limit(limit).all()
        
    results = []
    for rev in recent_reviews:
        results.append({
            "id": rev.id,
            "restaurant_name": rev.restaurant.name if rev.restaurant else "Unknown Target",
            "city": rev.restaurant.city if rev.restaurant else "",
            "content": rev.content,
            "sentiment": rev.sentiment_score,
            "published_at": rev.published_at.isoformat() if rev.published_at else None
        })
    return results

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
