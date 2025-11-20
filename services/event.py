from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Tuple, List

from repositories.event import EventsRepo

class EventsService:
    def __init__(self, repo: EventsRepo):
        self.repo = repo

    async def list_events(self, db: AsyncSession, current, page: int, limit: int) -> Dict[str, Any]:
        if page < 1 or limit < 1:
            raise HTTPException(status_code=422, detail="page and limit must be >= 1")
        items, total_pages = await self.repo.list_events(db, user_id=current["user_id"], page=page, limit=limit)
        data = {
            "events": [{
                "event_id": str(e.event_id),
                "message": e.message,
                "is_read": e.is_read,
                "type": e.type,
                "metadata": e.event_metadata or {}
            } for e in items],
            "pagination": {"page": page, "limit": limit, "total": total_pages}
        }
        return {"data": data}

    async def read_event(self, db: AsyncSession, current, event_id: str) -> Dict[str, Any]:
        event = await self.repo.get_by_id(db, event_id)
        if not event:
            raise HTTPException(status_code=400, detail="Event does not exist.")
        if str(event.user_id) != current["user_id"]:
            raise HTTPException(status_code=403, detail="You do not have permission to read this event.")
        if event.is_read:
            raise HTTPException(status_code=400, detail="You have already read event.")
        event = await self.repo.mark_read(db, event)
        return {"data": {"event_id": str(event.event_id)}, "message": "ok"}

    async def unread_count(self, db: AsyncSession, current) -> Dict[str, Any]:
        c = await self.repo.count_unread(db, user_id=current["user_id"])
        return {"data": {"count": c}, "message": "ok"}

def get_events_service() -> EventsService:
    return EventsService(EventsRepo())
