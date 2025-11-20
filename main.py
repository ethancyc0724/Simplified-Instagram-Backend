from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv())

import time
import asyncio
from fastapi import FastAPI, Request
from routers.user import router as user_router
from routers.follow import router as follow_router
from routers.event import router as event_router
from routers.post import router as post_router
from routers.dashboard import router as dashboard_router
from utils.cache import get_redis
from utils.rate_limit import SlidingWindowRateLimitMiddleware
from jobs.daily_aggregate import daily_aggregate_worker

app = FastAPI(debug=True)
app.include_router(user_router, prefix="/api")
app.include_router(follow_router, prefix="/api")
app.include_router(event_router, prefix="/api")
app.include_router(post_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")

@app.on_event("startup")
async def _startup():
    r = get_redis()
    await r.ping()
    asyncio.create_task(daily_aggregate_worker())

@app.on_event("shutdown")
async def _shutdown():
    r = get_redis()
    await r.close()

@app.middleware("http")
async def timer(request: Request, call_next):
    t0 = time.perf_counter()
    resp = await call_next(request)
    resp.headers["X-Process-Time-ms"] = f"{(time.perf_counter()-t0)*1000:.2f}"
    return resp

redis = get_redis()

app.add_middleware(
    SlidingWindowRateLimitMiddleware,
    redis=redis,
    window_sec=30,
    max_requests=10,
    key_prefix="rl",
    include_path_prefixes=[], # 空list = 全部路徑都套用
    exclude_path_prefixes=[]
)
