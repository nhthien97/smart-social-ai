import 'package:flutter/material.dart';
import '../models/post_model.dart';
import '../models/comment_model.dart';
import '../services/post_service.dart';
import '../services/api_service.dart';

class PostProvider with ChangeNotifier {
  final PostService _postService = PostService(ApiService().dio);

  List<Post> _posts = [];
  bool _isLoading = false;
  String? _error;
  int _currentPage = 1;
  bool _hasMore = true;

  // Separate list for profile screen (avoids overwriting home feed)
  List<Post> _profilePosts = [];
  bool _profileLoading = false;
  int _profilePage = 1;
  bool _profileHasMore = true;
  int _profileTotal = 0; // tổng số bài thật từ API

  List<Post> get posts => _posts;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasMore => _hasMore;

  List<Post> get profilePosts => _profilePosts;
  bool get profileLoading => _profileLoading;
  bool get profileHasMore => _profileHasMore;
  int get profileTotal => _profileTotal;

  // Load posts
  Future<void> loadPosts({
    bool refresh = false,
    String? userId,           // userId của người đăng bài (nếu muốn lấy bài của người khác)
    bool onlyMyPosts = false, // <-- Thêm tham số mới: true = chỉ lấy bài của user đang đăng nhập
  }) async {
    if (refresh) {
      _currentPage = 1;
      _hasMore = true;
      _posts = [];
    }

    if (_isLoading || !_hasMore) return;

    try {
      await ApiService().loadToken();
      if (!ApiService().hasToken) {
        _isLoading = false;
        _error = 'Not authenticated';
        notifyListeners();
        return;
      }
    } catch (_) {
      _isLoading = false;
      _error = 'Not authenticated';
      notifyListeners();
      return;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Nếu onlyMyPosts = true → gọi endpoint lấy bài của chính user đăng nhập
      // Nếu không → gọi endpoint feed chung (có thể lọc theo userId nếu cần)
      final result = await _postService.getPosts(
        page: _currentPage,
        limit: 20,
        userId: onlyMyPosts ? null : userId,           // nếu onlyMyPosts thì backend sẽ tự hiểu lấy của user hiện tại
        onlyMyPosts: onlyMyPosts,                      // truyền thêm flag này xuống service
      );

      final List<Post> newPosts = result['posts'] as List<Post>;

      if (refresh) {
        _posts = newPosts;
      } else {
        _posts.addAll(newPosts);
      }

      _hasMore = newPosts.length >= 20;
      if (_hasMore) _currentPage++;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Clear posts and reset paging (useful on logout)
  void clearAll() {
    _posts = [];
    _isLoading = false;
    _error = null;
    _currentPage = 1;
    _hasMore = true;
    _profilePosts = [];
    _profileLoading = false;
    _profilePage = 1;
    _profileHasMore = true;
    _profileTotal = 0;
    notifyListeners();
  }

  // Create post
  Future<Post?> createPost({
    required String userId,
    String? content,
    List<String>? mediaUrls,
    String? groupId,
    String? visibility,
    List<String>? tags,
  }) async {
    try {
      final newPost = await _postService.createPost(
        userId: userId,
        content: content,
        mediaUrls: mediaUrls,
        groupId: groupId,
        visibility: visibility,
        tags: tags,
      );

      // Only add to the main feed when the post is NOT created inside a group
      if (groupId == null) {
        _posts.insert(0, newPost);
        notifyListeners();
      }

      return newPost;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  // Update post
  Future<Post?> updatePost({
    required String postId,
    String? content,
    List<String>? mediaUrls,
    String? visibility,
  }) async {
    try {
      final updated = await _postService.updatePost(
        postId,
        content: content,
        mediaUrls: mediaUrls,
        visibility: visibility,
      );
      final idx = _posts.indexWhere((p) => p.id == postId);
      if (idx != -1) {
        final old = _posts[idx];
        _posts[idx] = updated.copyWith(
          userName: old.userName,
          userAvatar: old.userAvatar,
          isLiked: old.isLiked,
        );
        notifyListeners();
      }
      return updated;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  void notifyIfNeeded() => notifyListeners();

  // Delete post
  Future<bool> deletePost(String postId) async {
    try {
      await _postService.deletePost(postId);
      _posts.removeWhere((post) => post.id == postId);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // Toggle like
  Future<void> toggleLike(String postId, String userId) async {
    try {
      // Optimistic update — cập nhật cả _posts lẫn _profilePosts
      _toggleLikeInList(_posts, postId);
      _toggleLikeInList(_profilePosts, postId);
      notifyListeners();

      // Make API call
      await _postService.toggleLike(userId: userId, postId: postId);
    } catch (e) {
      // Revert on error
      _toggleLikeInList(_posts, postId);
      _toggleLikeInList(_profilePosts, postId);
      notifyListeners();
      _error = e.toString();
    }
  }

  void _toggleLikeInList(List<Post> list, String postId) {
    final idx = list.indexWhere((p) => p.id == postId);
    if (idx != -1) {
      final post = list[idx];
      final isLiked = post.isLiked ?? false;
      list[idx] = post.copyWith(
        isLiked: !isLiked,
        likesCount: isLiked ? post.likesCount - 1 : post.likesCount + 1,
      );
    }
  }

  // Report post
  Future<bool> reportPost({
    required String reporterId,
    required String reportedPostId,
    required String reason,
    String? description,
    String? groupId,
  }) async {
    try {
      await _postService.reportPost(
        reporterId: reporterId,
        reportedPostId: reportedPostId,
        reason: reason,
        description: description,
        groupId: groupId,
      );
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // Get comments for a post
  Future<List<Comment>> getComments(String postId, {String? userId}) async {
    try {
      return await _postService.getComments(postId, userId: userId);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return [];
    }
  }

  // Create comment
  Future<Comment?> createComment({
    required String userId,
    required String postId,
    String? parentId,
    required String content,
  }) async {
    try {
      final comment = await _postService.createComment(
        userId: userId,
        postId: postId,
        parentId: parentId,
        content: content,
      );

      // Update post's comments count — cả home feed lẫn profile
      _incrementCommentCount(_posts, postId);
      _incrementCommentCount(_profilePosts, postId);
      notifyListeners();

      return comment;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  void _incrementCommentCount(List<Post> list, String postId) {
    final idx = list.indexWhere((p) => p.id == postId);
    if (idx != -1) {
      final post = list[idx];
      list[idx] = post.copyWith(commentsCount: post.commentsCount + 1);
    }
  }

  void incrementShareCount(String postId) {
    _incrementShareInList(_posts, postId);
    _incrementShareInList(_profilePosts, postId);
    notifyListeners();
  }

  void _incrementShareInList(List<Post> list, String postId) {
    final idx = list.indexWhere((p) => p.id == postId);
    if (idx != -1) {
      final post = list[idx];
      list[idx] = post.copyWith(sharesCount: post.sharesCount + 1);
    }
  }

  // Toggle comment like
  Future<void> toggleCommentLike(String commentId, String userId) async {
    try {
      await _postService.toggleLike(userId: userId, commentId: commentId);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void setPostsForProfile(List<Post> myPosts) {
    _profilePosts = myPosts;
    notifyListeners();
  }

  Future<void> loadProfilePosts(String userId, {bool refresh = false}) async {
    if (refresh) {
      _profilePage = 1;
      _profileHasMore = true;
      _profilePosts = [];
    }
    if (_profileLoading || !_profileHasMore) return;

    try {
      await ApiService().loadToken();
      if (!ApiService().hasToken) return;
    } catch (_) {
      return;
    }

    _profileLoading = true;
    notifyListeners();

    try {
      // Dùng endpoint /posts/user/:id — chỉ lấy bài của đúng user đó
      // truyền userId làm current_user_id để server trả isLiked đúng
      final result = await _postService.getUserPosts(
        userId,
        page: _profilePage,
        limit: 20,
        currentUserId: userId,
      );
      final List<Post> newPosts = result['posts'] as List<Post>;
      final int total = (result['total'] as num?)?.toInt() ?? 0;
      if (refresh) {
        _profilePosts = newPosts;
        _profileTotal = total; // lưu tổng thật từ API
      } else {
        _profilePosts.addAll(newPosts);
        // total không thay đổi khi phân trang
      }
      _profileHasMore = newPosts.length >= 20;
      if (_profileHasMore) _profilePage++;
    } catch (e) {
      _error = e.toString();
    } finally {
      _profileLoading = false;
      notifyListeners();
    }
  }

  void clearProfilePosts() {
    _profilePosts = [];
    _profilePage = 1;
    _profileHasMore = true;
    _profileLoading = false;
    _profileTotal = 0;
    notifyListeners();
  }
}
