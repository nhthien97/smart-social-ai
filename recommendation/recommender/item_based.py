import logging
import os
import time
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

from data_loader import (
    get_db,
    load_interactions,
    load_post_tags,
    load_popular_post_ids,
)
from recommender.content_based import (
    build_tag_profile,
    compute_content_scores,
    get_best_matching_tag,
)

logger = logging.getLogger(__name__)

TOP_N_SIMILAR = int(os.getenv("TOP_N_SIMILAR", "10"))
TOP_N_RECOMMENDATIONS = int(os.getenv("TOP_N_RECOMMENDATIONS", "20"))
MIN_INTERACTIONS = int(os.getenv("MIN_INTERACTIONS", "2"))
RECOMMEND_EXPIRES_HOURS = int(os.getenv("RECOMMEND_EXPIRES_HOURS", "6"))
CONTENT_WEIGHT = float(os.getenv("CONTENT_WEIGHT", "0.3"))


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _to_python_number(value) -> float:
    """Đưa giá trị số về float Python để tương thích MongoDB/Pydantic."""
    number = float(value)
    return number if np.isfinite(number) else 0.0


def _build_user_item_matrix(
    interactions: pd.DataFrame,
) -> pd.DataFrame:
    """Tạo ma trận user-item từ tổng trọng số tương tác."""

    if interactions.empty:
        return pd.DataFrame()

    required = {"user_id", "post_id", "weight"}
    if not required.issubset(interactions.columns):
        raise ValueError(
            f"DataFrame interactions thiếu cột: {required - set(interactions.columns)}"
        )

    matrix = interactions.pivot_table(
        index="user_id",
        columns="post_id",
        values="weight",
        aggfunc="sum",
        fill_value=0,
    )

    return matrix.astype(float)


def _calculate_item_similarity(
    matrix: pd.DataFrame,
) -> pd.DataFrame:
    """Tính cosine similarity giữa các bài viết."""

    if matrix.empty or matrix.shape[1] == 0:
        return pd.DataFrame()

    values = matrix.to_numpy(dtype=float)
    values = np.nan_to_num(values, nan=0.0, posinf=0.0, neginf=0.0)

    similarities = cosine_similarity(values.T)
    similarities = np.nan_to_num(
        similarities,
        nan=0.0,
        posinf=0.0,
        neginf=0.0,
    )

    return pd.DataFrame(
        similarities,
        index=matrix.columns,
        columns=matrix.columns,
    )


def _get_interaction_weights(
    interactions: pd.DataFrame,
    user_id: str,
) -> dict[str, float]:
    """Lấy tổng trọng số tương tác của một user theo từng bài viết."""

    if interactions.empty:
        return {}

    user_rows = interactions[
        interactions["user_id"].astype(str) == str(user_id)
    ]

    if user_rows.empty:
        return {}

    grouped = user_rows.groupby("post_id")["weight"].sum()

    return {
        str(post_id): _to_python_number(weight)
        for post_id, weight in grouped.items()
    }


def _calculate_collaborative_scores(
    user_weights: dict[str, float],
    similarity: pd.DataFrame,
    candidate_ids: set[str],
) -> dict[str, float]:
    """
    Tính điểm CF bằng tổng similarity nhân trọng số tương tác.

    Tương tác report mang trọng số âm nên có thể làm giảm điểm bài tương tự.
    """

    if not user_weights or similarity.empty:
        return {}

    scores: dict[str, float] = {}

    for candidate_id in candidate_ids:
        if candidate_id not in similarity.columns:
            continue

        score = 0.0

        for interacted_id, weight in user_weights.items():
            if interacted_id not in similarity.index:
                continue

            similarity_score = float(
                similarity.loc[interacted_id, candidate_id]
            )

            score += similarity_score * weight

        if np.isfinite(score) and score > 0:
            scores[candidate_id] = float(score)

    return scores


def _normalize_scores(scores: dict[str, float]) -> dict[str, float]:
    """Chuẩn hóa điểm dương về khoảng 0–1."""

    if not scores:
        return {}

    maximum = max(scores.values())

    if maximum <= 0 or not np.isfinite(maximum):
        return {}

    return {
        post_id: float(score / maximum)
        for post_id, score in scores.items()
        if np.isfinite(score) and score > 0
    }


