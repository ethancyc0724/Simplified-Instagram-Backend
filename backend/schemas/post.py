from pydantic import BaseModel
from typing import List, Optional, Dict

# 共用
class PostImageItem(BaseModel):
    image_id: str
    url: str
    width: Optional[int] = None
    height: Optional[int] = None
    order: int

class PostListItem(BaseModel):
    post_id: str
    content: str
    images: List[PostImageItem]
    is_liked: bool
    like_count: int
    comment_count: int
    created_at: str
    user_id: str
    username: str

class PostListPagination(BaseModel):
    limit: int
    cursor_post_id: Optional[str] = None
    total: int  # 總頁數

class PostListData(BaseModel):
    posts: List[PostListItem]
    pagination: PostListPagination

class PostListResponse(BaseModel):
    data: PostListData

class PostDetailCommentUser(BaseModel):
    user_id: str
    name: Optional[str] = None
    username: str
    metadata: Optional[Dict] = {}

class PostDetailComment(BaseModel):
    comment_id: str
    content: str
    created_at: str
    user: PostDetailCommentUser

class PostDetailData(BaseModel):
    post_id: str
    content: str
    images: List[PostImageItem]
    comments: List[PostDetailComment]
    created_at: str
    is_liked: bool
    like_count: int
    comment_count: int
    user_id: str
    username: str

class PostDetailResponse(BaseModel):
    data: PostDetailData
    message: str = "ok"

class PostCreateData(BaseModel):
    post_id: str

class PostCreateResponse(BaseModel):
    data: PostCreateData
    message: str = "ok"

class PostUpdateResponse(PostCreateResponse):
    pass

class PostDeleteResponse(PostCreateResponse):
    pass

class CommentsPagination(BaseModel):
    page: int
    limit: int
    total: int  # 總頁數

class CommentListData(BaseModel):
    comments: List[PostDetailComment]
    pagination: CommentsPagination

class CommentListResponse(BaseModel):
    data: CommentListData
    message: str = "ok"

class CommentCreateData(BaseModel):
    comment_id: str

class CommentCreateResponse(BaseModel):
    data: CommentCreateData
    message: str = "ok"

class CommentUpdateResponse(CommentCreateResponse):
    pass

class CommentDeleteResponse(CommentCreateResponse):
    pass
