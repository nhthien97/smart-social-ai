import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../models/post_model.dart';
import '../models/comment_model.dart';

class PostService {
  final Dio _dio;
  static const String baseUrl = '${AppConfig.apiBaseUrl}';

  PostService(this._dio);

  // Posts
  Future<Map<String, dynamic>> getPosts({
    int page = 1,
    int limit = 20,
    String? userId,
    bool onlyMyPosts = false,   // <-- Thêm flag
  }) async {
    try {
      final query = {
        'page': page,
        'limit': limit,
        if (onlyMyPosts) 'my_posts': 'true',
        if (userId != null && !onlyMyPosts) 'user_id': userId,
      };

      final response = await _dio.get(
        '$baseUrl/posts',
        queryParameters: query,
      );

      final posts = (response.data['posts'] as List)
          .map((post) => Post.fromJson(post))
          .where((post) => post.status != 'deleted')
          .toList();

      return {
        'posts': posts,
        'total': response.data['total'],
      };
    } catch (e) {
      throw Exception('Failed to load posts: $e');
    }
  }

  Future<Map<String, dynamic>> getUserPosts(String userId, {int page = 1, int limit = 20, String? currentUserId}) async {
    try {
      final response = await _dio.get(
        '$baseUrl/posts/user/$userId',
        queryParameters: {
          'page': page,
          'limit': limit,
          if (currentUserId != null) 'current_user_id': currentUserId,
        },
      );
      
      final posts = (response.data['posts'] as List)
          .map((post) => Post.fromJson(post))
          .where((post) => post.status != 'deleted')
          .toList();
      
      return {
        'posts': posts,
        'total': response.data['total'],
      };
    } catch (e) {
      throw Exception('Failed to load user posts: $e');
    }
  }

  Future<Post> getPost(String postId) async {
    try {
      final response = await _dio.get('$baseUrl/posts/$postId');
      return Post.fromJson(response.data);
    } catch (e) {
      throw Exception('Failed to load post: $e');
    }
  }

  Future<Post> createPost({
    required String userId,
    String? content,
    List<String>? mediaUrls,
    String? groupId,
    String? visibility, // 'public', 'friends', 'private'
    List<String>? tags,
  }) async {
    try {
      final response = await _dio.post(
        '$baseUrl/posts',
        data: {
          'user_id': userId,
          if (groupId != null) 'group_id': groupId,
          if (content != null) 'content': content,
          if (mediaUrls != null && mediaUrls.isNotEmpty) 'media_urls': mediaUrls,
          'content_type': mediaUrls != null && mediaUrls.isNotEmpty ? 'image' : 'text',
          'visibility': visibility ?? 'public',
          if (tags != null && tags.isNotEmpty) 'tags': tags,
        },
      );
      return Post.fromJson(response.data);
    } catch (e) {
      throw Exception('Failed to create post: $e');
    }
  }

  /// Lấy danh sách categories (grouped) để hiển thị tag selector
  Future<List<Map<String, dynamic>>> getCategories() async {
    try {
      final response = await _dio.get('$baseUrl/categories');
      return List<Map<String, dynamic>>.from(response.data);
    } catch (e) {
      throw Exception('Failed to load categories: $e');
    }
  }

  Future<Post> updatePost(String postId, {String? content, List<String>? mediaUrls, String? visibility}) async {
    try {
      final response = await _dio.patch(
        '$baseUrl/posts/$postId',
        data: {
          if (content != null) 'content': content,
          if (mediaUrls != null) 'media_urls': mediaUrls,
          if (visibility != null) 'visibility': visibility,
        },
      );
      return Post.fromJson(response.data);
    } catch (e) {
      throw Exception('Failed to update post: $e');
    }
  }

  Future<void> deletePost(String postId) async {
    try {
      await _dio.delete('$baseUrl/posts/$postId');
    } catch (e) {
      throw Exception('Failed to delete post: $e');
    }
  }

  // Comments
  Future<List<Comment>> getComments(String postId, {String? userId}) async {
    try {
      final response = await _dio.get(
        '$baseUrl/comments/post/$postId',
        queryParameters: {
          if (userId != null) 'user_id': userId,
        },
      );
      return (response.data as List)
          .map((comment) => Comment.fromJson(comment))
          .toList();
    } catch (e) {
      throw Exception('Failed to load comments: $e');
    }
  }

  Future<List<Comment>> getReplies(String parentId, {String? userId}) async {
    try {
      final response = await _dio.get(
        '$baseUrl/comments/replies/$parentId',
        queryParameters: {
          if (userId != null) 'user_id': userId,
        },
      );
      return (response.data as List)
          .map((comment) => Comment.fromJson(comment))
          .toList();
    } catch (e) {
      throw Exception('Failed to load replies: $e');
    }
  }

  Future<Comment> createComment({
    required String userId,
    required String postId,
    String? parentId,
    required String content,
  }) async {
    try {
      final response = await _dio.post(
        '$baseUrl/comments',
        data: {
          'user_id': userId,
          'post_id': postId,
          if (parentId != null) 'parent_id': parentId,
          'content': content,
        },
      );
      return Comment.fromJson(response.data);
    } catch (e) {
      throw Exception('Failed to create comment: $e');
    }
  }

  Future<void> deleteComment(String commentId) async {
    try {
      await _dio.delete('$baseUrl/comments/$commentId');
    } catch (e) {
      throw Exception('Failed to delete comment: $e');
    }
  }

  // Likes
  Future<Map<String, dynamic>> toggleLike({
    required String userId,
    String? postId,
    String? commentId,
  }) async {
    try {
      final response = await _dio.post(
        '$baseUrl/likes/toggle',
        data: {
          'user_id': userId,
          if (postId != null) 'post_id': postId,
          if (commentId != null) 'comment_id': commentId,
        },
      );
      return response.data;
    } catch (e) {
      throw Exception('Failed to toggle like: $e');
    }
  }

  Future<bool> checkLike({
    required String userId,
    String? postId,
    String? commentId,
  }) async {
    try {
      final response = await _dio.get(
        '$baseUrl/likes/check',
        queryParameters: {
          'user_id': userId,
          if (postId != null) 'post_id': postId,
          if (commentId != null) 'comment_id': commentId,
        },
      );
      return response.data as bool;
    } catch (e) {
      return false;
    }
  }

  // Reports
  Future<void> reportPost({
    required String reporterId,
    required String reportedPostId,
    required String reason,
    String? description,
    String? groupId,
  }) async {
    try {
      await _dio.post(
        '$baseUrl/reports',
        data: {
          'reporter_id': reporterId,
          'reported_post_id': reportedPostId,
          'type': 'post',
          'reason': reason,
          if (description != null) 'description': description,
          if (groupId != null) 'group_id': groupId,
        },
      );
    } catch (e) {
      throw Exception('Failed to report post: $e');
    }
  }
}
