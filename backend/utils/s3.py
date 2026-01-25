import os, re, uuid
import aioboto3
from fastapi import HTTPException, UploadFile, status
from typing import Optional, Tuple
from PIL import Image, ImageOps, UnidentifiedImageError
from io import BytesIO
from botocore.exceptions import ClientError

AWS_REGION = os.getenv("AWS_REGION")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
S3_PREFIX = os.getenv("S3_PREFIX", "users")

_ALLOWED_CT = {"image/jpeg", "image/png", "image/webp"}
HEAD_MAX = 2 * 1024 * 1024      # 2MB，覆蓋多數 JPEG EXIF/ICC 很大的情況
MAX_BYTES = 20 * 1024 * 1024  # 20MB
PRESIGNED_EXPIRES = 604800  # 7 天

_filename_safe = re.compile(r"[^A-Za-z0-9._-]+")
_segment_safe  = re.compile(r"[^A-Za-z0-9_-]+")

def _safe_name(name: str) -> str:
    return _filename_safe.sub("-", name or "upload.bin")

def _safe_seg(seg: str) -> str:
    return _segment_safe.sub("-", seg or "unknown")

async def upload_user_image(user_id: str, file: UploadFile) -> str:
    if not all([AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME]):
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="S3 not configured.")

    if file.content_type not in _ALLOWED_CT:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported image type.")

    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=f"Image too large (max {MAX_BYTES // (1024*1024)}MB).")

    safe_user = _safe_seg(user_id)
    safe_name = _safe_name(file.filename)
    key = f"{S3_PREFIX}/{safe_user}/images/{uuid.uuid4().hex}_{safe_name}"

    session = aioboto3.Session(
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION,
    )
    async with session.client("s3", region_name=AWS_REGION) as s3:
        await s3.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=key,
            Body=data,
            ContentType=file.content_type,
            ContentDisposition="inline",
            ServerSideEncryption="AES256",
            # 不要放 ACL 參數，避免 ACLs disabled 報錯
        )
        presigned_url = await s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": S3_BUCKET_NAME, "Key": key},
            ExpiresIn=PRESIGNED_EXPIRES
        )
        return presigned_url

def _probe_image_size(data: bytes) -> Tuple[Optional[int], Optional[int]]:
    try:
        with Image.open(BytesIO(data)) as im:
            im2 = ImageOps.exif_transpose(im)
            w, h = im2.size
            return int(w), int(h)
    except Exception:
        return None, None

async def _ensure_dims(file: UploadFile) -> Tuple[int, int]:
    # 1) 先讀頭部
    head = await file.read(min(MAX_BYTES, HEAD_MAX))
    w, h = _probe_image_size(head)
    if w and h:
        file.file.seek(0)
        return w, h
    # 2) fallback 讀整檔（限制 MAX_BYTES）
    file.file.seek(0)
    full = await file.read(MAX_BYTES)
    w, h = _probe_image_size(full)
    file.file.seek(0)
    if not (w and h):
        raise HTTPException(status_code=422, detail="Cannot determine image dimensions.")
    return w, h

async def upload_post_image(user_id: str, post_id: str, file: UploadFile) -> Tuple[str, int, int]:
    if file.content_type not in _ALLOWED_CT:
        raise HTTPException(status_code=415, detail="Unsupported image type.")

    # ← 一定要用 _ensure_dims
    w, h = await _ensure_dims(file)

    # 檔案大小檢查
    file.file.seek(0, 2)
    size = file.file.tell()
    if size > MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"Image too large (max {MAX_BYTES // (1024*1024)}MB).")
    file.file.seek(0)

    # S3 key（淨化使用者與貼文 id）
    safe_name = _safe_name(file.filename or "upload.bin")
    key = f"posts/{_safe_seg(user_id)}/{_safe_seg(post_id)}/{uuid.uuid4().hex}_{safe_name}"

    session = aioboto3.Session(region_name=AWS_REGION)
    try:
        async with session.client("s3", region_name=AWS_REGION) as s3:
            await s3.upload_fileobj(
                Fileobj=file.file,
                Bucket=S3_BUCKET_NAME,
                Key=key,
                ExtraArgs={"ContentType": file.content_type, "ServerSideEncryption": "AES256"},
            )

            url = await s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": S3_BUCKET_NAME, "Key": key},
                ExpiresIn=PRESIGNED_EXPIRES,
            )
    except ClientError as e:
        raise HTTPException(status_code=502, detail="S3 upload failed.") from e

    return url, w, h   # 或回 (key, w, h) 更建議：把 key 存 DB
