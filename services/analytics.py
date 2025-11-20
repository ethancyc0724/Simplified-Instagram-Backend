from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import Tuple, Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, TIMESTAMP

from models import User, Post
from utils.mongo import get_mongo_collection

TZ_TAIPEI = ZoneInfo("Asia/Taipei")

async def _count_users_on_local_day(db: AsyncSession, d: date) -> int:
    # date(timezone('Asia/Taipei', created_at::timestamptz)) = d
    expr = func.date(func.timezone('Asia/Taipei', cast(User.created_at, TIMESTAMP(timezone=True))))
    q = select(func.count()).select_from(User).where(expr == d)
    return (await db.execute(q)).scalar_one()

async def _count_posts_on_local_day(db: AsyncSession, d: date) -> int:
    expr = func.date(func.timezone('Asia/Taipei', cast(Post.created_at, TIMESTAMP(timezone=True))))
    q = select(func.count()).select_from(Post).where(expr == d)
    return (await db.execute(q)).scalar_one()

def _day_window(d: date) -> Dict[str, str]:
    start_local = datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=TZ_TAIPEI)
    end_local   = start_local + timedelta(days=1)
    start_utc   = start_local.astimezone(timezone.utc)
    end_utc     = end_local.astimezone(timezone.utc)
    return {
        "start_local": start_local.isoformat(),
        "end_local":   end_local.isoformat(),
        "start_utc":   start_utc.isoformat(),
        "end_utc":     end_utc.isoformat(),
    }

async def compute_and_upsert_daily_stats(db: AsyncSession, local_day: date) -> Dict[str, Any]:
    users = await _count_users_on_local_day(db, local_day)
    posts = await _count_posts_on_local_day(db, local_day)

    doc = {
        "_id": local_day.isoformat(),      # e.g., "2025-09-13"
        "date": local_day.isoformat(),
        "tz": "Asia/Taipei",
        "window": _day_window(local_day),
        "user_count": int(users),
        "post_count": int(posts),
        "generated_at": datetime.now(tz=TZ_TAIPEI).isoformat(),
    }
    coll = get_mongo_collection()
    await coll.update_one({"_id": doc["_id"]}, {"$set": doc}, upsert=True)
    return doc

async def get_daily_docs_in_range(start_d: date, end_d: date) -> List[Dict[str, Any]]:
    # 取回閉區間 [start_d, end_d] 的資料。因為_id 為 'YYYY-MM-DD'，字典序與日期序相容，可直接以字串過濾。
    coll = get_mongo_collection()
    s, e = start_d.isoformat(), end_d.isoformat()
    cursor = coll.find({"_id": {"$gte": s, "$lte": e}}).sort("_id", 1)
    return [doc async for doc in cursor]
