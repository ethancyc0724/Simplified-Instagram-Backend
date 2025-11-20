from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from db import get_db
from utils.auth import get_current_user
from schemas.follow import FollowListResponse, FollowRequestResponse, FollowActionBody, FollowActionResponse
from services.follow import FollowsService, get_follows_service

router = APIRouter(tags=["follows"])

@router.get("/follows", response_model=FollowListResponse)
async def get_follows(
    type: str,
    status: str,
    page: int = 1,
    limit: int = 10,
    response: Response = None,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: FollowsService = Depends(get_follows_service),
):
    data, cache_state = await svc.list_follows(db, current, type, status, page, limit)
    response.headers["X-Cache"] = cache_state
    return {"data": data}

@router.post("/follows/request/{user_id}", response_model=FollowRequestResponse)
async def request_follow(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: FollowsService = Depends(get_follows_service),
):
    return await svc.request_follow(db, current, user_id)

@router.post("/follows/{follows_id}", response_model=FollowActionResponse)
async def act_on_follow(
    follows_id: str,
    body: FollowActionBody,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: FollowsService = Depends(get_follows_service),
):
    return await svc.act_on_follow(db, current, follows_id, body)

@router.delete("/follows/{follows_id}", response_model=FollowActionResponse)
async def delete_relation(
    follows_id: str,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: FollowsService = Depends(get_follows_service),
):
    return await svc.delete_relation(db, current, follows_id)
