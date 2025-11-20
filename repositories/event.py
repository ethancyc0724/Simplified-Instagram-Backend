from typing import List, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from models import Event

class EventsRepo:
    async def create_event(self, db: AsyncSession, *, user_id: str, message: str, type: str, metadata: dict | None = None) -> Event:
        ev = Event(user_id=user_id, message=message, type=type, is_read=False, event_metadata=(metadata or {}))
        db.add(ev); await db.commit(); await db.refresh(ev); return ev

    async def list_events(self, db: AsyncSession, *, user_id: str, page: int, limit: int) -> Tuple[List[Event], int]:
        base = select(Event).where(Event.user_id == user_id)
        total_stmt = select(func.count()).select_from(base.subquery())
        total = (await db.execute(total_stmt)).scalar_one()
        offset = (page - 1) * limit
        page_stmt = base.order_by(Event.created_at.desc(), Event.event_id.desc()).offset(offset).limit(limit)
        res = await db.execute(page_stmt); events = res.scalars().all()
        total_pages = (total + limit - 1) // limit
        return events, total_pages

    async def get_by_id(self, db: AsyncSession, event_id: str) -> Optional[Event]:
        res = await db.execute(select(Event).where(Event.event_id == event_id))
        return res.scalar_one_or_none()

    async def mark_read(self, db: AsyncSession, event: Event) -> Event:
        event.is_read = True; event.updated_at = datetime.utcnow()
        await db.commit(); await db.refresh(event); return event

    async def count_unread(self, db: AsyncSession, *, user_id: str) -> int:
        res = await db.execute(
            select(func.count()).select_from(Event).where(Event.user_id == user_id, Event.is_read == False)  # noqa: E712
        )
        return res.scalar_one()

