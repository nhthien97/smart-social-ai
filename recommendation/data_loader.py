import os
import logging
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse, unquote

import pandas as pd
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Đọc biến môi trường từ recommendation/.env nếu file này tồn tại.
# Biến môi trường đã được thiết lập bên ngoài vẫn được giữ nguyên.
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

MONGODB_URL = os.getenv("MONGODB_URL")
MONGODB_DB = os.getenv("MONGODB_DB")

_client: Optional[AsyncIOMotorClient] = None
_db = None


def _resolve_database_name() -> str:
    """Xác định database từ MONGODB_DB hoặc database trong URI."""

    if MONGODB_DB and MONGODB_DB.strip():
        return MONGODB_DB.strip()

    if not MONGODB_URL:
        raise RuntimeError(
            "Chưa cấu hình MONGODB_URL. "
            "Hãy thiết lập biến môi trường trước khi chạy Recommendation."
        )

    parsed = urlparse(MONGODB_URL)
    database_name = unquote(parsed.path.lstrip("/").split("/")[0])

    if database_name:
        return database_name

    raise RuntimeError(
        "Không xác định được database MongoDB từ URI. "
        "Hãy đặt MONGODB_DB trong biến môi trường."
    )


def get_db():
    """Trả về kết nối tới database dùng chung với Backend."""

    global _client, _db

    if _db is not None:
        return _db

    if not MONGODB_URL:
        raise RuntimeError(
            "Thiếu MONGODB_URL. Không thể kết nối MongoDB."
        )

    database_name = _resolve_database_name()
    _client = AsyncIOMotorClient(
        MONGODB_URL,
        serverSelectionTimeoutMS=10000,
    )
    _db = _client[database_name]

    logger.info("Recommendation MongoDB database configured: %s", database_name)
    return _db


async def close_db():
    """Đóng kết nối MongoDB khi ứng dụng dừng."""

    global _client, _db

    if _client is not None:
        _client.close()

    _client = None
    _db = None


async def load_interactions(
    since: Optional[datetime] = None,
) -> pd.DataFrame:
    """
    Đọc user_interactions và tổng hợp weight theo user_id, post_id.

    Schema Backend:
    - user_id: string
    - post_id: string
    - interaction_type: view | like | comment | share | save | report
    - weight: number
    - created_at: datetime
    """

    db = get_db()
    query = {}

    if since is not None:
        query["created_at"] = {"$gte": since}

    projection = {
        "_id": 0,
        "user_id": 1,
        "post_id": 1,
        "weight": 1,
        "created_at": 1,
    }

    cursor = db["user_interactions"].find(query, projection)
    documents = await cursor.to_list(length=None)

    columns = ["user_id", "post_id", "weight"]

    if not documents:
        return pd.DataFrame(columns=columns)

    df = pd.DataFrame(documents)

    required_columns = {"user_id", "post_id", "weight"}
    if not required_columns.issubset(df.columns):
        logger.warning(
            "user_interactions thiếu các trường bắt buộc: %s",
            required_columns - set(df.columns),
        )
        return pd.DataFrame(columns=columns)

    df = df.dropna(subset=["user_id", "post_id", "weight"]).copy()
    df["user_id"] = df["user_id"].astype(str)
    df["post_id"] = df["post_id"].astype(str)
    df["weight"] = pd.to_numeric(df["weight"], errors="coerce")
    df = df.dropna(subset=["weight"])

    if df.empty:
        return pd.DataFrame(columns=columns)

    # Giữ nguyên cả weight âm của interaction_type=report.
    return (
        df.groupby(["user_id", "post_id"], as_index=False)["weight"]
        .sum()
    )


