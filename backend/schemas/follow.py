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
    status: Literal['agree', 'pending']

class FollowRequestResponse(BaseModel):
    data: FollowRequestData
    message: str = "ok"

# /follows/:follows_id POST 請求
class FollowActionBody(BaseModel):
    status: Literal['agree', 'reject', 'delete']

# /follows/:follows_id 回應（status 可選，因為刪除操作不需要 status）
class FollowActionData(BaseModel):
    follows_id: str
    status: Optional[Literal['agree', 'pending']] = None

class FollowActionResponse(BaseModel):
    data: FollowActionData
    message: str = "ok"
