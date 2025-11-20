from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from typing import Optional, Tuple, Dict, Any
from copy import deepcopy
import json
from schemas.user import UserRegisterInput, UserLoginInput, AdminUserStatusUpdate
from repositories.user import UsersRepo
from utils.auth import create_access_token, verify_password
from utils.cache import k, get_json, set_json, delete, delete_pattern
from utils.s3 import upload_user_image

class UsersService:
    def __init__(self, repo: UsersRepo):
        self.repo = repo

    async def register(self, db: AsyncSession, data: UserRegisterInput) -> Dict[str, Any]:
        if len(data.password) < 6:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid password format.")
        if len(data.username) < 4:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid username format.")

        email_l = data.email.lower()
        username_l = data.username.lower()

        if await self.repo.get_by_email(db, email_l):
            raise HTTPException(status_code=400, detail="Email already exists.")
        if await self.repo.get_by_username(db, username_l):
            raise HTTPException(status_code=400, detail="Username already exists.")

        user = await self.repo.create_user(db, email_l, username_l, data.password)
        token = create_access_token({"sub": str(user.user_id), "role": user.role})
        return {
            "data": {
                "token": token,
                "user": {
                    "user_id": str(user.user_id),
                    "email": user.email,
                    "username": user.username,
                    "metadata": user.user_metadata or {}
                }
            },
            "message": "ok"
        }

    async def login(self, db: AsyncSession, data: UserLoginInput) -> Dict[str, Any]:
        email_l = data.email.lower()
        user = await self.repo.get_by_email(db, email_l)
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=400, detail="Invalid email or password.")
        if user.status == "disabled":
            raise HTTPException(status_code=403, detail="Account is disabled.")

        await self.repo.touch_last_login(db, user)
        token = create_access_token({"sub": str(user.user_id), "role": user.role})
        return {
            "data": {
                "token": token,
                "user": {
                    "user_id": str(user.user_id),
                    "email": user.email,
                    "username": user.username,
                    "role": user.role,
                    "metadata": user.user_metadata or {}
                }
            },
            "message": "ok"
        }

    async def list_users(self, db: AsyncSession, current, search: Optional[str], limit: int, page: int) -> Dict[str, Any]:
        users = await self.repo.list_only_role_user(db, search)
        total_pages = (len(users) + limit - 1) // limit
        start = (page - 1) * limit
        users_page = users[start:start + limit]
        return {
            "data": {
                "users": [{
                    "user_id": str(u.user_id),
                    "email": u.email,
                    "name": u.name,
                    "username": u.username,
                    "is_public": u.is_public,
                    "metadata": u.user_metadata or {}
                } for u in users_page],
                "pagination": {"page": page, "limit": limit, "total": total_pages}
            }
        }

    async def get_detail(self, db: AsyncSession, current, user_id: str) -> Tuple[Dict[str, Any], str]:
        cache_key = k("user", user_id)
        cached = await get_json(cache_key)
        if cached:
            return cached, "HIT"

        user = await self.repo.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        data = {
            "user": {
                "user_id": str(user.user_id),
                "email": user.email,
                "name": user.name,
                "username": user.username,
                "is_public": user.is_public,
                "metadata": user.user_metadata or {}
            },
            "is_following": False,
            "follower_count": 0,
            "following_count": 0,
            "post_count": 0
        }
        await set_json(cache_key, data, ttl_sec=24*3600)
        return data, "MISS"

    async def update_me(self, db: AsyncSession, current, name: Optional[str], username: Optional[str],
                        is_public: Optional[bool], profile: Optional[str], profile_image, ) -> Dict[str, Any]:
        user = await self.repo.get_by_id(db, current["user_id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        update_data = {}
        if name is not None:
            update_data["name"] = name

        if username is not None:
            if len(username) < 4:
                raise HTTPException(status_code=422, detail="Invalid username format.")
            username_l = username.lower()
            if username_l != user.username:
                exist = await self.repo.get_by_username(db, username_l)
                if exist and str(exist.user_id) != str(user.user_id):
                    raise HTTPException(status_code=400, detail="Username already exists.")
            update_data["username"] = username_l

        if is_public is not None:
            if isinstance(is_public, str):
                is_public = is_public.lower() in ("1", "true", "yes", "on")
            update_data["is_public"] = is_public

        original_metadata = user.user_metadata or {}
        metadata = deepcopy(original_metadata)

        if profile is not None:
            try:
                profile_dict = json.loads(profile)
                if not isinstance(profile_dict, dict):
                    raise ValueError
            except Exception:
                raise HTTPException(status_code=422, detail="profile must be a JSON object string")
            metadata["profile"] = profile_dict

        if profile_image is not None:
            image_url = await upload_user_image(str(user.user_id), profile_image)
            pi = metadata.get("profile_image", {})
            pi["url"] = image_url
            metadata["profile_image"] = pi

        if metadata != original_metadata:
            update_data["user_metadata"] = metadata

        if not update_data:
            return {"data": {"user_id": str(user.user_id)}, "message": "no change"}

        updated = await self.repo.update_user(db, user, update_data)
        await delete(k("user", str(updated.user_id)))
        await delete_pattern(k("follows", "*"))
        return {"data": {"user_id": str(updated.user_id)}, "message": "ok"}

    async def admin_update_user(self, db: AsyncSession, current, user_id: str, update: AdminUserStatusUpdate) -> Dict[str, Any]:
        if current["role"] != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
        if current["user_id"] == user_id:
            raise HTTPException(status_code=403, detail="Cannot update yourself")

        user = await self.repo.get_by_id(db, user_id)
        if not user or user.role == "admin":
            raise HTTPException(status_code=403, detail="Cannot update admin users")

        updated = await self.repo.update_status(db, user, update.status)
        await delete(k("user", str(updated.user_id)))
        await delete_pattern(k("follows", str(updated.user_id), "*"))
        return {"data": {"user_id": str(updated.user_id)}, "message": "ok"}


def get_users_service() -> UsersService:
    return UsersService(UsersRepo())
