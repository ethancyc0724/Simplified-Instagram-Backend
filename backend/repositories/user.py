from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime
from models import User
from utils.auth import hash_password

class UsersRepo:
    async def create_user(self, db: AsyncSession, email: str, username: str, password: str) -> User:
        new_user = User(
            email=email.lower(),
            username=username.lower(),
            password_hash=hash_password(password),
            last_login_at=datetime.utcnow(),
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user

    async def get_by_id(self, db: AsyncSession, user_id: str) -> User | None:
        result = await db.execute(select(User).where(User.user_id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, db: AsyncSession, email: str) -> User | None:
        result = await db.execute(select(User).where(func.lower(User.email) == email.lower()))
        return result.scalar_one_or_none()

    async def get_by_username(self, db: AsyncSession, username: str) -> User | None:
        result = await db.execute(select(User).where(func.lower(User.username) == username.lower()))
        return result.scalar_one_or_none()

    async def list_only_role_user(self, db: AsyncSession, search: str | None):
        stmt = select(User).where(User.role == "user", User.status == "enabled")
        if search:
            search_pattern = f"%{search}%"
            stmt = stmt.where(User.name.ilike(search_pattern) | User.username.ilike(search_pattern))
        result = await db.execute(stmt)
        return result.scalars().all()

    async def update_user(self, db: AsyncSession, user: User, update_data: dict) -> User:
        for k, v in update_data.items():
            setattr(user, k, v)
        user.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(user)
        return user

    async def touch_last_login(self, db: AsyncSession, user: User):
        user.last_login_at = datetime.utcnow()
        await db.commit()
        await db.refresh(user)

    async def update_status(self, db: AsyncSession, user: User, status: str) -> User:
        from datetime import datetime
        user.status = status
        user.disabled_at = None if status == "enabled" else datetime.utcnow()
        user.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(user)
        return user
