from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from utils.auth import get_current_user
from schemas.event import EventsListResponse, EventReadResponse, UnreadCountResponse
from services.event import EventsService, get_events_service

router = APIRouter(tags=["events"])

@router.get("/events", response_model=EventsListResponse)
async def get_events(
    page: int = 1,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: EventsService = Depends(get_events_service),
):
    return await svc.list_events(db, current, page, limit)

@router.post("/events/read/{event_id}", response_model=EventReadResponse)
async def read_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: EventsService = Depends(get_events_service),
):
    return await svc.read_event(db, current, event_id)

@router.get("/events/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: EventsService = Depends(get_events_service),
):
    return await svc.unread_count(db, current)
