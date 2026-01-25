import uuid
from typing import Optional, Tuple, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.exc import IntegrityError
from models import Follow, User

class FollowsRepo:
    async def get_by_pair(self, db: AsyncSession, follower_id: str, following_id: str) -> Optional[Follow]:
        stmt = select(Follow).where(Follow.follower_id == follower_id, Follow.following_id == following_id)
        res = await db.execute(stmt); return res.scalar_one_or_none()

    async def get_by_id(self, db: AsyncSession, follows_id: str) -> Optional[Follow]:
        res = await db.execute(select(Follow).where(Follow.follows_id == follows_id))
        return res.scalar_one_or_none()

    async def create_request(self, db: AsyncSession, follower_id: str, following_id: str, status: str = "pending") -> Follow:
        follow = Follow(follower_id=follower_id, following_id=following_id, status=status)
        db.add(follow)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise
        await db.refresh(follow)
        return follow

    async def delete_follow(self, db: AsyncSession, follow: Follow) -> Follow:
        await db.delete(follow); await db.commit(); return follow

    async def update_status(self, db: AsyncSession, follow: Follow, new_status: str) -> Follow:
        follow.status = new_status
        await db.commit(); await db.refresh(follow); return follow

    async def list_follows(
        self, db: AsyncSession, current_user_id: str, list_type: str, status: str, page: int, limit: int
    ) -> Tuple[List[Tuple[User, str]], int]:
        if list_type == "following":
            base = select(User, Follow.follows_id).join(Follow, Follow.following_id == User.user_id).where(
                Follow.follower_id == current_user_id, Follow.status == status
            )
        else:
            base = select(User, Follow.follows_id).join(Follow, Follow.follower_id == User.user_id).where(
                Follow.following_id == current_user_id, Follow.status == status
            )

        total_stmt = select(func.count()).select_from(base.subquery())
        total = (await db.execute(total_stmt)).scalar_one()
        offset = (page - 1) * limit

        page_stmt = base.order_by(Follow.created_at.desc(), Follow.follows_id.desc()).offset(offset).limit(limit)
        res = await db.execute(page_stmt)
        rows = res.all()
        total_pages = (total + limit - 1) // limit
        items: List[Tuple[User, str]] = [(u, str(fid)) for (u, fid) in rows]
        return items, total_pages
