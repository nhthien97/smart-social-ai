import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query

from data_loader import close_db, get_db, load_interactions
from models.schemas import (
    RecommendResponse,
    SimilarResponse,
    TrainStatus,
)
from recommender.item_based import (
    get_recommendations_for_user,
    get_similar_posts,
    train_and_save,
)
from recommender.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)

RETRAIN_CRON = os.getenv("RETRAIN_CRON", "0 */6 * * *")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Khởi động API trước, huấn luyện Recommendation ở nền."""

    start_scheduler(RETRAIN_CRON)

    async def initial_training():
        try:
            result = await train_and_save()
            logger.info(
                "Huấn luyện Recommendation lúc khởi động: %s",
                result,
            )
        except Exception:
            logger.exception(
                "Huấn luyện ban đầu thất bại; API vẫn tiếp tục hoạt động."
            )

    training_task = asyncio.create_task(initial_training())

    try:
        yield
    finally:
        if not training_task.done():
            training_task.cancel()
            try:
                await training_task
            except asyncio.CancelledError:
                pass

        stop_scheduler()
        await close_db()

app = FastAPI(
    title="Smart Social AI Recommendation API",
    description="Dịch vụ gợi ý bài viết cho Smart Social AI.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    """Kiểm tra API và khả năng kết nối MongoDB."""

    try:
        db = get_db()
        await db.command("ping")
    except Exception:
        logger.exception("Health check MongoDB thất bại.")
        raise HTTPException(
            status_code=503,
            detail="Recommendation API chưa kết nối được MongoDB.",
        )

    return {
        "status": "ok",
        "service": "recommendation",
        "timestamp": datetime.now(timezone.utc),
    }


@app.post("/train", response_model=TrainStatus)
async def train():
    """Huấn luyện mô hình và lưu kết quả vào MongoDB."""

    try:
        result = await train_and_save()
        return TrainStatus(**result)
    except Exception:
        logger.exception("Huấn luyện Recommendation thất bại.")
        raise HTTPException(
            status_code=500,
            detail="Huấn luyện Recommendation thất bại.",
        )


@app.get("/recommend/{user_id}", response_model=RecommendResponse)
async def recommend(user_id: str):
    """Trả về danh sách bài viết gợi ý cho một người dùng."""

    try:
        result = await get_recommendations_for_user(user_id)
        return RecommendResponse(**result)
    except Exception:
        logger.exception("Không thể tạo gợi ý cho user_id=%s", user_id)
        raise HTTPException(
            status_code=500,
            detail="Không thể lấy danh sách gợi ý.",
        )


@app.get("/similar/{post_id}", response_model=SimilarResponse)
async def similar(post_id: str):
    """Lấy các bài viết tương tự một bài viết."""

    try:
        result = await get_similar_posts(post_id)
        return SimilarResponse(**result)
    except Exception:
        logger.exception("Không thể tìm bài tương tự cho post_id=%s", post_id)
        raise HTTPException(
            status_code=500,
            detail="Không thể lấy danh sách bài viết tương tự.",
        )


@app.get("/evaluate")
async def evaluate(k: int = Query(default=10, ge=1, le=100)):
    """Đánh giá mô hình với giá trị K hợp lệ."""

    from recommender.evaluation import evaluate_model

    try:
        return await evaluate_model(k=k)
    except Exception:
        logger.exception("Đánh giá Recommendation thất bại.")
        raise HTTPException(
            status_code=500,
            detail="Đánh giá Recommendation thất bại.",
        )


@app.get("/interactions/stats")
async def interaction_stats():
    """Thống kê tương tác trong collection user_interactions."""

    try:
        db = get_db()
        total = await db["user_interactions"].count_documents({})

        pipeline = [
            {
                "$group": {
                    "_id": "$interaction_type",
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]

        cursor = db["user_interactions"].aggregate(pipeline)
        by_type = await cursor.to_list(length=None)

        interactions = await load_interactions()

        return {
            "total_records": total,
            "user_post_pairs": len(interactions),
            "by_type": {
                item["_id"]: item["count"]
                for item in by_type
                if item.get("_id") is not None
            },
        }
    except Exception:
        logger.exception("Không thể thống kê user_interactions.")
        raise HTTPException(
            status_code=500,
            detail="Không thể thống kê dữ liệu tương tác.",
        )
@app.get("/diagnostics/recommendations")
async def recommendation_cache_diagnostics(
    user_id: str = Query(..., min_length=1),
):
    """Chẩn đoán cache Recommendation; chỉ đọc dữ liệu."""

    try:
        db = get_db()
        collection = db["user_recommendations"]
        now = datetime.now(timezone.utc)

        total = await collection.count_documents({})
        active = await collection.count_documents(
            {"expires_at": {"$gt": now}}
        )
        expired = await collection.count_documents(
            {"expires_at": {"$lte": now}}
        )

        user_query = {"user_id": str(user_id)}
        user_total = await collection.count_documents(user_query)
        user_active = await collection.count_documents(
            {
                "user_id": str(user_id),
                "expires_at": {"$gt": now},
            }
        )
        user_expired = await collection.count_documents(
            {
                "user_id": str(user_id),
                "expires_at": {"$lte": now},
            }
        )

        latest = await collection.find_one(
            user_query,
            {
                "_id": 0,
                "generated_at": 1,
                "expires_at": 1,
                "rank": 1,
            },
            sort=[("generated_at", -1)],
        )

        return {
            "checked_at": now,
            "cache": {
                "total": total,
                "active": active,
                "expired": expired,
            },
            "user": {
                "user_id": str(user_id),
                "total": user_total,
                "active": user_active,
                "expired": user_expired,
                "latest_record": latest,
            },
        }
    except Exception:
        logger.exception("Chẩn đoán cache Recommendation thất bại.")
        raise HTTPException(
            status_code=500,
            detail="Không thể chẩn đoán cache Recommendation.",
        )
        
@app.get("/diagnostics/user-interactions")
async def user_interaction_diagnostics(
    user_id: str = Query(..., min_length=1),
):
    """Kiểm tra tương tác của một user; chỉ đọc dữ liệu."""

    try:
        db = get_db()
        user_id = str(user_id)

        raw_count = await db["user_interactions"].count_documents({
            "user_id": user_id,
        })

        interactions = await load_interactions()
        user_interactions = interactions[
            interactions["user_id"] == user_id
        ]

        return {
            "user_id": user_id,
            "raw_interaction_count": raw_count,
            "aggregated_user_post_pairs": len(user_interactions),
            "total_weight": float(user_interactions["weight"].sum())
            if not user_interactions.empty
            else 0.0,
            "unique_posts": int(user_interactions["post_id"].nunique())
            if not user_interactions.empty
            else 0,
        }
    except Exception:
        logger.exception("Chẩn đoán tương tác người dùng thất bại.")
        raise HTTPException(
            status_code=500,
            detail="Không thể chẩn đoán tương tác người dùng.",
        )