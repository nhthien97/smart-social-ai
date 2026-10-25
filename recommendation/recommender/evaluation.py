import logging
import math
import time
from datetime import datetime, timezone

import numpy as np

from data_loader import get_db, load_interactions
from recommender.item_based import (
    _build_user_item_matrix,
    _calculate_item_similarity,
    _calculate_collaborative_scores,
    _get_interaction_weights,
)
from data_loader import load_post_tags

logger = logging.getLogger(__name__)


def _calculate_dcg(relevance: list[float]) -> float:
    """Tính Discounted Cumulative Gain."""
    return sum(
        (2**rel - 1) / math.log2(index + 2)
        for index, rel in enumerate(relevance)
    )


def _evaluate_user(
    user_id: str,
    user_weights: dict[str, float],
    similarity,
    candidate_ids: set[str],
    relevant_ids: set[str],
    k: int,
) -> tuple[int, float, float]:
    """
    Đánh giá danh sách xếp hạng cho một user.

    Bài liên quan được xác định bằng các tương tác dương trong tập kiểm thử.
    Các bài đã xuất hiện trong lịch sử huấn luyện bị loại khỏi ứng viên.
    """

    if not relevant_ids or not candidate_ids:
        return 0, 0.0, 0.0

    scores = _calculate_collaborative_scores(
        user_weights,
        similarity,
        candidate_ids,
    )

    ranked_ids = [
        post_id
        for post_id, _ in sorted(
            scores.items(),
            key=lambda item: (-item[1], item[0]),
        )[:k]
    ]

    hits = sum(1 for post_id in ranked_ids if post_id in relevant_ids)
    precision = hits / k

    relevance = [
        1.0 if post_id in relevant_ids else 0.0
        for post_id in ranked_ids
    ]

    dcg = _calculate_dcg(relevance)
    ideal_hits = min(len(relevant_ids), k)
    idcg = _calculate_dcg([1.0] * ideal_hits)
    ndcg = dcg / idcg if idcg > 0 else 0.0

    return int(hits > 0), precision, ndcg


