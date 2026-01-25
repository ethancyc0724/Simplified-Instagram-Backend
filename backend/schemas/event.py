from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal

EventType = Literal["friend_request", "friend_agree"]

class Pagination(BaseModel):
    page: int
    limit: int
    total: int  # 總頁數

class EventItem(BaseModel):
    event_id: str
    message: str
    is_read: bool
    type: EventType
    metadata: Dict = Field(default_factory=dict)

class EventsListData(BaseModel):
    events: List[EventItem]
    pagination: Pagination

class EventsListResponse(BaseModel):
    data: EventsListData

class EventReadData(BaseModel):
    event_id: str

class EventReadResponse(BaseModel):
    data: EventReadData
    message: str = "ok"

class UnreadCountData(BaseModel):
    count: int

class UnreadCountResponse(BaseModel):
    data: UnreadCountData
    message: str = "ok"
