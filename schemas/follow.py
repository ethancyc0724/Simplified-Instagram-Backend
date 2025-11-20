from pydantic import BaseModel
from typing import Literal, List, Dict, Optional

# Query parameters for list
class FollowListQuery(BaseModel):
    type: Literal['follower', 'following']
    status: Literal['pending', 'agree']
    page: int = 1
    limit: int = 10

# Response user item
class FollowUserItem(BaseModel):
    user_id: str
    name: Optional[str] = None
    username: str
    metadata: Optional[Dict] = {}

class FollowListPagination(BaseModel):
    page: int
    limit: int
    total: int   # 總頁數

class FollowListData(BaseModel):
    users: List[FollowUserItem]
    pagination: FollowListPagination

class FollowListResponse(BaseModel):
    data: FollowListData

# /follows/request/:user_id 回應
class FollowRequestData(BaseModel):
    follows_id: str

class FollowRequestResponse(BaseModel):
    data: FollowRequestData
    message: str = "ok"

# /follows/:follows_id POST 請求
class FollowActionBody(BaseModel):
    status: Literal['agree', 'reject', 'delete']

# /follows/:follows_id 回應
class FollowActionResponse(BaseModel):
    data: FollowRequestData
    message: str = "ok"
