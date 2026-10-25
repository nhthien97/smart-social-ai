
from typing import Optional


def build_tag_profile(
    user_interactions: dict[str, float],
    post_tags: dict[str, list[str]],
) -> dict[str, float]:
    """
    Xây dựng hồ sơ sở thích tag từ lịch sử tương tác.

    user_interactions:
        {post_id: tổng trọng số tương tác}

    post_tags:
        {post_id: danh sách tag của bài viết}

    Trọng số âm được giữ lại để phản ánh phản hồi tiêu cực.
    """

    profile: dict[str, float] = {}

    for post_id, weight in user_interactions.items():
        try:
            numeric_weight = float(weight)
        except (TypeError, ValueError):
            continue

        if numeric_weight == 0:
            continue

        tags = post_tags.get(str(post_id), [])

        for tag in tags:
            if not isinstance(tag, str):
                continue

            normalized_tag = tag.strip()
            if not normalized_tag:
                continue

            profile[normalized_tag] = (
                profile.get(normalized_tag, 0.0) + numeric_weight
            )

    return profile


def compute_content_scores(
    user_interactions: dict[str, float],
    post_tags: dict[str, list[str]],
    interacted_ids: set[str],
) -> dict[str, float]:
    """
    Tính điểm content-based cho bài chưa tương tác.

    Chuẩn hóa theo tổng trị tuyệt đối của điểm tag để tránh chia cho
    tổng bằng 0 hoặc tổng âm. Điểm tag âm không tạo ra điểm đề xuất
    dương; chỉ giữ các ứng viên có điểm content dương.
    """

    tag_profile = build_tag_profile(user_interactions, post_tags)

    if not tag_profile:
        return {}

    normalization_factor = sum(abs(score) for score in tag_profile.values())

    if normalization_factor == 0:
        return {}

    normalized_profile = {
        tag: score / normalization_factor
        for tag, score in tag_profile.items()
    }

    normalized_interacted_ids = {str(post_id) for post_id in interacted_ids}
    scores: dict[str, float] = {}

    for post_id, tags in post_tags.items():
        normalized_post_id = str(post_id)

        if normalized_post_id in normalized_interacted_ids:
            continue

        if not tags:
            continue

        score = sum(
            normalized_profile.get(tag.strip(), 0.0)
            for tag in tags
            if isinstance(tag, str) and tag.strip()
        )

        if score > 0:
            scores[normalized_post_id] = float(score)

    return scores


def get_best_matching_tag(
    post_tags_list: list[str],
    tag_profile: dict[str, float],
) -> Optional[str]:
    """
    Trả về tag có điểm sở thích cao nhất trong bài viết.

    Nếu không có tag phù hợp với sở thích dương, trả về None.
    """

    best_tag: Optional[str] = None
    best_score = 0.0

    for tag in post_tags_list:
        if not isinstance(tag, str):
            continue

        normalized_tag = tag.strip()
        if not normalized_tag:
            continue

        score = float(tag_profile.get(normalized_tag, 0.0))

        if score > best_score:
            best_score = score
            best_tag = normalized_tag

    return best_tag
