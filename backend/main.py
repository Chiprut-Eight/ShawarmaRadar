from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import uvicorn
import asyncio
from contextlib import asynccontextmanager

import models, schemas
from database import engine, get_db
from worker import run_cron_cycle, run_single_scrape_sync

# Create db tables
models.Base.metadata.create_all(bind=engine)

def cleanup_legacy_data():
    """ Delete old mock restaurants like Bambino and Said that were scarped previously """
    from database import SessionLocal
    db = SessionLocal()
    try:
        targets = [
            "%במבינו%", "%סעיד%", "%בורגר%", "%סטיישן%",
            "%רופטופ%", "%לבנטיני%", "%רינגלבלום%", "%ג׳ורג׳י%", "%סוהו%", 
            "%שיפוד%", "%מנגל%", "%ציפורה%", "%שאפל%", "%פלאפל%", "%לנדוור%",
            "%סטייק%", "%בשרים%", "%פיטמאסטר%", "%Pitmaster%", "%pitmaster%",
            "%אנטריקוטי%", "%אנטריקוט%", "%וילה מארה%", "%המנגליסטים%", "%הסביח%",
            "%הסומך%", "%חומוס%", "%בית הפול%", "%סבתא עזיזה%", "%ויצמן%", 
            "%Maresa%", "%מרסה בר%", "%שניצל%", "%SCHNITZEL%", "%הניצחון של חני%", 
            "%אופרה%", "%מזרחי%", "%פואגו%", "%סלימה%", "%סופיאן%", "%לב הכפר%",
            "%קבב התקווה%", "%או לה לה%", "%OH LA LA%", "%כרמים%", "%פפה לאון%",
            "%סמוקאיט%", "%בראנצ%", "%המעורב%", "%תימני האורגינאלי%", "%אבא של שוהם%",
            "%the view%", "%סקון נקון%", "%קמפניה%", "%עלינא%", "%עיראקי מקור הבשר%",
            "%טימו%", "%TIMO%", "%TIMŌ%", "%חצר ברובע%", "%אבו עלי%", "%נורה%", "%NURAH%",
            "%מנדלאוי%", "%אמונה%", "%הנשיא 1%", "%עלמא%", "%קובה%", "%KUBA%",
            "%קיסריה%", "%ברנס%", "%סמי בכיכר%", "%עזרא ובניו%", "%נאפיס%",
            "%חירק%", "%קפרון%", "%ג'ק%", "%זאת%", "%פבלה%", "%שופן%",
            "%מקסיקנה%", "%מערב ראשל%", "%הפרלמנט%", "%דוניאזאד%", "%Dunyazad%",
            "%אלגרבי%", "%Algharbi%", "%סינטה%", "%על הים%", "%אטיאס%", "%אמילי%",
            "%יומנגס%", "%פסקדו%", "%בוכרי%", "%ג'וד%", "%הגראז%", "%באגט ניר%", "%רוטצ%", "%בהדונס%",
            "%אבו יוסף%", "%יעקב קבב%", "%מתחת לעץ%", "%אווז הזהב%", "%שיפודי נתנאל%", "%באגט%",
            "%האחים תל אביב%", "%Congress Basel%", "%שיפודי זיקה%", "%שיפודי הנכסים%", "%Jasmino%", "%מסעדת רג'ינה%",
            "%גודנס%", "%לה גדריה גריל בר%", "%סטקיית הבוקרים%", "%פטוש%", "%צ'יקן האוס חיפה%", "%Kababji%",
            "%אווזיי%", "%VINNI%", "%BP -חורב חיפה%", "%ויוינו%", "%מסעדת הלו תימן ירושלים%", "%Deja Bu - דז'ה בו ירושלים%",
            "%שבט אחים ירושלים%", "%נערי המרבד%", "%גריל בר - ירושלים ירושלים%", "%Tala Hummus and Falafel%", "%אליז%", "%מפגש הסדנא ירושלים%",
            "%סאטיה%", "%הארווי%", "%התימני%", "%הפאלפל%", "%סבא ג'בטו%", "%Jessica%",
            "%מפגש חברים%", "%אלדו%", "%ניו דלי%", "%קלרה%", "%ג'פניקה%", "%לחם בשר%",
            "%מסעדת אחלה%", "%פונדק מטלון%", "%פיתה רחוב%", "%איזי גריל%", "%בית הפנקייק%", "%נונו מימי%",
            "%בבא חלה%", "%בישולים%", "%שניצל מדינה%", "%סביח%", "%גוזל וציונה%", "%האקדמיה לנקניק%",
            "%שניצל נתי%", "%מסעדת הסאלוף%", "%סנדוויץ בר%", "%זה אשדוד%", "%BBB%", "%דל טורו%",
            "%טקסס סטייק האוס%", "%ג׳חנון%", "%מסעדת החוף%", "%רובן%", "%סקוצמן%", "%בית רצון%",
            "%Beit Razon%", "%ביסטרו אלי%", "%בוארון%", "%בתומי%", "%מסעדת רימונים%", "%עיראקי%",
            "%סבוי%", "%אוכל מוכן לשבת%", "%Mambo%", "%אושי אושי%", "%פנטום%", "%שר האופים%",
            "%פאטאטאס%", "%שניצל%", "%הלו תימן%", "%פיתה היט%", "%הטבח%", "%מפגש גרונר%",
            "%שיוסה%", "%דרור%", "%זלבוך%", "%אלישקו%", "%קורניק%", "%גולדיס'%",
            "%ביס בלחי%", "%Japo%", "%פקוס%", "%אפנדי%", "%חלהוולה%", "%ספייסי%",
            "%מוסררה%", "%סביחה%", "%אצל מלי%", "%נייברס%", "%אחלן ג׳חנון%", "%המושל גריל%",
            "%RODEO%", "%רק מרק%", "%שלדון%", "%המטבח של איריס%", "%גריל עוף%", "%Kura%",
            "%מקסיקני%", "%BUFFET%", "%טעם העמק%", "%בואצוס%", "%מפגש ארבל%", "%שיפודי האווז%",
            "%מיט מי%", "%קראנצו%", "%Eight 8%", "%סקובר%", "%בוא נאכל הרצליה%", "%לה ואקה%",
            "%Ruben%", "%יגאל קבב%", "%מול החוף%", "%בני הדייג%", "%שלהבתיה%", "%אולגה%",
            "%Hummus Eliyahoo%", "%פרש דה מרקט%", "%סמבוסלה%", "%מסעדת דניאל%", "%באבו בשרים על גחלים%", "%פיתה בשרים על האש%",
            "%קלרה%", '%זה" אשדוד%', "%לינדה%", "%סטקיית עמרם%", '%אלברט מסעדה ומעדניה בע"מ%',
            "%האחים%", "%גריל בר -%", "%BP -חורב%", "%צארום%", "%זה%", "%Deja Bu - דז'ה בו%",
            "%צ'יקן האוס%", "%בוא נאכל%", "%מפגש הסדנא%", "%שבט אחים%", "%טו גייז%", "%פטרה חוף הקשתות%",
            "%באב אל ימן%", "%אשתנור גריל%"
        ]
        for target in targets:
            rests = db.query(models.Restaurant).filter(models.Restaurant.name.like(target)).all()
            for r in rests:
                db.query(models.Review).filter(models.Review.restaurant_id == r.id).delete()
                db.delete(r)
                
        # Specific cleanup for the accidental Tel Aviv entry of HaPina HaLevana
        pina = db.query(models.Restaurant).filter(models.Restaurant.name.like("%הפינה הלבנה%"), models.Restaurant.city == "תל אביב").first()
        if pina:
            db.query(models.Review).filter(models.Review.restaurant_id == pina.id).delete()
            db.delete(pina)
            
        db.commit()
        print("Legacy data cleaned up from Database.")
    except Exception as e:
        print(f"Error cleaning DB: {e}")
    finally:
        db.close()

