import time
import secrets
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from redis.asyncio import Redis

RATE_LUA = r"""
local key    = KEYS[1]
local now    = tonumber(ARGV[1])
local win_ms = tonumber(ARGV[2])
local limit  = tonumber(ARGV[3])
local expSec = tonumber(ARGV[4])
local member = ARGV[5]

redis.call('ZREMRANGEBYSCORE', key, 0, now - win_ms)

redis.call('ZADD', key, now, member)

local count = redis.call('ZCARD', key)

redis.call('EXPIRE', key, expSec)

return count
"""

def _get_client_ip(req: Request) -> str:
    # 在有反向代理（nginx）時，優先取 X-Forwarded-For 第一段
    xff = req.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return req.client.host if req.client else "unknown"

def _get_identity(req: Request) -> tuple[str, str]:
    """
    回傳 (scope, id)
    - 若帶 Bearer Token 且可解析出 user_id ⇒ ('user', user_id)
    - 否則使用 IP ⇒ ('ip', ip)
    """
    # 避免強耦合 FastAPI Depends，這裡直接讀 Header 嘗試 decode
    from utils.auth import decode_token  # 你的現有函式
    auth = req.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1].strip()
        try:
            payload = decode_token(token)  # 回 {"user_id": ..., "role": ...}
            uid = payload.get("user_id")
            if uid:
                return "user", uid
        except Exception:
            pass
    return "ip", _get_client_ip(req)

class SlidingWindowRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        redis: Redis,
        window_sec: int = 30,
        max_requests: int = 25,
        key_prefix: str = "rl",
        include_path_prefixes: Optional[list[str]] = None,
        exclude_path_prefixes: Optional[list[str]] = None,
    ): #初始化
        super().__init__(app) #繼承父類的__init__裡面已經寫好的self.app=app, call_next等函式
        self.redis = redis
        self.window_ms = int(window_sec * 1000)
        self.max_requests = int(max_requests)
        self.expire_sec = int(window_sec + 2)  # 給一點點緩衝
        self.key_prefix = key_prefix
        self.include = include_path_prefixes or []  # 空表示全部都限流
        self.exclude = exclude_path_prefixes or []

        self._lua_sha: Optional[str] = None

    async def dispatch(self, request: Request, call_next): #若有HTTP傳進來會執行
        path = request.url.path

        # 允許你排除健康檢查、靜態檔等
        for p in self.exclude:
            if path.startswith(p):
                return await call_next(request)

        # 若有 include，就只對這些前綴做限流
        if self.include:
            if not any(path.startswith(p) for p in self.include):
                return await call_next(request)

        scope, ident = _get_identity(request)
        key = f"{self.key_prefix}:{scope}:{ident}"

        now_ms = int(time.time() * 1000)
        # member 需唯一，避免 score 相同覆蓋；加一段隨機字串
        member = f"{now_ms}-{secrets.token_hex(4)}"

        # 準備 Lua 腳本（只載入一次）
        if not self._lua_sha:
            try:
                self._lua_sha = await self.redis.script_load(RATE_LUA) # 將Lua讀進記憶體並產生一串SHA1指紋
            except Exception:
                self._lua_sha = None

        # 執行限流腳本
        try:
            if self._lua_sha:
                count = await self.redis.evalsha(
                    self._lua_sha,
                    1,  # KEYS 數量
                    key,
                    now_ms, self.window_ms, self.max_requests,
                    self.expire_sec, member
                ) # 拿指紋去腳本快取尋找，找到已經編譯好的版本並直接執行
            else:
                # 後備：直接 eval（第一次可能沒有 script cache），傳送整段Lua腳本到Redis進行編譯 
                count = await self.redis.eval(
                    RATE_LUA,
                    numkeys=1,
                    keys=[key],
                    args=[now_ms, self.window_ms, self.max_requests, self.expire_sec, member],
                )
        except Exception:
            # Redis 壞掉時，選擇放行
            return await call_next(request)

        # 超量就回應429
        if int(count) > self.max_requests:
            retry_after = 1  # 簡單回 1 秒，或用 ZRANGE 拿最舊分數精算剩餘秒數
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too Many Requests",
                    "rate_limit": {
                        "window_seconds": self.window_ms // 1000,
                        "limit": self.max_requests,
                        "current_count": int(count),
                    },
                },
                headers={
                    "Retry-After": str(retry_after),
                    # 也可自定義回傳一些觀察用 Header
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Window": str(self.window_ms // 1000),
                    "X-RateLimit-Count": str(int(count)),
                },
            )

        # 未超量就放行
        resp = await call_next(request)
        # 在成功回應也加上剩餘配額資訊
        try:
            remaining = max(0, self.max_requests - int(count))
            resp.headers["X-RateLimit-Limit"] = str(self.max_requests)
            resp.headers["X-RateLimit-Remaining"] = str(remaining)
            resp.headers["X-RateLimit-Window"] = str(self.window_ms // 1000)
        except Exception:
            pass
        return resp
