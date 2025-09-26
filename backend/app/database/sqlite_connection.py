from databases import Database
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.sqlite_models import Base
import os
import logging

logger = logging.getLogger(__name__)

# Database file location
DATABASE_URL = "sqlite:///./app/data/sqlite_database.db"
database = Database(DATABASE_URL)

# SQLAlchemy engine and session
engine = create_engine(
    DATABASE_URL.replace("sqlite:///", "sqlite:///"), 
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def connect_to_database():
    """Connect to SQLite database and create tables"""
    try:
        # Ensure data directory exists
        os.makedirs("app/data", exist_ok=True)
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        # Connect to database
        await database.connect()
        
        logger.info("Connected to SQLite database successfully")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

async def disconnect_from_database():
    """Close database connection"""
    try:
        await database.disconnect()
        logger.info("Disconnected from SQLite database")
    except Exception as e:
        logger.error(f"Error disconnecting from database: {e}")

def get_database():
    """Get database instance"""
    return database

def get_db_session():
    """Get database session (for synchronous operations)"""
    db = SessionLocal()
    try:
        return db
    except Exception as e:
        db.close()
        raise

def get_session():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db():
    """Get database session (FastAPI dependency)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()