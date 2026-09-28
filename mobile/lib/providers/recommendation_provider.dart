// lib/providers/recommendation_provider.dart

import 'package:flutter/material.dart';
import '../models/post_model.dart';
import '../services/api_service.dart';
import '../services/recommendation_service.dart';

class RecommendationProvider with ChangeNotifier {
  late final RecommendationService _service;

  RecommendationProvider()
      : _service = RecommendationService(ApiService().dio);

  // ── State ─────────────────────────────────────────────────────────────────

  List<Post> _posts = [];
  List<RecommendedItem> _rawItems = [];
  String _source = '';        // "hybrid" | "popular"
  bool _isLoading = false;
  bool _serverDown = false;   // ML server không phản hồi
  String? _error;

  // ── Getters ───────────────────────────────────────────────────────────────

  List<Post> get posts => _posts;
  String get source => _source;
  bool get isLoading => _isLoading;
  bool get serverDown => _serverDown;
  String? get error => _error;
  bool get hasRecommendations => _posts.isNotEmpty;
  /// true khi ML server đã chạy hybrid model (CF + Content-Based)
  bool get isHybrid => _source == 'hybrid';

  /// Trả về lý do gợi ý cho một post_id
  String reasonFor(String postId) {
    try {
      final item = _rawItems.firstWhere((i) => i.postId == postId);
      return item.reasonText ?? 'Dành cho bạn';
    } catch (_) {
      return 'Dành cho bạn';
    }
  }

  String? reasonTagFor(String postId) {
    try {
      return _rawItems.firstWhere((i) => i.postId == postId).reasonTag;
    } catch (_) {
      return null;
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  Future<void> loadRecommendations(String userId) async {
    if (_isLoading) return;
    _isLoading = true;
    _error = null;
    _serverDown = false;
    notifyListeners();

    try {
      final (:items, :source) =
          await _service.getRecommendedItems(userId);

      _rawItems = items;
      _source = source;

      final postIds = items.map((i) => i.postId).toList();
      _posts = await _service.fetchPostsByIds(postIds, currentUserId: userId);
    } catch (e) {
      // ML server offline hoặc network error
      // Giữ lại _posts cũ nếu đã tải được trước, tránh mất gợi ý khi reload
      _serverDown = _posts.isEmpty;
      debugPrint('[ML] Recommendation error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refresh(String userId) async {
    _posts = [];
    _rawItems = [];
    notifyListeners();
    await loadRecommendations(userId);
  }

  void clear() {
    _posts = [];
    _rawItems = [];
    _source = '';
    _isLoading = false;
    _serverDown = false;
    _error = null;
    notifyListeners();
  }
}
