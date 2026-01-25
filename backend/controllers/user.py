from fastapi import APIRouter, Depends, HTTPException, status, Response, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from db import get_db
from schemas.user import (
    UserRegisterInput, UserRegisterResponse,
    UserLoginInput, UserLoginResponse,
    UserListResponse, UserDetailResponse,
    AdminUserStatusUpdate
)
from utils.auth import get_current_user
from services.user import UsersService, get_users_service

router = APIRouter(tags=["users"]) #定義路由物件，並匯入fastapi的main檔

@router.post("/users/register", response_model=UserRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegisterInput,
                   db: AsyncSession = Depends(get_db),
                   svc: UsersService = Depends(get_users_service)):
    return await svc.register(db, data)

@router.post("/users/login", response_model=UserLoginResponse)
async def login(data: UserLoginInput,
                db: AsyncSession = Depends(get_db),
                svc: UsersService = Depends(get_users_service)):
    return await svc.login(db, data)

@router.get("/users", response_model=UserListResponse)
async def list_users(search: Optional[str] = None,
                     limit: int = 10,
                     page: int = 1,
                     db: AsyncSession = Depends(get_db),
                     current=Depends(get_current_user),
                     svc: UsersService = Depends(get_users_service)):
    return await svc.list_users(db, current, search, limit, page)

@router.get("/users/{user_id}", response_model=UserDetailResponse)
async def get_user_detail(user_id: str,
                          response: Response,
                          db: AsyncSession = Depends(get_db),
                          current=Depends(get_current_user),
                          svc: UsersService = Depends(get_users_service)):
    data, cache_state = await svc.get_detail(db, current, user_id)
    response.headers["X-Cache"] = cache_state  # HIT/MISS
    return {"data": data}

@router.patch("/users/", response_model=dict)
async def update_me(name: Optional[str] = Form(None),
                    username: Optional[str] = Form(None),
                    is_public: Optional[bool] = Form(None),
                    profile: Optional[str] = Form(None),
                    profile_image: Optional[UploadFile] = File(None),
                    db: AsyncSession = Depends(get_db),
                    current=Depends(get_current_user),
                    svc: UsersService = Depends(get_users_service)):
    return await svc.update_me(db, current, name, username, is_public, profile, profile_image)

@router.patch("/users/{user_id}", response_model=dict)
async def admin_update_user(user_id: str,
                            update: AdminUserStatusUpdate,
                            db: AsyncSession = Depends(get_db),
                            current=Depends(get_current_user),
                            svc: UsersService = Depends(get_users_service)):
    return await svc.admin_update_user(db, current, user_id, update)
