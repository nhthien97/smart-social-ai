// src/services/ml.service.ts
// Gọi trực tiếp tới ML server (FastAPI) — không qua NestJS

const ML_URL = process.env.NEXT_PUBLIC_ML_URL ?? 'http://localhost:8000'

export interface MLHealth {
  status: string
  timestamp: string
}

export interface MLStats {
  total_interactions: number
  unique_users: number
  unique_posts: number
}

export interface MLEvalMetrics {
  hit_rate_at_k: number
  precision_at_k: number
  ndcg_at_k: number
}

export interface MLEvalResult {
  status: string
  k: number
  users_evaluated: number
  total_interactions: number
  metrics: MLEvalMetrics
  interpretation: {
    hit_rate: string
    ndcg: string
    verdict: string
  }
  reliability: string
  duration_seconds: number
  evaluated_at: string
  message?: string
}

export interface MLTrainResult {
  status: string
  interactions_used: number
  posts_covered: number
  users_covered: number
  duration_seconds: number
  trained_at: string
  message: string
}

export interface MLRecommendedPost {
  post_id: string
  score: number
  reason_tag: string | null
  reason_text: string | null
  rank: number
}

export interface MLRecommendResponse {
  user_id: string
  recommendations: MLRecommendedPost[]
  generated_at: string
  source: 'hybrid' | 'popular'
}

export interface MLSimilarItem {
  post_id_b: string
  score: number
  based_on: string
}

export interface MLSimilarResponse {
  post_id: string
  similar_posts: MLSimilarItem[]
}

async function mlFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${ML_URL}${path}`, {
    cache: 'no-store',
    ...options,
  })
  if (!res.ok) throw new Error(`ML server error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

export const mlService = {
  health: () => mlFetch<MLHealth>('/health'),
  stats: () => mlFetch<MLStats>('/interactions/stats'),
  evaluate: (k = 10) => mlFetch<MLEvalResult>(`/evaluate?k=${k}`),
  train: () => mlFetch<MLTrainResult>('/train', { method: 'POST' }),
  recommend: (userId: string) => mlFetch<MLRecommendResponse>(`/recommend/${encodeURIComponent(userId)}`),
  similar: (postId: string) => mlFetch<MLSimilarResponse>(`/similar/${encodeURIComponent(postId)}`),
}
