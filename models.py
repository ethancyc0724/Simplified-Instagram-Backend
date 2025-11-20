from sqlalchemy import Column, String, Integer,  Boolean, DateTime, Enum, UniqueConstraint, CheckConstraint, Index, ForeignKey, and_, or_
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import relationship
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100))
    status = Column(String(20), nullable=False, default="enabled")
    is_public = Column(Boolean, default=False)
    role = Column(String(20), nullable=False, default="user")
    last_login_at = Column(DateTime, server_default=func.now(), nullable=False)
    disabled_at = Column(DateTime)
    password_changed_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    user_metadata = Column(MutableDict.as_mutable(JSONB))

    # 一個使用者有很多 Like 記錄（1:N 到 Like 表）
    likes = relationship(
        "Like",
        back_populates="user",
        cascade="all, delete-orphan"   # 刪 User 時一併刪相關的 Like 資料
    )

    # 方便直接拿到我按過讚的貼文（透過 likes 表）
    liked_posts = relationship(
        "Post",
        secondary="likes",                         # 中介表
        primaryjoin="User.user_id==Like.user_id",  # 從 User 走到 Like
        secondaryjoin="Post.post_id==Like.post_id", # 再從 Like 走到 Post
        viewonly=True                              # 只讀新增和刪除走 Like 實體
    )

class Follow(Base):
    __tablename__ = "follows"

    follows_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    follower_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    following_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum("pending", "agree", name="follow_status"), nullable=False, server_default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_follow_pair"),
        CheckConstraint("follower_id <> following_id", name="no_self_follow"),
        Index("ix_follows_follower_id", "follower_id"),
        Index("ix_follows_following_id", "following_id"),
        Index("ix_follows_status", "status"),
    )

class Event(Base):
    __tablename__ = "events"

    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    message = Column(String, nullable=False)
    type = Column(Enum("friend_request", "friend_agree", name="event_type"), nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    event_metadata = Column(MutableDict.as_mutable(JSONB))

    __table_args__ = (
        Index("ix_events_user_created", "user_id", "created_at"),
        Index("ix_events_user_isread", "user_id", "is_read"),
        Index("ix_events_type", "type"),
    )

class Post(Base):
    __tablename__ = "posts"

    post_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    post_metadata = Column(MutableDict.as_mutable(JSONB))

    __table_args__ = (
        Index("ix_posts_user_created", "user_id", "created_at"),
        Index("ix_posts_created_id", "created_at", "post_id"),
    )

    # 一篇貼文有很多 Like 記錄（1:N 到 Like 表）
    likes = relationship(
        "Like",
        back_populates="post",
        cascade="all, delete-orphan"
    )

    # 方便直接拿到按讚的使用者清單
    likers = relationship(
        "User",
        secondary="likes",
        primaryjoin="Post.post_id==Like.post_id",
        secondaryjoin="User.user_id==Like.user_id",
        viewonly=True
    )

class PostImage(Base):
    __tablename__ = "post_images"

    image_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=False)
    width = Column(Integer)
    height = Column(Integer)
    order = Column(Integer, nullable=False, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    image_metadata = Column(MutableDict.as_mutable(JSONB))

    __table_args__ = (
        Index("ix_post_images_post_order", "post_id", "order"),
    )

class Like(Base):
    __tablename__ = "likes"

    like_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_like_user_post"),
        Index("ix_likes_post", "post_id"),
        Index("ix_likes_user", "user_id"),
    )
    user = relationship("User", back_populates="likes")
    post = relationship("Post", back_populates="likes")

class Comment(Base):
    __tablename__ = "comments"

    comment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_comments_post_created", "post_id", "created_at"),
    )
