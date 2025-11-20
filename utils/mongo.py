import os
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

_client: Optional[AsyncIOMotorClient] = None

def get_mongo_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        url = os.getenv("MONGODB_URL")
        if not url:
            raise RuntimeError("MONGODB_URL not set")
        _client = AsyncIOMotorClient(url)
    return _client

def get_mongo_collection():
    client = get_mongo_client()
    db_name = os.getenv("MONGODB_DB", "social_analytics")
    coll_name = os.getenv("MONGODB_COLL", "daily_stats")
    return client[db_name][coll_name]
