from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import uvicorn

from . import models, schemas
from .database import engine, get_db

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

@app.get("/api/restaurants", response_model=List[schemas.RestaurantSchema])
def get_restaurants(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    restaurants = db.query(models.Restaurant).offset(skip).limit(limit).all()
    return restaurants

@app.get("/api/regions/{region_name}", response_model=List[schemas.RestaurantSchema])
def get_restaurants_by_region(region_name: str, db: Session = Depends(get_db)):
    restaurants = db.query(models.Restaurant).filter(models.Restaurant.region == region_name).order_by(models.Restaurant.bayesian_average.desc()).all()
    return restaurants

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
