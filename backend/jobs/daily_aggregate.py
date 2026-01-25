import asyncio
from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from db import AsyncSessionLocal
from services.analytics import compute_and_upsert_daily_stats

log = logging.getLogger(__name__)
TZ_TAIPEI = ZoneInfo("Asia/Taipei")

def _next_3am_taipei(now: datetime) -> datetime:
    # 回傳下一個台北時間 03:00
    now_t = now.astimezone(TZ_TAIPEI)
    target = now_t.replace(hour=3, minute=0, second=0, microsecond=0)
    if now_t >= target:
        target = target + timedelta(days=1)
    return target

async def _run_for_yesterday():
    now_t = datetime.now(tz=TZ_TAIPEI).date()
    yesterday = now_t - timedelta(days=1)
    async with AsyncSessionLocal() as db:  # type: AsyncSession
        await compute_and_upsert_daily_stats(db, yesterday)

async def daily_aggregate_worker():
    # 啟動先補跑一次
    try:
        await _run_for_yesterday()
    except asyncio.CancelledError:
        raise
    except Exception:
        log.exception("Backfill (yesterday) failed at startup")

    # 之後每天03:00(Taipei Time)跑
    while True:
        now = datetime.now(tz=TZ_TAIPEI)
        nxt = _next_3am_taipei(now)
        sleep_sec = max(1.0, (nxt - now).total_seconds())
        try:
            log.info("Daily job sleeps %.1fs until %s", sleep_sec, nxt.isoformat())
            await asyncio.sleep(sleep_sec)
            await _run_for_yesterday()
            log.info("Daily job finished successfully")
        except asyncio.CancelledError:
            # 讓外部能取消這個背景任務
            log.info("Daily job cancelled; exiting")
            raise
        except Exception:
            # 失敗就記錄，但不要中止，下一輪再試
            log.exception("Daily job failed; will try again next run")
