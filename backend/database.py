import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

db_dir = os.path.dirname(os.path.abspath(__file__))
default_sqlite = f"sqlite:///{os.path.join(db_dir, 'shawarma_radar.db')}"

DATABASE_URL = os.getenv("DATABASE_URL", default_sqlite)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if "sqlite" in DATABASE_URL:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    try:
        test_engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 5})
        with test_engine.connect() as conn:
            pass
        engine = test_engine
    except Exception as e:
        print(f"Warning: Remote Postgres connection failed ({e}). Gracefully falling back to local SQLite.")
        DATABASE_URL = default_sqlite
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
