import pytest
import sys
from pathlib import Path

# 將專案根目錄加入 Python 路徑
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from main import app
from fastapi.testclient import TestClient
from main import app
from services.user import UsersService
from services.post import PostsService

def fake_get_current_user():
    return {"user_id": "u1", "role": "user"}

async def fake_get_db():
    yield None

# 假的Service，繼承自user的service物件
class FakeUsersService(UsersService):
    def __init__(self): pass

    async def register(self, db, data):
        if len(data.password) < 6:
            from fastapi import HTTPException
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid password format.")
        return {"data": {"token":"t", "user":{"user_id":"u1","email":data.email,"username":data.username,"metadata":{}}}, "message":"ok"}

    async def login(self, db, data):
        if data.password != "pass":
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Invalid email or password.")
        return {"data": {"token":"t","user":{"user_id":"u1","email":data.email,"username":"user","role":"user","metadata":{}}}, "message":"ok"}

    async def list_users(self, db, current, search, limit, page):
        return {"data":{"users":[{"user_id":"u2","email":"a@b.com","name":None,"username":"alice","is_public":True,"metadata":{}}],"pagination":{"page":1,"limit":10,"total":1}}}

    async def get_detail(self, db, current, user_id):
        return {"user":{"user_id":"u2","email":"a@b.com","name":None,"username":"alice","is_public":True,"metadata":{}},"is_following":False,"follower_count":0,"following_count":0,"post_count":0}, "MISS"

# 假的Service，繼承自post的service物件
class FakePostsService(PostsService):
    def __init__(self): pass

    async def create_post(self, db, current, content, images):
        return {"data":{"post_id":"p1"},"message":"ok"}

    async def get_post_detail(self, db, current, post_id):
        return {"post_id":"p1","content":"hi","images":[],"comments":[],"created_at":"2025-09-19T00:00:00","is_liked":False,"like_count":0,"comment_count":0}, "MISS"

# 定義全域的fixture (每一個測試都要把呼叫跟db有關的函式覆寫掉)
@pytest.fixture(autouse=True)
def override_di(monkeypatch):
    from services.user import get_users_service
    from services.post import get_posts_service
    from utils.auth import get_current_user
    from db import get_db
    app.dependency_overrides[get_users_service] = lambda: FakeUsersService()
    app.dependency_overrides[get_posts_service] = lambda: FakePostsService()
    app.dependency_overrides[get_current_user] = fake_get_current_user
    app.dependency_overrides[get_db] = fake_get_db
    yield

# 建立FastAPI提供測試用的HTTP客戶端
@pytest.fixture
def client():
    return TestClient(app)

