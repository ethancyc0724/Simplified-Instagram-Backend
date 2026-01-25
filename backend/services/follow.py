from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Tuple, Dict, Any
import uuid
from copy import deepcopy

from repositories.follow import FollowsRepo
from repositories.user import UsersRepo
from repositories.event import EventsRepo
from utils.cache import k, get_json, set_json, delete, delete_pattern

def _as_uuid(id_str: str) -> uuid.UUID:
    try:
        return uuid.UUID(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="User does not exist.")

class FollowsService:
    def __init__(self, repo: FollowsRepo, users_repo: UsersRepo, events_repo: EventsRepo):
        self.repo = repo
        self.users = users_repo
        self.events = events_repo

    async def list_follows(self, db: AsyncSession, current, list_type: str, status: str, page: int, limit: int):
        if list_type not in ("follower", "following"):
            raise HTTPException(status_code=422, detail="type must be 'follower' or 'following'")
        if status not in ("pending", "agree"):
            raise HTTPException(status_code=422, detail="status must be 'pending' or 'agree'")
        if page < 1 or limit < 1:
            raise HTTPException(status_code=422, detail="page and limit must be >= 1")

        cache_key = k("follows_v2", current["user_id"], list_type, status, str(page), str(limit))
        cached = await get_json(cache_key)
        if cached:
            return cached, "HIT"

        items, total_pages = await self.repo.list_follows(
            db, current_user_id=current["user_id"], list_type=list_type, status=status, page=page, limit=limit
        )
        data = {
            "users": [{
                "user_id": str(u.user_id),
                "name": u.name,
                "username": u.username,
                "metadata": (u.user_metadata or {}),
                "follows_id": follows_id
            } for (u, follows_id) in items],
            "pagination": {"page": page, "limit": limit, "total": total_pages}
        }
        ttl = 15 if status == "pending" else 300
        await set_json(cache_key, data, ttl_sec=ttl)
        return data, "MISS"

    async def request_follow(self, db: AsyncSession, current, user_id: str):
        follower_id = _as_uuid(current["user_id"])
        following_id = _as_uuid(user_id)
        if follower_id == following_id:
            raise HTTPException(status_code=400, detail="Cannot follow yourself")

        target = await self.users.get_by_id(db, following_id)
        if not target:
            raise HTTPException(status_code=400, detail="User does not exist.")
        if target.status != "enabled":
            raise HTTPException(status_code=403, detail="Account is disabled.")

        exist = await self.repo.get_by_pair(db, str(follower_id), str(following_id))
        if exist:
            await delete_pattern(k("follows", str(follower_id), "*"))
            await delete_pattern(k("follows", str(following_id), "*"))
            await delete_pattern(k("follows_v2", str(follower_id), "*"))
            await delete_pattern(k("follows_v2", str(following_id), "*"))
            await delete(k("user", str(following_id), "viewer", str(follower_id)))
            await delete(k("user", str(follower_id), "viewer", str(following_id)))
            return {"data": {"follows_id": str(exist.follows_id), "status": exist.status}, "message": "ok"}

        initial_status = "agree" if target.is_public else "pending"
        follow = await self.repo.create_request(db, str(follower_id), str(following_id), initial_status)
        
        await delete_pattern(k("follows", str(follower_id), "*"))
        await delete_pattern(k("follows", str(following_id), "*"))
        await delete_pattern(k("follows_v2", str(follower_id), "*"))
        await delete_pattern(k("follows_v2", str(following_id), "*"))
        await delete(k("events", str(following_id), "1", "10"))
        await delete(k("user", str(following_id), "viewer", str(follower_id)))
        await delete(k("user", str(follower_id), "viewer", str(following_id)))

        follower_user = await self.users.get_by_id(db, follower_id)
        
        if not target.is_public:
            await self.events.create_event(
                db,
                user_id=str(following_id),
                type="friend_request",
                message=f"{(follower_user.name or follower_user.username)} sent you a follow request",
                metadata={
                    "follower": {
                        "user_id": str(follower_user.user_id),
                        "username": follower_user.username,
                        "metadata": deepcopy(follower_user.user_metadata or {})
                    },
                    "follows_id": str(follow.follows_id)
                }
            )
        else:
            await self.events.create_event(
                db,
                user_id=str(follower_id),
                type="friend_agree",
                message=f"{target.username} accepted your follow request",
                metadata={
                    "following": {
                        "user_id": str(target.user_id),
                        "username": target.username,
                        "metadata": deepcopy(target.user_metadata or {})
                    }
                }
            )
        return {"data": {"follows_id": str(follow.follows_id), "status": initial_status}, "message": "ok"}

    async def act_on_follow(self, db: AsyncSession, current, follows_id: str, body) -> Dict[str, Any]:
        follow = await self.repo.get_by_id(db, follows_id)
        if not follow:
            raise HTTPException(status_code=404, detail="Follows ID not found.")

        me = _as_uuid(current["user_id"])
        if body.status == "delete":
            if follow.follower_id != me:
                raise HTTPException(status_code=403, detail="You do not have permission to modify this relationship.")
            await self.repo.delete_follow(db, follow)
            await self.clear_follow_caches(follow)
            return {"data": {"follows_id": follows_id}, "message": "ok"}

        if follow.following_id != me:
            raise HTTPException(status_code=403, detail="You do not have permission to modify this relationship.")

        if body.status == "reject":
            await self.repo.delete_follow(db, follow)
            await self.clear_follow_caches(follow)
            return {"data": {"follows_id": follows_id}, "message": "ok"}

        if body.status == "agree":
            if follow.status == "agree":
                await self.clear_follow_caches(follow)
                return {"data": {"follows_id": follows_id, "status": "agree"}, "message": "ok"}
            
            follow = await self.repo.update_status(db, follow, "agree")
            following_user = await self.users.get_by_id(db, follow.following_id)
            await self.events.create_event(
                db,
                user_id=str(follow.follower_id),
                type="friend_agree",
                message=f"{following_user.username} accepted your follow request",
                metadata={
                    "following": {
                        "user_id": str(following_user.user_id),
                        "username": following_user.username,
                        "metadata": deepcopy(following_user.user_metadata or {})
                    },
                    "follows_id": str(follow.follows_id)
                }
            )
            await self.clear_follow_caches(follow)
            return {"data": {"follows_id": str(follow.follows_id), "status": "agree"}, "message": "ok"}

        raise HTTPException(status_code=422, detail="Unsupported status")

    async def delete_relation(self, db: AsyncSession, current, follows_id: str):
        follow = await self.repo.get_by_id(db, follows_id)
        if not follow:
            raise HTTPException(status_code=404, detail="Follows ID not found.")
        me = _as_uuid(current["user_id"])
        if follow.follower_id != me and follow.following_id != me:
            raise HTTPException(status_code=403, detail="You do not have permission to modify this relationship.")
        await self.repo.delete_follow(db, follow)
        await self.clear_follow_caches(follow)
        return {"data": {"follows_id": follows_id}, "message": "ok"}

    async def clear_follow_caches(self, follow):
        await delete_pattern(k("follows", str(follow.follower_id), "*"))
        await delete_pattern(k("follows", str(follow.following_id), "*"))
        await delete_pattern(k("follows_v2", str(follow.follower_id), "*"))
        await delete_pattern(k("follows_v2", str(follow.following_id), "*"))
        await delete(k("user", str(follow.following_id), "viewer", str(follow.follower_id)))
        await delete(k("user", str(follow.follower_id), "viewer", str(follow.following_id)))

def get_follows_service() -> FollowsService:
    return FollowsService(FollowsRepo(), UsersRepo(), EventsRepo())