async def load_post_tags() -> dict[str, list[str]]:
    """
    Đọc tag của bài viết có thể tham gia News Feed thông thường.

    Đồng bộ với posts.service.ts:
    - status phải là active
    - group_id phải null, không tồn tại hoặc chuỗi rỗng

    Backend vẫn chịu trách nhiệm kiểm tra quyền xem bài theo user.
    """

    db = get_db()

    query = {
        "status": "active",
        "$or": [
            {"group_id": None},
            {"group_id": {"$exists": False}},
            {"group_id": ""},
        ],
        "tags": {"$exists": True, "$ne": []},
    }

    projection = {
        "_id": 1,
        "tags": 1,
    }

    cursor = db["posts"].find(query, projection)
    documents = await cursor.to_list(length=None)

    result: dict[str, list[str]] = {}

    for document in documents:
        post_id = str(document["_id"])
        tags = document.get("tags") or []

        if not isinstance(tags, list):
            continue

        normalized_tags = [
            tag.strip()
            for tag in tags
            if isinstance(tag, str) and tag.strip()
        ]

        if normalized_tags:
            result[post_id] = normalized_tags

    return result


async def load_user_tag_preferences(
    user_id: str,
) -> list[tuple[str, float]]:
    """
    Tính mức độ quan tâm của user theo tag, dựa trên interaction weight.

    Trả về danh sách (tag, score), sắp xếp score giảm dần.
    """

    db = get_db()

    cursor = db["user_interactions"].find(
        {"user_id": str(user_id)},
        {"_id": 0, "post_id": 1, "weight": 1},
    )
    documents = await cursor.to_list(length=None)

    if not documents:
        return []

    interaction_weights: dict[str, float] = {}

    for document in documents:
        post_id = document.get("post_id")
        weight = document.get("weight")

        if post_id is None or weight is None:
            continue

        try:
            numeric_weight = float(weight)
        except (TypeError, ValueError):
            continue

        post_id = str(post_id)
        interaction_weights[post_id] = (
            interaction_weights.get(post_id, 0.0) + numeric_weight
        )

    if not interaction_weights:
        return []

    object_ids = []
    for post_id in interaction_weights:
        if ObjectId.is_valid(post_id):
            object_ids.append(ObjectId(post_id))

    if not object_ids:
        return []

    post_cursor = db["posts"].find(
        {
            "_id": {"$in": object_ids},
            "status": "active",
        },
        {"_id": 1, "tags": 1},
    )
    posts = await post_cursor.to_list(length=None)

    tag_scores: dict[str, float] = {}

    for post in posts:
        post_id = str(post["_id"])
        weight = interaction_weights.get(post_id, 0.0)

        for tag in post.get("tags") or []:
            if not isinstance(tag, str) or not tag.strip():
                continue

            normalized_tag = tag.strip()
            tag_scores[normalized_tag] = (
                tag_scores.get(normalized_tag, 0.0) + weight
            )

    return sorted(
        tag_scores.items(),
        key=lambda item: item[1],
        reverse=True,
    )


async def load_popular_post_ids(limit: int = 20) -> list[str]:
    """
    Lấy bài viết phổ biến làm phương án dự phòng khi chưa có mô hình.

    Chỉ lấy bài active nằm ngoài luồng bài viết trong nhóm.
    """

    db = get_db()

    if limit <= 0:
        return []

    query = {
        "status": "active",
        "$or": [
            {"group_id": None},
            {"group_id": {"$exists": False}},
            {"group_id": ""},
        ],
    }

    projection = {
        "_id": 1,
        "likes_count": 1,
        "comments_count": 1,
        "shares_count": 1,
        "view_count": 1,
    }

    cursor = db["posts"].find(query, projection)
    documents = await cursor.to_list(length=None)

    def popularity_score(post: dict) -> float:
        return (
            float(post.get("likes_count") or 0)
            + 2.0 * float(post.get("comments_count") or 0)
            + 3.0 * float(post.get("shares_count") or 0)
            + 0.1 * float(post.get("view_count") or 0)
        )

    documents.sort(
        key=lambda post: (popularity_score(post), str(post["_id"])),
        reverse=True,
    )

    return [str(post["_id"]) for post in documents[:limit]]
