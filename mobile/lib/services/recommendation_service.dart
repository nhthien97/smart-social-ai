// lib/services/recommendation_service.dart
// Gọi trực tiếp tới ML Server (FastAPI) để lấy gợi ý bài viết

import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../models/post_model.dart';

/// Một mục gợi ý trả về từ ML server
class RecommendedItem {
  final String postId;
  final double score;
  final String? reasonTag;
  final String? reasonText;
  final int rank;

  const RecommendedItem({
    required this.postId,
    required this.score,
    this.reasonTag,
    this.reasonText,
    required this.rank,
  });

  factory RecommendedItem.fromJson(Map<String, dynamic> json) {
    return RecommendedItem(
      postId: json['post_id'] as String,
      score: (json['score'] as num).toDouble(),
      reasonTag: json['reason_tag'] as String?,
      reasonText: json['reason_text'] as String?,
      rank: json['rank'] as int,
    );
  }
}

class RecommendationService {
  /// Dio dùng cho ML server – không cần auth header
  final Dio _mlDio = Dio(
    BaseOptions(
      baseUrl: AppConfig.mlBaseUrl,
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 15),
    ),
  );

  /// Dio dùng cho NestJS API – cần token (truyền vào từ ApiService.dio)
  final Dio _apiDio;

  RecommendationService(this._apiDio);

  // ── Gợi ý bài viết từ ML server ──────────────────────────────────────────

  /// Trả về raw list từ ML server (post_id + score + reason)
  /// source: "hybrid" | "popular"
  Future<({List<RecommendedItem> items, String source})> getRecommendedItems(
    String userId,
  ) async {
    final response = await _mlDio.get('/recommend/$userId');
    final data = response.data as Map<String, dynamic>;
    final rawList = (data['recommendations'] as List?) ?? [];
    final items = rawList
        .map((e) => RecommendedItem.fromJson(e as Map<String, dynamic>))
        .toList();
    final source = data['source'] as String? ?? 'popular';
    return (items: items, source: source);
  }

  /// Fetch full Post data cho danh sách post_id từ NestJS API
  /// Dùng Future.wait để gọi song song – bỏ qua ID không hợp lệ / post đã xóa
  Future<List<Post>> fetchPostsByIds(
    List<String> postIds, {
    String? currentUserId,
  }) async {
    if (postIds.isEmpty) return [];

    final results = await Future.wait(
      postIds.map((id) async {
        // Chỉ gọi với ObjectId 24 ký tự hex hợp lệ
        if (!RegExp(r'^[a-f\d]{24}$', caseSensitive: false).hasMatch(id)) {
          return null;
        }
        try {
          final res = await _apiDio.get(
            '/posts/$id',
            queryParameters:
                currentUserId != null ? {'user_id': currentUserId} : null,
          );
          final post = Post.fromJson(res.data);
          return post.status == 'deleted' ? null : post;
        } catch (_) {
          return null;
        }
      }),
    );
    return results.whereType<Post>().toList();
  }

  // ── Health check ──────────────────────────────────────────────────────────

  Future<bool> isHealthy() async {
    try {
      final res = await _mlDio
          .get('/health')
          .timeout(const Duration(seconds: 4));
      return res.data['status'] == 'ok';
    } catch (_) {
      return false;
    }
  }
}