async def background_worker():
    try:
        print("Background: Running legacy data cleanup asynchronously...")
        await asyncio.to_thread(cleanup_legacy_data)
    except Exception as e:
        print(f"Background cleanup error: {e}")
        
    while True:
        try:
            print("Background: Starting worker cycle...")
            await run_cron_cycle()
        except Exception as e:
            print(f"Background worker error: {e}")
        # Wait 30 minutes before running again (simulating hourly/daily cron in an active web service)
        await asyncio.sleep(1800)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the background task when the app starts
    task = asyncio.create_task(background_worker())
    yield
    # Cancel the task when the app stops
    task.cancel()

app = FastAPI(title="ShawarmaRadar API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.api_route("/api/health", methods=["GET", "HEAD"])
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

@app.get("/api/restaurants/search")
def search_restaurant(q: str = "", lang: str = "he", db: Session = Depends(get_db)):
    """ Returns whether a restaurant exists in the DB based on search term """
    
    # Localized messages
    messages = {
        "he": {
            "too_short": "אנא הזן שם ארוך יותר",
            "found": "כן! העסק '{name}' מזוהה ונמצא במעקב הרדאר.",
            "queued": "מעולה! העסק נמצא בתור לסריקה על ידי המכ\"ם בסבב הקרוב.",
            "not_found": "לא נמצא בסורק, אם זו טעות - צור איתנו קשר",
            "whatsapp_text": "היי, העסק שלי ({query}) לא נמצא ברדאר"
        },
        "en": {
            "too_short": "Please enter a longer name",
            "found": "Yes! '{name}' is identified and tracked by the radar.",
            "queued": "Great! The business is queued for the next radar scan cycle.",
            "not_found": "Not found in the scanner. If this is a mistake — contact us",
            "whatsapp_text": "Hi, my business ({query}) was not found on the radar"
        }
    }
    msg = messages.get(lang, messages["he"])
    
    if not q or len(q.strip()) < 2:
        return {"exists": False, "message": msg["too_short"]}
    
    query_str = q.strip()
    
    # Simple LIKE search
    exists = db.query(models.Restaurant).filter(models.Restaurant.name.like(f"%{query_str}%")).first()
    if exists:
        return {"exists": True, "message": msg["found"].format(name=exists.name)}
        
    # Check if it's in the queue (auto_seeds.json)
    try:
        import json
        with open("auto_seeds.json", "r", encoding="utf-8") as f:
            seeds = json.load(f)
            for s in seeds:
                if query_str in s.get("query", ""):
                    return {"exists": True, "message": msg["queued"]}
    except Exception as e:
        print("Error checking seeds:", e)
    
    whatsapp_text = msg["whatsapp_text"].format(query=query_str)
    whatsapp_url = f"https://wa.me/972523445081?text={whatsapp_text}"
    return {
        "exists": False, 
        "message": msg["not_found"],
        "whatsapp_link": whatsapp_url
    }

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
