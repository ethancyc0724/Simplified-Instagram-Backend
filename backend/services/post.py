from typing import Optional, List, Tuple, Dict, Any
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from repositories.post import PostsRepo
from models import User
from utils.cache import k, get_json, set_json, delete_pattern
from utils.s3 import upload_post_image

class PostsService:
    def __init__(self, repo: PostsRepo):
        self.repo = repo

    async def list_posts(
        self, db: AsyncSession, current, user_id: Optional[str], search: Optional[str],
        limit: int, cursor_post_id: Optional[str]
    ) -> Dict[str, Any]:
        if limit < 1:
            raise HTTPException(status_code=422, detail="limit must be >= 1")

        posts, next_cursor, total_pages = await self.repo.list_posts(
            db, viewer_id=current["user_id"], user_id=user_id, search=search,
            limit=limit, cursor_post_id=cursor_post_id
        )

        if user_id and not await self.repo.can_view_user_posts(db, current["user_id"], user_id):
            raise HTTPException(status_code=403, detail="You are not allowed to view this user's posts due to privacy.")

        ids = [str(p.post_id) for p in posts]
        like_count, comment_count, liked_set = await self.repo.get_post_counts_and_flags(db, ids, viewer_id=current["user_id"])
        images_map = await self.repo.list_post_images_by_posts(db, ids)
        
        # Get user info for posts
        user_ids = list(set([str(p.user_id) for p in posts]))
        user_map = {}
        if user_ids:
            stmt = select(User).where(User.user_id.in_(user_ids))
            result = await db.execute(stmt)
            users = result.scalars().all()
            user_map = {str(u.user_id): {"username": u.username, "user_id": str(u.user_id)} for u in users}

        def image_to_dict(im):
            url = (im.image_metadata or {}).get("url")
            return {"image_id": str(im.image_id), "url": url, "width": im.width, "height": im.height, "order": im.order}

        return {
            "data": {
                "posts": [{
                    "post_id": str(p.post_id),
                    "content": p.content,
                    "images": [image_to_dict(im) for im in images_map.get(str(p.post_id), [])],
                    "is_liked": str(p.post_id) in liked_set,
                    "like_count": like_count.get(str(p.post_id), 0),
                    "comment_count": comment_count.get(str(p.post_id), 0),
                    "created_at": p.created_at.isoformat(),
                    "user_id": str(p.user_id),
                    "username": user_map.get(str(p.user_id), {}).get("username", f"user_{str(p.user_id)[:8]}"),
                } for p in posts],
                "pagination": {"limit": limit, "cursor_post_id": next_cursor, "total": total_pages}
            }
        }

    async def get_post_detail(self, db: AsyncSession, current, post_id: str) -> Tuple[Dict[str, Any], str]:
        cache_key = k("post", post_id, "viewer", current["user_id"])
        cached = await get_json(cache_key)
        if cached:
            return cached, "HIT"

        p = await self.repo.get_post_by_id(db, post_id)
        if not p:
            raise HTTPException(status_code=400, detail="Post does not exist.")
        if not await self.repo.can_view_user_posts(db, current["user_id"], str(p.user_id)):
            raise HTTPException(status_code=403, detail="You are not allowed to view this post due to privacy.")

        like_count, comment_count, liked_set = await self.repo.get_post_counts_and_flags(db, [post_id], viewer_id=current["user_id"])
        images_map = await self.repo.list_post_images_by_posts(db, [post_id])
        comments_rows = await self.repo.get_top2_comments_with_user(db, post_id)
        
        # Get user info for the post
        user_stmt = select(User).where(User.user_id == p.user_id)
        user_result = await db.execute(user_stmt)
        post_user = user_result.scalar_one_or_none()
        username = post_user.username if post_user else f"user_{str(p.user_id)[:8]}"

        def image_to_dict(im):
            url = (im.image_metadata or {}).get("url")
            return {"image_id": str(im.image_id), "url": url, "width": im.width, "height": im.height, "order": im.order}

        def row_to_comment(row):
            c, u = row
            return {
                "comment_id": str(c.comment_id),
                "content": c.content,
                "created_at": c.created_at.isoformat(),
                "user": {"user_id": str(u.user_id), "name": u.name, "username": u.username, "metadata": (u.user_metadata or {})}
            }

        data = {
            "post_id": str(p.post_id),
            "content": p.content,
            "images": [image_to_dict(im) for im in images_map.get(post_id, [])],
            "comments": [row_to_comment(r) for r in comments_rows],
            "created_at": p.created_at.isoformat(),
            "is_liked": post_id in liked_set,
            "like_count": like_count.get(post_id, 0),
            "comment_count": comment_count.get(post_id, 0),
            "user_id": str(p.user_id),
            "username": username,
        }
        await set_json(cache_key, data, ttl_sec=60)
        return data, "MISS"

    async def create_post(self, db: AsyncSession, current, content: str, images: List[UploadFile]) -> Dict[str, Any]:
        if not images or len(images) == 0:
            raise HTTPException(status_code=422, detail="At least one image is required.")

        p = await self.repo.create_post(db, user_id=current["user_id"], content=content)
        for idx, f in enumerate(images):
            url, w, h = await upload_post_image(current["user_id"], str(p.post_id), f)
            await self.repo.add_post_image(db, post_id=str(p.post_id), url=url, order=idx, width=w, height=h, meta={})
        return {"data": {"post_id": str(p.post_id)}, "message": "ok"}

    async def update_post(self, db: AsyncSession, current, post_id: str, payload: dict) -> Dict[str, Any]:
        p = await self.repo.get_post_by_id(db, post_id)
        if not p:
            raise HTTPException(status_code=404, detail="Post does not exist.")
        if str(p.user_id) != current["user_id"]:
            raise HTTPException(status_code=403, detail="You do not have permission to update this post.")
        changed = False
        if "content" in payload and isinstance(payload["content"], str) and payload["content"] != p.content:
            p.content = payload["content"]; changed = True
        if changed:
            await self.repo.touch_post_updated(db, p)
            await delete_pattern(k("post", post_id, "viewer", "*"))
        return {"data": {"post_id": str(p.post_id)}, "message": "ok"}

    async def delete_post(self, db: AsyncSession, current, post_id: str) -> Dict[str, Any]:
        p = await self.repo.get_post_by_id(db, post_id)
        if not p:
            raise HTTPException(status_code=404, detail="Post does not exist.")
        if str(p.user_id) != current["user_id"]:
            raise HTTPException(status_code=403, detail="You do not have permission to delete this post.")
        await self.repo.delete_post(db, p)
        await delete_pattern(k("post", post_id, "viewer", "*"))
        return {"data": {"post_id": post_id}, "message": "ok"}

    async def like_post(self, db: AsyncSession, current, post_id: str) -> Dict[str, Any]:
        p = await self.repo.get_post_by_id(db, post_id)
        if not p:
            raise HTTPException(status_code=404, detail="Post not found.")
        if not await self.repo.can_interact_with_user(db, current["user_id"], str(p.user_id)):
            raise HTTPException(status_code=403, detail="You are not allowed to like because you are not friends with the user or the account is private.")
        if await self.repo.has_liked(db, user_id=current["user_id"], post_id=post_id):
            raise HTTPException(status_code=400, detail="You have already liked this post.")
        await self.repo.add_like(db, user_id=current["user_id"], post_id=post_id)
        await delete_pattern(k("post", post_id, "viewer", "*"))
        return {"data": {"post_id": post_id}, "message": "ok"}

    async def unlike_post(self, db: AsyncSession, current, post_id: str) -> Dict[str, Any]:
        p = await self.repo.get_post_by_id(db, post_id)
        if not p:
            raise HTTPException(status_code=404, detail="Post not found.")
        if not await self.repo.has_liked(db, user_id=current["user_id"], post_id=post_id):
            raise HTTPException(status_code=400, detail="You have already unliked this post.")
        if not await self.repo.can_interact_with_user(db, current["user_id"], str(p.user_id)):
            raise HTTPException(status_code=403, detail="You are not allowed to unlike because you are not friends with the user or the account is private.")
        await self.repo.remove_like(db, user_id=current["user_id"], post_id=post_id)
        await delete_pattern(k("post", post_id, "viewer", "*"))
        return {"data": {"post_id": post_id}, "message": "ok"}

    async def list_comments(self, db: AsyncSession, current, post_id: str, page: int, limit: int) -> Dict[str, Any]:
        if page < 1 or limit < 1:
            raise HTTPException(status_code=422, detail="page and limit must be >= 1")
        p = await self.repo.get_post_by_id(db, post_id)
        if not p:
            raise HTTPException(status_code=404, detail="Post not found.")
        if not await self.repo.can_view_user_posts(db, current["user_id"], str(p.user_id)):
            raise HTTPException(status_code=403, detail="You are not allowed to get comments because you are not friends with the user or the account is private.")
        rows, total_pages = await self.repo.list_comments(db, post_id=post_id, page=page, limit=limit)

        def row_to_comment(row):
            c, u = row
            return {
                "comment_id": str(c.comment_id),
                "content": c.content,
                "created_at": c.created_at.isoformat(),
                "user": {"user_id": str(u.user_id), "name": u.name, "username": u.username, "metadata": (u.user_metadata or {})},
            }
        return {"data": {"comments": [row_to_comment(r) for r in rows], "pagination": {"page": page, "limit": limit, "total": total_pages}}, "message": "ok"}

    async def create_comment(self, db: AsyncSession, current, post_id: str, body: dict) -> Dict[str, Any]:
        p = await self.repo.get_post_by_id(db, post_id)
        if not p:
            raise HTTPException(status_code=404, detail="Post not found.")
        if not await self.repo.can_interact_with_user(db, current["user_id"], str(p.user_id)):
            raise HTTPException(status_code=403, detail="You are not allowed to comment because you are not friends with the user or the account is private.")
        content = body.get("content")
        if not isinstance(content, str) or not content.strip():
            raise HTTPException(status_code=422, detail="content is required.")
        c = await self.repo.create_comment(db, user_id=current["user_id"], post_id=post_id, content=content.strip())
        await delete_pattern(k("post", post_id, "viewer", "*"))
        return {"data": {"comment_id": str(c.comment_id)}, "message": "ok"}

    async def update_comment(self, db: AsyncSession, current, comment_id: str, body: dict) -> Dict[str, Any]:
        c = await self.repo.get_comment_by_id(db, comment_id)
        if not c:
            raise HTTPException(status_code=404, detail="Comment not found.")
        if str(c.user_id) != current["user_id"]:
            raise HTTPException(status_code=403, detail="You do not have permission to update this comment.")
        content = body.get("content")
        if not isinstance(content, str) or not content.strip():
            raise HTTPException(status_code=422, detail="content is required.")
        c.content = content.strip()
        await self.repo.update_comment(db, c)
        await delete_pattern(k("post", str(c.post_id), "viewer", "*"))
        return {"data": {"comment_id": str(c.comment_id)}, "message": "ok"}

    async def delete_comment(self, db: AsyncSession, current, comment_id: str) -> Dict[str, Any]:
        c = await self.repo.get_comment_by_id(db, comment_id)
        if not c:
            raise HTTPException(status_code=404, detail="Comment not found.")
        if str(c.user_id) != current["user_id"]:
            raise HTTPException(status_code=403, detail="You are not allowed to delete comments from other users.")
        await self.repo.delete_comment(db, c)
        await delete_pattern(k("post", str(c.post_id), "viewer", "*"))
        return {"data": {"comment_id": str(c.comment_id)}, "message": "ok"}

def get_posts_service() -> PostsService:
    return PostsService(PostsRepo())
