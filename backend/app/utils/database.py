"""MongoDB database connection and utilities"""
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from app.config import MONGODB_URL, MONGODB_DATABASE

# Global MongoDB client
_client: Optional[AsyncIOMotorClient] = None
_database = None


async def connect_to_mongo():
    """Create database connection"""
    global _client, _database
    try:
        _client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
        _database = _client[MONGODB_DATABASE]
        # Test the connection
        await _client.admin.command('ping')
        print(f"✓ Connected to MongoDB: {MONGODB_DATABASE}")
        return _database
    except Exception as e:
        print(f"⚠ Warning: Could not connect to MongoDB: {e}")
        print("  The application will continue without MongoDB. Survey data will be stored in memory only.")
        _client = None
        _database = None
        return None


async def close_mongo_connection():
    """Close database connection"""
    global _client
    if _client:
        _client.close()
        print("✓ MongoDB connection closed")


def get_database():
    """Get database instance"""
    global _database
    if _database is None:
        return None
    return _database


def get_surveys_collection():
    """Get surveys collection"""
    db = get_database()
    if db is None:
        return None
    return db.surveys
