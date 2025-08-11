from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings
from app.database.memory_db import get_memory_database, MemoryDatabase
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    database: AsyncIOMotorDatabase = None
    use_memory_db: bool = False

db = Database()

async def connect_to_mongo():
    try:
        db.client = AsyncIOMotorClient(settings.mongodb_url, serverSelectionTimeoutMS=5000)
        # Test the connection
        await db.client.admin.command('ismaster')
        db.database = db.client[settings.database_name]
        logger.info("Connected to MongoDB successfully")
    except Exception as e:
        logger.warning(f"Failed to connect to MongoDB: {e}")
        logger.info("Falling back to in-memory database for testing")
        db.use_memory_db = True

async def close_mongo_connection():
    if db.client:
        db.client.close()

def get_database():
    if db.use_memory_db or db.database is None:
        return get_memory_database()
    return db.database