async def _save_similarity(
    similarity: pd.DataFrame,
) -> int:
    """Ghi ma trận tương đồng vào item_similarity."""

    db = get_db()
    collection = db["item_similarity"]
    now = _utc_now()
    documents = []

    if not similarity.empty:
        post_ids = [str(post_id) for post_id in similarity.columns]

        for index, post_id_a in enumerate(post_ids):
            for post_id_b in post_ids[index + 1:]:
                if (
                    post_id_a not in similarity.index
                    or post_id_b not in similarity.columns
                ):
                    continue

                score = float(similarity.loc[post_id_a, post_id_b])

                if not np.isfinite(score) or score <= 0:
                    continue

                documents.append({
                    "post_id_a": post_id_a,
                    "post_id_b": post_id_b,
                    "score": score,
                    "based_on": "interactions",
                    "computed_at": now,
                })

    await collection.delete_many({})

    if documents:
        await collection.insert_many(documents)

    return len(documents)


async def _save_recommendations(
    interactions: pd.DataFrame,
    similarity: pd.DataFrame,
    post_tags: dict[str, list[str]],
) -> int:
    """Tạo và lưu danh sách gợi ý đã huấn luyện cho từng user."""

    db = get_db()
    collection = db["user_recommendations"]
    now = _utc_now()
    expires_at = now + timedelta(hours=RECOMMEND_EXPIRES_HOURS)

    valid_post_ids = set(post_tags.keys())

    # Chỉ đề xuất bài thuộc tập bài active, ngoài nhóm.
    all_user_ids = (
        interactions["user_id"].dropna().astype(str).unique().tolist()
        if not interactions.empty
        else []
    )

    documents = []

    for user_id in all_user_ids:
        user_weights = _get_interaction_weights(interactions, user_id)

        if not user_weights:
            continue

        # Loại mọi bài user đã tương tác, kể cả report.
        interacted_ids = set(user_weights.keys())
        candidate_ids = valid_post_ids - interacted_ids

        if not candidate_ids:
            continue

        collaborative_scores = _calculate_collaborative_scores(
            user_weights,
            similarity,
            candidate_ids,
        )

        content_scores = compute_content_scores(
            user_weights,
            post_tags,
            interacted_ids,
        )

        normalized_cf = _normalize_scores(collaborative_scores)
        normalized_cb = _normalize_scores({
            post_id: score
            for post_id, score in content_scores.items()
            if post_id in candidate_ids
        })

        combined_ids = set(normalized_cf) | set(normalized_cb)
        if not combined_ids:
            continue

        combined_scores = {}

        for post_id in combined_ids:
            cf_score = normalized_cf.get(post_id, 0.0)
            cb_score = normalized_cb.get(post_id, 0.0)

            combined_score = (
                (1.0 - CONTENT_WEIGHT) * cf_score
                + CONTENT_WEIGHT * cb_score
            )

            if combined_score > 0 and np.isfinite(combined_score):
                combined_scores[post_id] = float(combined_score)

        ranked = sorted(
            combined_scores.items(),
            key=lambda item: (-item[1], item[0]),
        )[:TOP_N_RECOMMENDATIONS]

        tag_profile = build_tag_profile(user_weights, post_tags)

        for rank, (post_id, score) in enumerate(ranked, start=1):
            reason_tag = get_best_matching_tag(
                post_tags.get(post_id, []),
                tag_profile,
            )

            reason_text = (
                f"Vì bạn quan tâm đến {reason_tag}"
                if reason_tag
                else None
            )

            documents.append({
                "user_id": str(user_id),
                "post_id": str(post_id),
                "score": float(score),
                "reason_tag": reason_tag,
                "reason_text": reason_text,
                "rank": rank,
                "generated_at": now,
                "expires_at": expires_at,
            })

    # Xóa cache cũ trước khi ghi lại để tránh dùng gợi ý đã hết hạn
    # hoặc giữ dữ liệu cũ khi lần huấn luyện mới không tạo ra kết quả.
    await collection.delete_many({})

    if documents:
        await collection.insert_many(documents)

    return len(documents)