async def evaluate_model(k: int = 10) -> dict:
    """
    Đánh giá offline bằng leave-one-out theo từng user.

    Với mỗi user, giữ lại một tương tác dương làm tập kiểm thử,
    dùng các tương tác còn lại để tạo ma trận similarity, sau đó
    kiểm tra bài được giữ lại có xuất hiện trong top-K hay không.

    Đây là đánh giá cơ bản; chưa thay thế kiểm thử theo thời gian
    hoặc đánh giá A/B trên người dùng thực.
    """

    started_at = time.perf_counter()
    evaluated_at = datetime.now(timezone.utc)

    if k < 1:
        raise ValueError("k phải lớn hơn hoặc bằng 1.")

    interactions = await load_interactions()
    post_tags = await load_post_tags()
    valid_post_ids = set(post_tags.keys())

    if interactions.empty:
        return {
            "status": "skipped",
            "k": k,
            "users_evaluated": 0,
            "total_interactions": 0,
            "metrics": {
                "hit_rate_at_k": 0.0,
                "precision_at_k": 0.0,
                "ndcg_at_k": 0.0,
            },
            "interpretation": {
                "message": "Chưa có dữ liệu tương tác để đánh giá."
            },
            "reliability": "very_low",
            "duration_seconds": round(time.perf_counter() - started_at, 4),
            "evaluated_at": evaluated_at,
        }

    interactions = interactions[
        interactions["post_id"].astype(str).isin(valid_post_ids)
    ].copy()

    if interactions.empty:
        return {
            "status": "skipped",
            "k": k,
            "users_evaluated": 0,
            "total_interactions": 0,
            "metrics": {
                "hit_rate_at_k": 0.0,
                "precision_at_k": 0.0,
                "ndcg_at_k": 0.0,
            },
            "interpretation": {
                "message": "Không có tương tác thuộc các bài viết hợp lệ."
            },
            "reliability": "very_low",
            "duration_seconds": round(time.perf_counter() - started_at, 4),
            "evaluated_at": evaluated_at,
        }

    # Chỉ chọn bài có tổng weight dương làm tương tác liên quan.
    # Tương tác report mang weight âm không được xem là positive relevance.
    positive_interactions = interactions[interactions["weight"] > 0].copy()

    if positive_interactions.empty:
        return {
            "status": "skipped",
            "k": k,
            "users_evaluated": 0,
            "total_interactions": len(interactions),
            "metrics": {
                "hit_rate_at_k": 0.0,
                "precision_at_k": 0.0,
                "ndcg_at_k": 0.0,
            },
            "interpretation": {
                "message": "Không có tương tác dương để đánh giá."
            },
            "reliability": "very_low",
            "duration_seconds": round(time.perf_counter() - started_at, 4),
            "evaluated_at": evaluated_at,
        }

    hit_rates = []
    precisions = []
    ndcgs = []
    total_test_interactions = 0

    for user_id, user_rows in positive_interactions.groupby("user_id"):
        user_id = str(user_id)

        # Chọn bài kiểm thử có trọng số dương cao nhất.
        user_rows = user_rows.sort_values(
            ["weight", "post_id"],
            ascending=[False, True],
        )

        test_row = user_rows.iloc[0]
        test_post_id = str(test_row["post_id"])

        # Tập train loại bỏ tương tác user-post được giữ lại.
        train_rows = interactions[
            ~(
                (interactions["user_id"].astype(str) == user_id)
                & (interactions["post_id"].astype(str) == test_post_id)
            )
        ].copy()

        if train_rows.empty:
            continue

        matrix = _build_user_item_matrix(train_rows)
        if matrix.empty or matrix.shape[1] < 2:
            continue

        similarity = _calculate_item_similarity(matrix)
        user_weights = _get_interaction_weights(train_rows, user_id)

        if not user_weights:
            continue

        candidate_ids = valid_post_ids - set(user_weights.keys())
        relevant_ids = {test_post_id}

        # Nếu bài kiểm thử đã nằm trong lịch sử train do nhiều interaction
        # cùng bài, không đánh giá trường hợp này để tránh leakage.
        if test_post_id in user_weights:
            continue

        hit, precision, ndcg = _evaluate_user(
            user_id=user_id,
            user_weights=user_weights,
            similarity=similarity,
            candidate_ids=candidate_ids,
            relevant_ids=relevant_ids,
            k=k,
        )

        hit_rates.append(float(hit))
        precisions.append(float(precision))
        ndcgs.append(float(ndcg))
        total_test_interactions += 1

    users_evaluated = len(hit_rates)

    if users_evaluated == 0:
        metrics = {
            "hit_rate_at_k": 0.0,
            "precision_at_k": 0.0,
            "ndcg_at_k": 0.0,
        }
        reliability = "very_low"
        message = (
            "Không đủ lịch sử tương tác cho phép đánh giá leave-one-out."
        )
    else:
        metrics = {
            "hit_rate_at_k": float(np.mean(hit_rates)),
            "precision_at_k": float(np.mean(precisions)),
            "ndcg_at_k": float(np.mean(ndcgs)),
        }

        if users_evaluated >= 100:
            reliability = "high"
        elif users_evaluated >= 30:
            reliability = "medium"
        elif users_evaluated >= 10:
            reliability = "low"
        else:
            reliability = "very_low"

        message = (
            f"Đánh giá trên {users_evaluated} người dùng. "
            "Kết quả phản ánh dữ liệu lịch sử, không đảm bảo hiệu quả online."
        )

    return {
        "status": "ok" if users_evaluated else "skipped",
        "k": k,
        "users_evaluated": users_evaluated,
        "total_interactions": int(total_test_interactions),
        "metrics": metrics,
        "interpretation": {
            "hit_rate_at_k": (
                "Tỷ lệ người dùng có bài kiểm thử trong top-K."
            ),
            "precision_at_k": (
                "Số bài liên quan trong top-K chia cho K."
            ),
            "ndcg_at_k": (
                "Đánh giá vị trí xếp hạng của bài liên quan."
            ),
            "message": message,
        },
        "reliability": reliability,
        "duration_seconds": round(time.perf_counter() - started_at, 4),
        "evaluated_at": evaluated_at,
    }
