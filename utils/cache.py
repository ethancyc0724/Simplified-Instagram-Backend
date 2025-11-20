import asyncio
import orjson
from typing import Any, Optional
from redis.asyncio import Redis

_redis: Optional[Redis] = None #設定一個全域變數，類型是Redit物件，用這來操作Redis server

def get_redis() -> Redis:
    #Lazy 初始化，避免在 import 階段就連線。
    global _redis
    if _redis is None:
        import os
        url = os.getenv("REDIS_URL")
        if not url:
            raise RuntimeError("REDIS_URL not set")
        _redis = Redis.from_url(url, encoding="utf-8", decode_responses=False)  # 二進位值，自己用 orjson 做轉換
    return _redis

# 統一 Key 前綴，避免與其他服務衝突
PREFIX = "socialapi"

def k(*parts: str) -> str:
    # Key 統一用 : 分隔，所有變動參數都要體現在 key 內
    return ":".join([PREFIX, *parts])

async def get_json(key: str) -> Optional[Any]:
    r = get_redis()
    val = await r.get(key)
    if val is None:
        return None
    try:
        return orjson.loads(val)
    except Exception:
        # 如果出現錯誤就直接刪除這以資料
        await r.delete(key)
        return None

async def set_json(key: str, obj: Any, ttl_sec: int) -> None:
    r = get_redis()
    await r.set(key, orjson.dumps(obj, default=str), ex=ttl_sec)

async def delete(key: str) -> None:
    r = get_redis()
    await r.delete(key)

async def delete_many(*keys: str) -> None:
    if not keys:
        return
    r = get_redis()
    await r.delete(*keys)

async def delete_pattern(pattern: str) -> None:
    r = get_redis()
    async for key in r.scan_iter(match=pattern, count=500):
        await r.delete(key)
