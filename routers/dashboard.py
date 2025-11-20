from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Dict, Any, Tuple
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from utils.auth import get_current_user
from utils.mongo import get_mongo_collection
from services.analytics import get_daily_docs_in_range

router = APIRouter(tags=["dashboard"])

def _parse_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    try:
        return date.fromisoformat(s)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid date format, use YYYY-MM-DD")

async def _get_range_defaults() -> Tuple[Optional[date], Optional[date]]:
    # 從 Mongo 取最早與最晚的日期作為預設
    coll = get_mongo_collection()
    first = await coll.find().sort("_id", 1).limit(1).to_list(1)
    last  = await coll.find().sort("_id", -1).limit(1).to_list(1)
    s = date.fromisoformat(first[0]["_id"]) if first else None
    e = date.fromisoformat(last[0]["_id"])  if last else None
    return s, e

def _sum_field(docs: List[Dict[str, Any]], field: str) -> int:
    return sum(int(doc.get(field, 0)) for doc in docs)

def _group_by_weeks(docs: List[Dict[str, Any]], start_d: date, end_d: date, field: str):
    out = []
    cur = start_d
    idx = 0
    while cur <= end_d:
        win_start = cur
        win_end = min(end_d, cur + timedelta(days=6))
        # 取範圍內文件
        seg = []
        while idx < len(docs):
            d = date.fromisoformat(docs[idx]["_id"])
            if d < win_start:
                idx += 1
                continue
            if d > win_end:
                break
            seg.append(docs[idx])
            idx += 1
        out.append({
            "start_date": win_start.isoformat(),
            "end_date": win_end.isoformat(),
            "count": _sum_field(seg, field),
        })
        cur = win_end + timedelta(days=1)
    return out

def _month_range_edges(start_d: date, end_d: date) -> List[Tuple[date, date]]:
    # 產生跨月邊界：每一段是一個自然月區間（被 start/end 截斷）
    out = []
    y, m = start_d.year, start_d.month
    cur_start = start_d
    while True:
        # 下個月第一天
        if m == 12:
            next_first = date(y + 1, 1, 1) # 取下一個月的第一天，之後再減掉一天變成這個月的最後一天，因為每個月可能是30天或31天等等，直接取這個月的最後一天比較麻煩
        else:
            next_first = date(y, m + 1, 1)
        cur_end = min(end_d, next_first - timedelta(days=1)) # 若區間跨過月份就取這個月份，若區間沒有跨過月份就取到區間的最後一天
        out.append((cur_start, cur_end))
        if cur_end >= end_d: # 若剛好取到區間的最後一天就結束迴圈
            break
        # 下一段的起點為下個月的第一天
        cur_start = cur_end + timedelta(days=1)
        y, m = cur_start.year, cur_start.month
    return out

def _group_by_months(docs: List[Dict[str, Any]], start_d: date, end_d: date, field: str):
    out = []
    idx = 0
    for seg_start, seg_end in _month_range_edges(start_d, end_d):
        seg_docs = []
        while idx < len(docs):
            d = date.fromisoformat(docs[idx]["_id"])
            if d < seg_start:
                idx += 1
                continue
            if d > seg_end:
                break
            seg_docs.append(docs[idx])
            idx += 1
        out.append({
            "start_date": seg_start.isoformat(),
            "end_date": seg_end.isoformat(),
            "count": _sum_field(seg_docs, field),
        })
    return out

def _shape_response(docs: List[Dict[str, Any]], start_d: date, end_d: date, field: str, only: Optional[str]):
    day_count = [{"start_date": doc["_id"], "count": int(doc.get(field, 0))} for doc in docs]
    week_count = _group_by_weeks(docs, start_d, end_d, field)
    month_count = _group_by_months(docs, start_d, end_d, field)
    total = _sum_field(docs, field)

    # 若 type 指定，就清空其它欄位（保留key，value為空陣列）
    if only == "day":
        week_count, month_count = [], []
    elif only == "week":
        day_count, month_count = [], []
    elif only == "month":
        day_count, week_count = [], []

    return {
        "data": {
            "day_count": day_count,
            "week_count": week_count,
            "month_count": month_count,
            "total": total,
        }
    }

@router.get("/dashboard/user-count")
async def dashboard_user_count(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    type: Optional[str] = Query(None, pattern="^(day|week|month)$"),
    current=Depends(get_current_user),
):
    if current["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    s_in = _parse_date(start_date)
    e_in = _parse_date(end_date)
    if not (s_in and e_in): # 若其中一個沒有值，就先訂出最早以及最晚的日期
        s_def, e_def = await _get_range_defaults()
        if s_def is None or e_def is None:
            # 尚無任何日統計
            return {"data": {"day_count": [], "week_count": [], "month_count": [], "total": 0}}
        s_in = s_in or s_def # 有s_in就取s_in， s_in沒有值的話再取s_def
        e_in = e_in or e_def
    if e_in < s_in:
        raise HTTPException(status_code=422, detail="end_date must be >= start_date")

    docs = await get_daily_docs_in_range(s_in, e_in)
    return _shape_response(docs, s_in, e_in, field="user_count", only=type)

@router.get("/dashboard/post-count")
async def dashboard_post_count(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    type: Optional[str] = Query(None, pattern="^(day|week|month)$"),
    current=Depends(get_current_user),
):
    if current["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    s_in = _parse_date(start_date)
    e_in = _parse_date(end_date)
    if not (s_in and e_in):
        s_def, e_def = await _get_range_defaults()
        if s_def is None or e_def is None:
            return {"data": {"day_count": [], "week_count": [], "month_count": [], "total": 0}}
        s_in = s_in or s_def
        e_in = e_in or e_def
    if e_in < s_in:
        raise HTTPException(status_code=422, detail="end_date must be >= start_date")

    docs = await get_daily_docs_in_range(s_in, e_in)
    return _shape_response(docs, s_in, e_in, field="post_count", only=type)
