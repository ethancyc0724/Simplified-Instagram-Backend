from pydantic import BaseModel, EmailStr, constr
from typing import Optional, Literal, List, Dict, Any

# Input
class UserRegisterInput(BaseModel):
    email: EmailStr
    username: constr(min_length=4)
    password: constr(min_length=6)

class UserLoginInput(BaseModel):
    email: EmailStr
    password: str

class UserUpdateInput(BaseModel):
    name: Optional[str] = None
    username: Optional[constr(min_length=4)] = None
    is_public: Optional[bool] = None
    profile: Optional[Dict] = None

class AdminUserStatusUpdate(BaseModel):
    status: Literal['enabled', 'disabled']

#  Common Output
class Pagination(BaseModel):
    page: int
    limit: int
    total: int

class UserOutput(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None
    username: str
    is_public: bool
    metadata: Optional[Dict] = {}

class UserRegisterOutput(BaseModel):
    user_id: str
    email: str
    username: str
    metadata: Optional[Dict] = {}

class UserLoginOutput(BaseModel):
    user_id: str
    email: str
    username: str
    role: str
    metadata: Optional[Dict] = {}

# Response Data
class UserRegisterData(BaseModel):
    token: str
    user: UserRegisterOutput

class UserLoginData(BaseModel):
    token: str
    user: UserLoginOutput

class UserListData(BaseModel):
    users: List[UserOutput]
    pagination: Pagination

class UserDetailData(BaseModel):
    user: UserOutput
    is_following: bool
    follower_count: int
    following_count: int
    post_count: int

# Full Response
class UserRegisterResponse(BaseModel):
    data: UserRegisterData
    message: str

class UserLoginResponse(BaseModel):
    data: UserLoginData
    message: str

class UserListResponse(BaseModel):
    data: UserListData

class UserDetailResponse(BaseModel):
    data: UserDetailData
