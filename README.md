# Simplified Instagram Backend

A production-grade backend system built with **FastAPI**, designed to replicate the core logic of Instagram without messaging function — including user authentication, posts, comments, likes, S3 image upload, and a scalable service architecture.  

This repository demonstrates strong backend fundamentals: clean architecture, layered design, database modeling, JWT authentication, cloud deployment, and real-world API behavior.

---

# Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [System Diagram](#system-diagram)
- [Database ERD](#database-erd)
- [Features](#features)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [API Endpoints](#api-endpoints)
- [Local Development Guide](#local-development-guide)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Production Deployment (EC2 + systemd + Nginx)](#production-deployment-ec2--systemd--nginx)
- [Future Improvements](#future-improvements)
- [Author](#author)

---

# Overview

This backend implements the essential functionality required for a social media platform:

- User authentication using JWT
- CRUD operations for posts
- Likes, comments, and social interactions
- AWS S3 file upload
- PostgreSQL persistence
- Clean, maintainable layered architecture  
- Production-ready deployment setup

---

# Architecture

This project follows a **3-layer backend architecture**:

### 1️⃣ **Controller Layer (API Routers)**
- Handles HTTP requests  
- Input validation  
- Calls service layer  

### 2️⃣ **Service Layer (Business Logic)**
- Core logic  
- Validation, authorization  
- Error handling  

### 3️⃣ **Repository Layer (Database Access)**
- SQLAlchemy ORM  
- Efficient DB queries  
- Encapsulates data logic  

---

# System Diagram

```mermaid
flowchart TD
    Client -->|HTTP| Nginx -->|Reverse Proxy| FastAPI
    FastAPI --> ServiceLayer
    ServiceLayer --> RepositoryLayer
    RepositoryLayer --> PostgreSQL[(PostgreSQL Database)]
    FastAPI --> S3[(AWS S3 Bucket)]
    FastAPI --> JWT[JWT Authentication]
```

---

# Database ERD

```mermaid
erDiagram
    USER {
        uuid user_id
        string email
        string username
        string password_hash
        boolean is_public
        datetime created_at
        datetime updated_at
    }

    POST {
        uuid post_id
        uuid user_id
        string caption
        string image_url
        datetime created_at
    }

    COMMENT {
        uuid comment_id
        uuid user_id
        uuid post_id
        string content
        datetime created_at
    }

    LIKE {
        uuid like_id
        uuid user_id
        uuid post_id
    }

    USER ||--o{ POST : creates
    USER ||--o{ COMMENT : writes
    USER ||--o{ LIKE : likes
    POST ||--o{ COMMENT : receives
    POST ||--o{ LIKE : receives
```

---

# Features

### User System
- Registration
- Login (JWT)
- Profile update
- Public/private mode
- User search
- Follow / unfollow

### Posts
- Create / Update / Delete post
- List feed
- Retrieve posts from followed users

### Social Interactions
- Like / unlike
- Create / Update / Delete comment on posts

### AWS S3 Integration
- Image upload
- Presigned URL workflow

---

#  Project Structure

```
backend/
│── controllers/         # API routers (HTTP endpoints)
│── repositories/        # Database operations
│── schemas/             # Pydantic request/response schemas
│── services/            # Business logic layer
│── utils/               # JWT, hashing, S3, cache, rate limit
│── tests/               # Pytest test cases
│── main.py              # FastAPI entrypoint
│── db.py                # Database session and engine
│── models              # SQLAlchemy ORM models
│── requirements.txt
```

---

# Tech Stack

| Category | Technology |
|---------|------------|
| Backend Framework | FastAPI |
| Language | Python 3 |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Schema Validation | Pydantic v2 |
| Migrations | Alembic |
| Authentication | JWT |
| File Storage | AWS S3 + boto3 |
| Deployment | systemd + Nginx |
| Testing | Pytest |

---

# API Endpoints

## Auth & Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register new user |
| POST | `/api/users/login` | Login & return JWT |
| GET | `/api/users/{user_id}` | Get user profile |
| GET | `/api/users?search={username}&limit=10` | Search users |
| PATCH | `/api/users/` | Update profile |
| PATCH | `/api/users/{user_id}` | Admin update user status |

## Follows
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/follows?type=following&status=pending&page=1&limit=10` | Get following or follower list |
| POST | `/api/follows/request/{user_id}` | Follow Request |
| POST | `/api/follows/{follows_id}` | Delete, agree or reject follow request |
| DELETE | `/api/follows/{follows_id}` | Delete following relationship |

## Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events?page=1&limit=10` | Get event list |
| POST | `/api/events/read/{event_id}` | Read event |
| GET | `/api/events/unread-count` | Get unread event count |

## Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts/{post_id}` | Get single post |
| GET | `/api/posts?user_id={user_id}` | Get posts from following user |
| POST | `/api/posts/` | Create post |
| PATCH | `/api/posts/{post_id}` | Update post |
| DELETE | `/api/posts/{post_id}` | Delete post |

## Comments & Likes
| Method | Endpoint |
|--------|----------|
| POST | `/api/posts/like/{post_id}` | Like post |
| POST | `/api/posts/unlike/{post_id}` | Unlike post |
| GET | `/api/posts/comment/{post_id}?page=1&limit=10` | Get Comments on Post |
| POST | `/api/posts/comment/{post_id}` | Create comment on post |
| PATCH | `/api/posts/comment/{comment_id}` | Update Comment on post |
| DELETE | `/api/posts/comment/{comment_id}` | Delete Comment on post |


---

# Example JSON (Register)

Request:
```json
{
  "email": "user123@example.com",
  "username": "user123", 
  "password": "secret123"
}
```

Response:
```json
{
    "data": {
        "token": "{token}",
        "user": {
            "user_id": "{user_id}",
            "email": "user123@example.com",
            "username": "user123",
            "metadata": {}
        }
    }
}
```

# Example JSON (Login)

Request:
```json
{
  "email": "user123@example.com",
  "password": "secret123"
}
```

Response:
```json
{
    "data": {
        "token": "{token}",
        "user": {
            "user_id": "{user_id}",
            "email": "user123@example.com",
            "username": "user123",
            "role": "user",
            "metadata": {},
    "message": "ok"
}
```
---

# Local Development Guide

## 1. Clone repository

```
git clone https://github.com/ethancyc0724/Simplified-Instagram-Backend.git
cd Simplified-Instagram-Backend/backend
```

## 2. Create virtual environment

```
python3 -m venv venv
source venv/bin/activate
```

## 3. Install dependencies

```
pip install -r requirements.txt
```

## 4. Run migrations

```
alembic upgrade head
```

## 5. Start development server

```
uvicorn main:app --reload
```

Docs:
- http://127.0.0.1:8000/docs  
- http://127.0.0.1:8000/redoc  

---

# 🔧 Environment Variables

Create a `.env` file:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
SECRET_KEY=your-secret-key
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET_NAME=your-bucket
AWS_REGION=ap-northeast-1
```

---

# Testing

Run unit tests:

```
pytest
```

---

# Production Deployment (EC2 + systemd + Nginx)

## 1. Create systemd service

`/etc/systemd/system/fastapi.service`:

```
[Unit]
Description=FastAPI backend
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/backend
ExecStart=/home/ubuntu/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:

```
sudo systemctl daemon-reload
sudo systemctl enable fastapi
sudo systemctl start fastapi
```

---

## 2. Nginx reverse proxy

Create configuration:

```
server {
    listen 80;
    server_name your-domain-or-ip;

    location /api {
        proxy_pass http://127.0.0.1:8000/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Restart:

```
sudo systemctl restart nginx
```

---

# Future Improvements
- Refresh token flow  
- Redis caching for feed  
- Notification service  
- Docker Compose setup  
- Rate limiting  
- Async migration  

---

# Author

**Ethan Tsai**  
Backend Developer / FastAPI / PostgreSQL / Cloud  
GitHub: https://github.com/ethancyc0724

