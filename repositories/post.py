from typing import Optional, Tuple, List, Dict, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, exists
from datetime import datetime
from models import Post, PostImage, Like, Comment, User, Follow

class PostsRepo:
    # ----- create / update / delete post -----
    async def create_post(self, db: AsyncSession, *, user_id: str, content: str, metadata: Optional[dict] = None) -> Post:
        p = Post(user_id=user_id, content=content, post_metadata=(metadata or {}))
        db.add(p); await db.commit(); await db.refresh(p)
        return p

    async def touch_post_updated(self, db: AsyncSession, p: Post) -> None:
        p.updated_at = datetime.utcnow()
        await db.commit(); await db.refresh(p)

    async def delete_post(self, db: AsyncSession, p: Post) -> None:
        await db.delete(p); await db.commit()

    # ----- images -----
    async def add_post_image(self, db: AsyncSession, *, post_id: str, url: str, order: int,
                             width: Optional[int], height: Optional[int], meta: Optional[dict] = None) -> PostImage:
        img = PostImage(post_id=post_id, width=width, height=height, order=order, image_metadata=(meta or {}))
        m = img.image_metadata or {}; m["url"] = url; img.image_metadata = m
        db.add(img); await db.commit(); await db.refresh(img)
        return img

    async def list_post_images_by_posts(self, db: AsyncSession, post_ids: List[str]) -> Dict[str, List[PostImage]]:
        if not post_ids: return {}
        stmt = select(PostImage).where(PostImage.post_id.in_(post_ids)).order_by(PostImage.post_id.asc(), PostImage.order.asc())
        res = await db.execute(stmt); images = res.scalars().all()
        out: Dict[str, List[PostImage]] = {}
        for im in images:
            out.setdefault(str(im.post_id), []).append(im)
        return out

    # ----- query post -----
    async def get_post_by_id(self, db: AsyncSession, post_id: str) -> Optional[Post]:
        res = await db.execute(select(Post).where(Post.post_id == post_id))
        return res.scalar_one_or_none()

    async def list_posts(
        self, db: AsyncSession, *, viewer_id: str, user_id: Optional[str], search: Optional[str],
        limit: int, cursor_post_id: Optional[str]
    ):
        base = select(Post)

        def escape_like(s: str) -> str:
            return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

        search_q = (search or "").strip()
        pattern: Optional[str] = f"%{escape_like(search_q)}%" if search_q else None

        if user_id:
            if not await self.can_view_user_posts(db, viewer_id, user_id):
                return [], None, 0
            base = base.where(Post.user_id == user_id)
            if pattern is not None:
                base = base.where(Post.content.ilike(pattern, escape="\\"))
        else:
            following_ids_sq = (
                select(Follow.following_id)
                .join(User, User.user_id == Follow.following_id)
                .where(Follow.follower_id == viewer_id, Follow.status == "agree", User.status == "enabled")
            )
            if pattern is not None:
                public_ids_sq = select(User.user_id).where(User.is_public.is_(True), User.status == "enabled")
                visible_scope = or_(
                    Post.user_id == viewer_id,
                    Post.user_id.in_(following_ids_sq),
                    Post.user_id.in_(public_ids_sq),
                )
                base = base.where(visible_scope).where(Post.content.ilike(pattern, escape="\\"))
            else:
                visible_scope = or_(Post.user_id == viewer_id, Post.user_id.in_(following_ids_sq))
                base = base.where(visible_scope)

        if cursor_post_id:
            cur = await db.execute(select(Post.created_at, Post.post_id).where(Post.post_id == cursor_post_id))
            row = cur.first()
            if row:
                cur_created, cur_id = row
                base = base.where(or_(Post.created_at < cur_created, and_(Post.created_at == cur_created, Post.post_id < cur_id)))

        total_stmt = select(func.count()).select_from(base.subquery())
        total = (await db.execute(total_stmt)).scalar_one()
        total_pages = (total + limit - 1) // limit

        page_stmt = base.order_by(Post.created_at.desc(), Post.post_id.desc()).limit(limit)
        posts = (await db.execute(page_stmt)).scalars().all()
        next_cursor = str(posts[-1].post_id) if posts else None
        return posts, next_cursor, total_pages

    async def get_top2_comments_with_user(self, db: AsyncSession, post_id: str):
        stmt = (
            select(Comment, User)
            .join(User, User.user_id == Comment.user_id)
            .where(Comment.post_id == post_id)
            .order_by(Comment.created_at.desc(), Comment.comment_id.desc())
            .limit(2)
        )
        res = await db.execute(stmt)
        return res.all()

    async def list_comments(
        self,
        db: AsyncSession,
        *,
        post_id: str,
        page: int,
        limit: int
    ) -> Tuple[List[Tuple[Comment, User]], int]:
        base = (
            select(Comment, User)
            .join(User, User.user_id == Comment.user_id)
            .where(Comment.post_id == post_id)
        )

        # 總筆數與總頁數
        total_stmt = select(func.count()).select_from(base.subquery())
        total = (await db.execute(total_stmt)).scalar_one()

        safe_limit = max(1, limit)
        safe_page = max(1, page)
        offset = (safe_page - 1) * safe_limit
        total_pages = (total + safe_limit - 1) // safe_limit

        stmt = (
            base.order_by(Comment.created_at.desc(), Comment.comment_id.desc())
            .offset(offset)
            .limit(safe_limit)
        )
        res = await db.execute(stmt)
        rows = res.all()  # List[Tuple[Comment, User]]

        return rows, total_pages
    # ----- permissions -----
    async def can_view_user_posts(self, db: AsyncSession, viewer_id: str, target_user_id: str) -> bool:
        if viewer_id == target_user_id:
            return True
        u = await db.execute(select(User).where(User.user_id == target_user_id))
        user = u.scalar_one_or_none()
        if not user or user.status != "enabled":
            return False
        if user.is_public:
            return True
        q = select(exists().where(and_(Follow.follower_id == viewer_id, Follow.following_id == target_user_id, Follow.status == "agree")))
        res = await db.execute(q)
        return bool(res.scalar())

    async def can_interact_with_user(self, db: AsyncSession, actor_id: str, target_user_id: str) -> bool:
        if actor_id == target_user_id:
            return True
        u = await db.execute(select(User).where(User.user_id == target_user_id))
        user = u.scalar_one_or_none()
        if not user or user.status != "enabled":
            return False
        if user.is_public:
            return True
        q = select(exists().where(and_(Follow.follower_id == actor_id, Follow.following_id == target_user_id, Follow.status == "agree")))
        res = await db.execute(q)
        return bool(res.scalar())

    # ----- like / comment counts -----
    async def get_post_counts_and_flags(
        self, db: AsyncSession, post_ids: List[str], viewer_id: Optional[str] = None
    ) -> Tuple[Dict[str, int], Dict[str, int], Set[str]]:
        if not post_ids:
            return {}, {}, set()

        like_stmt = select(Like.post_id, func.count().label("c")).where(Like.post_id.in_(post_ids)).group_by(Like.post_id)
        like_res = await db.execute(like_stmt)
        like_count = {str(pid): c for pid, c in like_res.all()}

        cmt_stmt = select(Comment.post_id, func.count().label("c")).where(Comment.post_id.in_(post_ids)).group_by(Comment.post_id)
        cmt_res = await db.execute(cmt_stmt)
        comment_count = {str(pid): c for pid, c in cmt_res.all()}

        liked_ids: Set[str] = set()
        if viewer_id:
            l_stmt = select(Like.post_id).where(Like.user_id == viewer_id, Like.post_id.in_(post_ids))
            l_res = await db.execute(l_stmt)
            liked_ids = {str(r[0]) for r in l_res.all()}

        return like_count, comment_count, liked_ids

    # ----- like / comment CRUD -----
    async def has_liked(self, db: AsyncSession, *, user_id: str, post_id: str) -> bool:
        r = await db.execute(select(exists().where(and_(Like.user_id == user_id, Like.post_id == post_id))))
        return bool(r.scalar())

    async def add_like(self, db: AsyncSession, *, user_id: str, post_id: str) -> None:
        if not await self.has_liked(db, user_id=user_id, post_id=post_id):
            l = Like(user_id=user_id, post_id=post_id)
            db.add(l); await db.commit()

    async def remove_like(self, db: AsyncSession, *, user_id: str, post_id: str) -> None:
        r = await db.execute(select(Like).where(Like.user_id == user_id, Like.post_id == post_id))
        like = r.scalar_one_or_none()
        if like:
            await db.delete(like); await db.commit()

    async def create_comment(self, db: AsyncSession, *, user_id: str, post_id: str, content: str) -> Comment:
        c = Comment(user_id=user_id, post_id=post_id, content=content)
        db.add(c); await db.commit(); await db.refresh(c)
        return c

    async def get_comment_by_id(self, db: AsyncSession, comment_id: str) -> Optional[Comment]:
        r = await db.execute(select(Comment).where(Comment.comment_id == comment_id))
        return r.scalar_one_or_none()

    async def update_comment(self, db: AsyncSession, c: Comment) -> None:
        await db.commit(); await db.refresh(c)

    async def delete_comment(self, db: AsyncSession, c: Comment) -> None:
        await db.delete(c); await db.commit()
