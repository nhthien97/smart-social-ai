// lib/providers/group_provider.dart

import 'package:flutter/material.dart';
import '../models/group_model.dart';
import '../models/post_model.dart';
import '../services/group_service.dart';
import '../services/config_service.dart';
import '../services/post_service.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class GroupProvider with ChangeNotifier {
  final GroupService _groupService = GroupService();
  final PostService _postService = PostService(ApiService().dio);

  List<GroupModel> _myGroups = [];
  List<GroupModel> _suggestedGroups = [];
  GroupModel? _currentGroup;
  List<Map<String, dynamic>> _groupMembers = [];
  List<Map<String, dynamic>> _pendingMembers = [];
  String? _currentUserRole;

  final Map<String, List<Post>> _groupPosts = {};
  List<Post> _pendingPosts = [];
  bool _isLoadingPendingPosts = false;
  List<Post> _myPendingPosts = [];
  bool _isLoadingMyPendingPosts = false;
  bool _isPendingJoinForCurrentGroup = false;

  bool _isLoading = false;
  bool _isLoadingPosts = false;
  String? _errorMessage;

  List<GroupModel> get myGroups => _myGroups;
  List<GroupModel> get suggestedGroups => _suggestedGroups;
  GroupModel? get currentGroup => _currentGroup;
  List<Map<String, dynamic>> get groupMembers => _groupMembers;
  List<Map<String, dynamic>> get pendingMembers => _pendingMembers;
  String? get currentUserRole => _currentUserRole;
  bool get isLoading => _isLoading;
  bool get isLoadingPosts => _isLoadingPosts;
  bool get isLoadingPendingPosts => _isLoadingPendingPosts;
  List<Post> get pendingPosts => _pendingPosts;
  List<Post> get myPendingPosts => _myPendingPosts;
  bool get isLoadingMyPendingPosts => _isLoadingMyPendingPosts;
  bool get isPendingJoinForCurrentGroup => _isPendingJoinForCurrentGroup;
  String? get errorMessage => _errorMessage;

  bool get isCurrentUserAdmin =>
      _currentUserRole != null &&
          _currentUserRole!.toUpperCase() == 'ADMIN';

  bool get isCurrentUserModerator =>
      _currentUserRole != null &&
          _currentUserRole!.toUpperCase() == 'MODERATOR';

  bool get isCurrentUserAdminOrModerator =>
      isCurrentUserAdmin || isCurrentUserModerator;

  /// Cho phép cập nhật role cục bộ (vd: sau khi chuyển quyền trưởng nhóm)
  void setCurrentUserRole(String role) {
    _currentUserRole = role;
    notifyListeners();
  }

  final Set<String> _deletedPostIds = {};

  List<Post> getGroupPosts(String groupId) {
    final list = _groupPosts[groupId] ?? [];
    return list.where((p) => !_deletedPostIds.contains(p.id)).toList();
  }

  void markPostDeleted(String postId) {
    if (postId.isNotEmpty) {
      _deletedPostIds.add(postId);
      _groupPosts.forEach((key, list) {
        list.removeWhere((p) => p.id == postId);
      });
      _pendingPosts.removeWhere((p) => p.id == postId);
      notifyListeners();
    }
  }

  Future<void> fetchGroups({
    AuthProvider? authProvider,
    bool isRetry = false,
  }) async {
    if (_isLoading && !isRetry) return;

    if (authProvider != null && !authProvider.isAuthenticated) {
      _errorMessage = '🔐 Vui lòng đăng nhập để xem danh sách nhóm';
      _isLoading = false;
      notifyListeners();
      return;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await _groupService.getGroups();

    if (result['success'] == true) {
      _myGroups = result['myGroups'] as List<GroupModel>? ?? [];
      _suggestedGroups = result['suggestedGroups'] as List<GroupModel>? ?? [];
      _errorMessage = null;
    } else {
      _errorMessage = result['message'] ?? 'Không thể tải danh sách nhóm';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<Map<String, dynamic>> createGroup(
      String name,
      String description,
      String? avatar, {
        String? coverUrl,
        String? ownerId,
      }) async {
    _isLoading = true;
    notifyListeners();

    final result = await _groupService.createGroup(
      name,
      description,
      avatar,
      coverUrl: coverUrl,
      ownerId: ownerId,
    );

    if (result['success'] == true) {
      GroupModel? created;
      final groupData = result['group'];

      if (groupData is GroupModel) {
        created = groupData;
      } else if (groupData is Map<String, dynamic>) {
        created = GroupModel.fromJson(groupData);
      }

      if (created != null) {
        if ((created.ownerId == null || created.ownerId!.isEmpty) && ownerId != null) {
          created = created.copyWith(ownerId: ownerId);
        }
        _myGroups.insert(0, created);
      }
    }

    _isLoading = false;
    notifyListeners();
    return result;
  }

  Future<void> fetchGroupDetail(String groupId) async {
    _isLoading = true;
    notifyListeners();

    final result = await _groupService.getGroupDetail(groupId);

    if (result['success']) {
      _currentGroup = result['group'] as GroupModel?;
      final rawMembers = result['members'] ?? [];
      _groupMembers = rawMembers is List
          ? rawMembers.map((m) => Map<String, dynamic>.from(m as Map)).toList()
          : [];

      _currentUserRole = result['userRole'] as String?;
      _isPendingJoinForCurrentGroup = result['isPendingJoin'] == true;

      if (result['posts'] != null && result['posts'] is List) {
        final posts = (result['posts'] as List)
            .map((p) => Post.fromJson(p as Map<String, dynamic>))
            .where((post) => post.status != 'deleted')
            .toList();
        _groupPosts[groupId] = posts;
      } else {
        _groupPosts[groupId] = [];
      }

      _errorMessage = null;
    } else {
      _errorMessage = result['message'] ?? 'Không thể tải chi tiết nhóm';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchGroupPosts(String groupId, {bool refresh = false, String? userId}) async {
  _isLoadingPosts = true;
  notifyListeners();

  try {
    final raw = await _groupService.getGroupPosts(groupId, userId: userId);
    final newPostsFromServer = raw
        .map((p) => Post.fromJson(p as Map<String, dynamic>))
        .where((post) => post.status != 'deleted')
        .toList();

    final existingPosts = _groupPosts[groupId] ?? <Post>[];
    final existingMap = {for (var p in existingPosts) p.id!: p};

    // Merge: giữ isLiked cũ nếu server không trả
    final mergedPosts = newPostsFromServer.map((serverPost) {
      final existing = existingMap[serverPost.id];
      if (existing != null) {
        return serverPost.copyWith(
          isLiked: serverPost.isLiked ?? existing.isLiked,  // ← Giữ trạng thái cũ nếu server không trả
          likesCount: serverPost.likesCount, // ưu tiên server
        );
      }
      return serverPost;
    }).toList();

    if (refresh || !_groupPosts.containsKey(groupId)) {
      _groupPosts[groupId] = mergedPosts;
    } else {
      _groupPosts[groupId] = mergedPosts;
    }

    notifyListeners();
  } catch (e) {
    print('Lỗi fetch group posts: $e');
    _errorMessage = 'Không thể tải bài viết nhóm: $e';
    notifyListeners();
  } finally {
    _isLoadingPosts = false;
    notifyListeners();
  }
}

  void addPostToGroup(String groupId, Post newPost) {
    _groupPosts.putIfAbsent(groupId, () => []);
    _groupPosts[groupId]!.insert(0, newPost);
    notifyListeners();
  }

  Future<void> toggleLikeOnGroupPost(String postId, String userId) async {
    try {
      final entry = _groupPosts.entries.firstWhere(
        (e) => e.value.any((p) => p.id == postId),
        orElse: () => MapEntry('', <Post>[]),
      );
      if (entry.key == '') return;

      final posts = entry.value!;
      final idx = posts.indexWhere((p) => p.id == postId);
      if (idx == -1) return;

      final oldPost = posts[idx];
      final wasLiked = oldPost.isLiked ?? false;

      // Optimistic update - match home feed behavior
      posts[idx] = oldPost.copyWith(
        isLiked: !wasLiked,
        likesCount: wasLiked ? oldPost.likesCount - 1 : oldPost.likesCount + 1,
      );
      notifyListeners();

      try {
        // Make API call - don't wait for response details, just ensure it succeeds
        await _postService.toggleLike(userId: userId, postId: postId);
      } catch (e) {
        // Revert on error - match home feed behavior
        posts[idx] = oldPost;
        _errorMessage = e.toString();
        notifyListeners();
        print('Lỗi toggle like trong group: $e');
        rethrow;
      }
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
    }
  }

  void incrementCommentsOnGroupPost(String postId, int delta) {
    final entry = _groupPosts.entries.firstWhere(
      (e) => e.value.any((p) => p.id == postId),
      orElse: () => MapEntry('', <Post>[]),
    );
    if (entry.key == '') return;

    final posts = entry.value!;
    final idx = posts.indexWhere((p) => p.id == postId);
    if (idx == -1) return;

    final post = posts[idx];
    posts[idx] = post.copyWith(commentsCount: post.commentsCount + delta);
    notifyListeners();
  }

  void incrementShareOnGroupPost(String postId) {
    final entry = _groupPosts.entries.firstWhere(
      (e) => e.value.any((p) => p.id == postId),
      orElse: () => MapEntry('', <Post>[]),
    );
    if (entry.key == '') return;
    final posts = entry.value!;
    final idx = posts.indexWhere((p) => p.id == postId);
    if (idx == -1) return;
    final post = posts[idx];
    posts[idx] = post.copyWith(sharesCount: post.sharesCount + 1);
    notifyListeners();
  }

  Future<Post?> createGroupPost(
      String groupId, {
        required String content,
        List<String>? mediaUrls,
        String? contentType,
        List<String>? tags,
      }) async {
    try {
      final result = await _groupService.createGroupPost(
        groupId,
        content: content,
        mediaUrls: mediaUrls,
        contentType: contentType,
        tags: tags,
      );
      if (result == null) return null;

      final postJson = Map<String, dynamic>.from(result);
      postJson['group_id'] = groupId;

      final authProvider = AuthProvider();
      final currentUser = authProvider.user;

      if (currentUser != null) {
        postJson['user_name'] = currentUser.fullName ?? currentUser.username ?? 'Bạn';
        postJson['username'] = currentUser.username ?? '';
        postJson['user_avatar'] = currentUser.avatar;
        postJson['user_id'] = currentUser.id;
      }

      final post = Post.fromJson(postJson);

      addPostToGroup(groupId, post);
      return post;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<Map<String, dynamic>> joinGroup(String groupId, {String? currentUserId}) async {
    // Enforce client-side limit from published config
    try {
      final max = await ConfigService().getMaxGroupsPerUser(force: true);
      if (_myGroups.length >= max) {
        return {
          'success': false,
          'message': 'Bạn đã đạt số nhóm tối đa là $max',
        };
      }
    } catch (e) {
      // If config fetch fails, continue and rely on backend
      print('Failed to fetch config for max_groups_per_user: $e');
    }

    final result = await _groupService.joinGroup(groupId);
    
    if (result['success']) {
      final uid = currentUserId ?? '';
      final isPending = result['isPending'] == true;
      if (isPending) {
        _isPendingJoinForCurrentGroup = true;
      }
      
      if (!isPending) {
        if (uid.isNotEmpty) {
          _groupMembers.add({
            'userId': uid,
            'user_id': uid,
            'id': uid,
            'role': 'MEMBER',
            'status': 'ACTIVE',
            'joined_at': DateTime.now().toIso8601String(),
          });
        }
        if (_currentGroup != null) {
          _currentGroup = _currentGroup!.copyWith(memberCount: _currentGroup!.memberCount + 1);
        }
        _currentUserRole = 'MEMBER';
        final groupIndex = _suggestedGroups.indexWhere((g) => g.id == groupId);
        if (groupIndex != -1) {
          final groupToAdd = _suggestedGroups.removeAt(groupIndex);
          _myGroups.insert(0, groupToAdd.copyWith(memberCount: groupToAdd.memberCount + 1, isJoined: true));
        }
      }
      
      notifyListeners();
    }
    
    return result;
  }

  Future<Map<String, dynamic>> leaveGroup(String groupId, {String? currentUserId}) async {
    final result = await _groupService.leaveGroup(groupId);

    if (result['success']) {
      _isPendingJoinForCurrentGroup = false;
      final uid = currentUserId ?? '';

      _currentUserRole = null;

      _groupMembers.removeWhere((m) {
        final id = (m['userId'] ?? m['user_id'])?.toString() ?? '';
        return uid.isNotEmpty ? id == uid : false;
      });

      if (_currentGroup != null) {
        final newCount = (_currentGroup!.memberCount - 1).clamp(0, 999999).toInt();
        _currentGroup = _currentGroup!.copyWith(memberCount: newCount);

        if (_currentGroup!.ownerId != null && uid.isNotEmpty && _currentGroup!.ownerId == uid) {
          String? newOwnerId;
          try {
            final candidate = _groupMembers.firstWhere((m) {
              final role = (m['role']?.toString() ?? '').toUpperCase();
              return role == 'MODERATOR' || role == 'ADMIN';
            });
            newOwnerId = (candidate['userId'] ?? candidate['user_id'])?.toString();
            candidate['role'] = 'ADMIN';
          } catch (_) {
            if (_groupMembers.isNotEmpty) {
              final candidate = _groupMembers.first;
              newOwnerId = (candidate['userId'] ?? candidate['user_id'])?.toString();
              candidate['role'] = 'ADMIN';
            }
          }

          _currentGroup = _currentGroup!.copyWith(ownerId: newOwnerId);
        }

        if (_groupMembers.isEmpty) {
          _myGroups.removeWhere((g) => g.id == groupId);
          _suggestedGroups.removeWhere((g) => g.id == groupId);
          _currentGroup = null;
        }
      }

      await fetchGroups();
    }

    notifyListeners();
    return result;
  }

  Future<Map<String, dynamic>> addMember(String groupId, String userId) async {
    final result = await _groupService.addMember(groupId, userId);
    if (result['success']) await fetchGroupDetail(groupId);
    return result;
  }

  // ── Pending member management ───────────────────────────────────────────────

  Future<void> fetchPendingMembers(String groupId) async {
    try {
      final raw = await _groupService.getPendingMembers(groupId);
      _pendingMembers = raw
          .map((m) => Map<String, dynamic>.from(m as Map))
          .toList();
      notifyListeners();
    } catch (e) {
      print('fetchPendingMembers error: $e');
    }
  }

  Future<Map<String, dynamic>> approvePendingMember(String groupId, String memberId) async {
    final result = await _groupService.approvePendingMember(groupId, memberId);
    if (result['success']) {
      _pendingMembers.removeWhere((m) => m['_id']?.toString() == memberId);
      if (_currentGroup != null) {
        _currentGroup = _currentGroup!.copyWith(memberCount: _currentGroup!.memberCount + 1);
      }
      notifyListeners();
      await fetchGroupDetail(groupId);
    }
    return result;
  }

  Future<Map<String, dynamic>> rejectPendingMember(String groupId, String memberId) async {
    final result = await _groupService.rejectPendingMember(groupId, memberId);
    if (result['success']) {
      _pendingMembers.removeWhere((m) => m['_id']?.toString() == memberId);
      notifyListeners();
    }
    return result;
  }

  Future<Map<String, dynamic>> updateGroupSettings(
    String groupId, {
    bool? requirePostApproval,
    bool? requireMemberApproval,
  }) async {
    final result = await _groupService.updateGroupSettings(
      groupId,
      requirePostApproval: requirePostApproval,
      requireMemberApproval: requireMemberApproval,
    );
    if (result['success']) {
      if (_currentGroup != null) {
        _currentGroup = _currentGroup!.copyWith(
          requirePostApproval: requirePostApproval ?? _currentGroup!.requirePostApproval,
          requireMemberApproval: requireMemberApproval ?? _currentGroup!.requireMemberApproval,
        );
      }
      // Sync myGroups too
      final idx = _myGroups.indexWhere((g) => g.id == groupId);
      if (idx != -1) {
        _myGroups[idx] = _myGroups[idx].copyWith(
          requirePostApproval: requirePostApproval ?? _myGroups[idx].requirePostApproval,
          requireMemberApproval: requireMemberApproval ?? _myGroups[idx].requireMemberApproval,
        );
      }
      notifyListeners();
    }
    return result;
  }

  Future<Map<String, dynamic>> removeMember(String groupId, String userId) async {
    final result = await _groupService.removeMember(groupId, userId);
    if (result['success']) await fetchGroupDetail(groupId);
    return result;
  }

  Future<Map<String, dynamic>> transferOwnership(
      String groupId, String newOwnerId) async {
    final result = await _groupService.transferOwnership(groupId, newOwnerId);
    if (result['success']) await fetchGroupDetail(groupId);
    return result;
  }

  Future<Map<String, dynamic>> updateGroupMemberRole(
      String groupId, String userId, String role) async {
    final result = await _groupService.updateMemberRole(groupId, userId, role);
    if (result['success']) await fetchGroupDetail(groupId);
    return result;
  }

  Future<Map<String, dynamic>> deleteGroup(String groupId) async {
    final result = await _groupService.deleteGroup(groupId);
    if (result['success']) await fetchGroups();
    return result;
  }

  Future<Map<String, dynamic>> updateGroupInfo(
      String groupId, String name, String description, String? avatar,
      {String? coverUrl}) async {
    final result =
        await _groupService.updateGroup(groupId, name, description, avatar,
            coverUrl: coverUrl);
    if (result['success']) await fetchGroupDetail(groupId);
    return result;
  }

  // ── Pending posts management ─────────────────────────────────────────────

  Future<void> fetchPendingPosts(String groupId) async {
    _isLoadingPendingPosts = true;
    notifyListeners();

    try {
      final raw = await _groupService.getPendingPosts(groupId);
      _pendingPosts = raw
          .map((p) => Post.fromJson(p as Map<String, dynamic>))
          .where((post) => post.status != 'deleted')
          .toList();
    } catch (e) {
      print('fetchPendingPosts error: $e');
      _pendingPosts = [];
    } finally {
      _isLoadingPendingPosts = false;
      notifyListeners();
    }
  }

  // Fetch only the current user's own pending posts in a group (for regular members)
  Future<void> fetchMyPendingGroupPosts(String groupId, String userId) async {
    _isLoadingMyPendingPosts = true;
    notifyListeners();
    try {
      final raw = await _groupService.getGroupPosts(groupId, status: 'PENDING', userId: userId);
      _myPendingPosts = raw
          .map((p) => Post.fromJson(p as Map<String, dynamic>))
          .where((post) => post.status?.toUpperCase() == 'PENDING')
          .toList();
    } catch (e) {
      print('fetchMyPendingGroupPosts error: $e');
      _myPendingPosts = [];
    } finally {
      _isLoadingMyPendingPosts = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> approveGroupPost(String groupId, String postId) async {
    final result = await _groupService.approvePost(groupId, postId);
    if (result['success']) {
      _pendingPosts.removeWhere((p) => p.id == postId);
      notifyListeners();
      // Refresh approved posts list
      await fetchGroupPosts(groupId, refresh: true);
    }
    return result;
  }

  Future<Map<String, dynamic>> rejectGroupPost(String groupId, String postId, {String? reason}) async {
    final result = await _groupService.rejectPost(groupId, postId, reason: reason);
    if (result['success']) {
      _pendingPosts.removeWhere((p) => p.id == postId);
      notifyListeners();
    }
    return result;
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  Future<bool> deleteGroupPost(String groupId, String postId) async {
    try {
      _deletedPostIds.add(postId);
      if (_groupPosts.containsKey(groupId)) {
        _groupPosts[groupId]!.removeWhere((post) => post.id == postId);
      }
      _pendingPosts.removeWhere((post) => post.id == postId);
      notifyListeners();

      // call API
      await _postService.deletePost(postId);
      return true;
    } catch (e) {
      print('ERROR deleteGroupPost: $e');
      _errorMessage = 'Lỗi xóa bài viết: $e';
      notifyListeners();
      return false;
    }
  }

  // Clear data khi logout hoặc cần reset
  void clear() {
    _myGroups = [];
    _suggestedGroups = [];
    _currentGroup = null;
    _groupMembers = [];
    _pendingMembers = [];
    _pendingPosts = [];
    _currentUserRole = null;
    _groupPosts.clear();
    _deletedPostIds.clear();
    _errorMessage = null;
    notifyListeners();
  }
}