async def train_and_save() -> dict:
    """Huấn luyện item-based CF kết hợp content-based và lưu vào MongoDB."""

    started_at = time.perf_counter()
    trained_at = _utc_now()

    interactions = await load_interactions()

    if interactions.empty or len(interactions) < MIN_INTERACTIONS:
        return {
            "status": "skipped",
            "interactions_used": len(interactions),
            "posts_covered": 0,
            "users_covered": 0,
            "duration_seconds": round(time.perf_counter() - started_at, 4),
            "trained_at": trained_at,
            "message": "Không đủ dữ liệu tương tác để huấn luyện.",
        }

    post_tags = await load_post_tags()
    valid_post_ids = set(post_tags.keys())

    # Chỉ dùng tương tác của các bài đang hợp lệ trong News Feed.
    training_interactions = interactions[
        interactions["post_id"].astype(str).isin(valid_post_ids)
    ].copy()

    if training_interactions.empty:
        return {
            "status": "skipped",
            "interactions_used": 0,
            "posts_covered": len(valid_post_ids),
            "users_covered": 0,
            "duration_seconds": round(time.perf_counter() - started_at, 4),
            "trained_at": trained_at,
            "message": "Không có tương tác thuộc các bài viết hợp lệ.",
        }

    matrix = _build_user_item_matrix(training_interactions)
    similarity = _calculate_item_similarity(matrix)

    similarity_count = await _save_similarity(similarity)
    recommendation_count = await _save_recommendations(
        training_interactions,
        similarity,
        post_tags,
    )

    duration = round(time.perf_counter() - started_at, 4)

    return {
        "status": "ok",
        "interactions_used": len(training_interactions),
        "posts_covered": len(matrix.columns),
        "users_covered": len(matrix.index),
        "duration_seconds": duration,
        "trained_at": trained_at,
        "message": (
            f"Huấn luyện hoàn tất: {similarity_count} cặp bài tương đồng, "
            f"{recommendation_count} gợi ý đã lưu."
        ),
    }


async def get_recommendations_for_user(user_id: str) -> dict:
    """Đọc cache gợi ý hoặc fallback sang bài phổ biến."""

    db = get_db()
    now = _utc_now()

    cursor = db["user_recommendations"].find(
        {
            "user_id": str(user_id),
            "expires_at": {"$gt": now},
        },
        {
            "_id": 0,
            "post_id": 1,
            "score": 1,
            "reason_tag": 1,
            "reason_text": 1,
            "rank": 1,
        },
    ).sort("rank", 1)

    cached = await cursor.to_list(length=TOP_N_RECOMMENDATIONS)

    if cached:
        return {
            "user_id": str(user_id),
            "recommendations": cached,
            "generated_at": now,
            "source": "hybrid",
        }

    interactions = await load_interactions()
    user_weights = _get_interaction_weights(interactions, str(user_id))
    interacted_ids = set(user_weights.keys())

    popular_ids = await load_popular_post_ids(
        limit=TOP_N_RECOMMENDATIONS * 3
    )

    recommendations = []
    for post_id in popular_ids:
        if post_id in interacted_ids:
            continue

        recommendations.append({
            "post_id": post_id,
            "score": 0.0,
            "reason_tag": None,
            "reason_text": None,
            "rank": len(recommendations) + 1,
        })

        if len(recommendations) >= TOP_N_RECOMMENDATIONS:
            break

    return {
        "user_id": str(user_id),
        "recommendations": recommendations,
        "generated_at": now,
        "source": "popular",
    }


async def get_similar_posts(post_id: str) -> dict:
    """Lấy bài tương tự theo matrix đã lưu, fallback bằng tag Jaccard."""

    db = get_db()
    limit = TOP_N_SIMILAR

    cursor = db["item_similarity"].find(
        {
            "$or": [
                {"post_id_a": str(post_id)},
                {"post_id_b": str(post_id)},
            ]
        },
        {"_id": 0, "post_id_a": 1, "post_id_b": 1, "score": 1, "based_on": 1},
    ).sort("score", -1).limit(limit)

    documents = await cursor.to_list(length=limit)
    similar_posts = []

    for document in documents:
        other_id = (
            document["post_id_b"]
            if document["post_id_a"] == str(post_id)
            else document["post_id_a"]
        )

        similar_posts.append({
            "post_id_b": str(other_id),
            "score": float(document["score"]),
            "based_on": document.get("based_on", "interactions"),
        })

    if similar_posts:
        return {
            "post_id": str(post_id),
            "similar_posts": similar_posts,
        }

    posts = await load_post_tags()
    source_tags = set(posts.get(str(post_id), []))

    if not source_tags:
        return {"post_id": str(post_id), "similar_posts": []}

    fallback = []
    for candidate_id, candidate_tags in posts.items():
        if candidate_id == str(post_id):
            continue

        candidate_tag_set = set(candidate_tags)
        union = source_tags | candidate_tag_set

        if not union:
            continue

        score = len(source_tags & candidate_tag_set) / len(union)

        if score > 0:
            fallback.append({
                "post_id_b": candidate_id,
                "score": float(score),
                "based_on": "tags",
            })

    fallback.sort(key=lambda item: (-item["score"], item["post_id_b"]))

    return {
        "post_id": str(post_id),
        "similar_posts": fallback[:limit],
    }
