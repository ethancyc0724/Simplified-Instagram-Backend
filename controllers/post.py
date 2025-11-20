from fastapi import APIRouter, Depends, status, UploadFile, File, Form, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from db import get_db
from utils.auth import get_current_user
from schemas.post import (
    PostListResponse, PostDetailResponse,
    PostCreateResponse, PostUpdateResponse, PostDeleteResponse,
    CommentListResponse, CommentCreateResponse, CommentUpdateResponse, CommentDeleteResponse,
)
from services.post import PostsService, get_posts_service

router = APIRouter(tags=["posts"])

@router.get("/posts", response_model=PostListResponse)
async def list_posts(
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 10,
    cursor_post_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: PostsService = Depends(get_posts_service),
):
    return await svc.list_posts(db, current, user_id, search, limit, cursor_post_id)

@router.get("/posts/{post_id}", response_model=PostDetailResponse)
async def get_post_detail(
    post_id: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: PostsService = Depends(get_posts_service),
):
    data, cache_state = await svc.get_post_detail(db, current, post_id)
    response.headers["X-Cache"] = cache_state
    return {"data": data, "message": "ok"}

@router.post("/posts/", response_model=PostCreateResponse, status_code=status.HTTP_200_OK)
async def create_post(
    content: str = Form(...),
    images: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: PostsService = Depends(get_posts_service),
):
    return await svc.create_post(db, current, content, images)

@router.patch("/posts/{post_id}", response_model=PostUpdateResponse)
async def update_post(
    post_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: PostsService = Depends(get_posts_service),
):
    return await svc.update_post(db, current, post_id, payload)

@router.delete("/posts/{post_id}", response_model=PostDeleteResponse)
async def delete_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: PostsService = Depends(get_posts_service),
):
    return await svc.delete_post(db, current, post_id)

@router.post("/posts/like/{post_id}", response_model=PostCreateResponse)
async def like_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: PostsService = Depends(get_posts_service),
):
    return await svc.like_post(db, current, post_id)

@router.post("/posts/unlike/{post_id}", response_model=PostCreateResponse)
async def unlike_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: PostsService = Depends(get_posts_service),
):
    return await svc.unlike_post(db, current, post_id)

@router.get("/posts/comment/{post_id}", response_model=CommentListResponse)
async def list_comments(
    post_id: str,
    page: int = 1,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: PostsService = Depends(get_posts_service),
):
    return await svc.list_comments(db, current, post_id, page, limit)

@router.post("/posts/comment/{post_id}", response_model=CommentCreateResponse)
async def create_comment(
    post_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: PostsService = Depends(get_posts_service),
):
    return await svc.create_comment(db, current, post_id, body)

@router.patch("/posts/comment/{comment_id}", response_model=CommentUpdateResponse)
async def update_comment(
    comment_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: PostsService = Depends(get_posts_service),
):
    return await svc.update_comment(db, current, comment_id, body)

@router.delete("/posts/comment/{comment_id}", response_model=CommentDeleteResponse)
async def delete_comment(
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user),
    svc: PostsService = Depends(get_posts_service),
):
    return await svc.delete_comment(db, current, comment_id)
