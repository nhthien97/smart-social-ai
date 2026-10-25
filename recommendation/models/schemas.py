from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class InteractionRecord(BaseModel):
    """Ánh xạ từ collection user_interactions trong MongoDB"""
    user_id: str
    post_id: str
    interaction_type: str   # view | like | comment | share | save | report
    weight: int
    duration_ms: Optional[int] = None
    created_at: Optional[datetime] = None


class SimilarItem(BaseModel):
    """Một cặp post tương tự"""
    post_id_b: str
    score: float
    based_on: str            # interactions | tags | hybrid


class RecommendedPost(BaseModel):
    """Một bài viết được gợi ý cho user"""
    post_id: str
    score: float
    reason_tag: Optional[str] = None
    reason_text: Optional[str] = None
    rank: int


class RecommendResponse(BaseModel):
    user_id: str
    recommendations: list[RecommendedPost]
    generated_at: datetime
    source: str               # hybrid | popular


class SimilarResponse(BaseModel):
    post_id: str
    similar_posts: list[SimilarItem]


class TrainStatus(BaseModel):
    status: str               # ok | error
    interactions_used: int
    posts_covered: int
    users_covered: int
    duration_seconds: float
    trained_at: datetime
    message: str


class EvaluationMetrics(BaseModel):
    hit_rate_at_k: float
    precision_at_k: float
    ndcg_at_k: float


class EvaluateResponse(BaseModel):
    status: str
    k: int
    users_evaluated: int
    total_interactions: int
    metrics: EvaluationMetrics
    interpretation: dict
    reliability: str
    duration_seconds: float
    evaluated_at: datetime