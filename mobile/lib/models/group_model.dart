// lib/models/group_model.dart

import 'group_post_model.dart';

enum MemberRole { owner, admin, member, none }

extension MemberRoleExtension on MemberRole {
  String get displayName {
    switch (this) {
      case MemberRole.owner:
        return 'Trưởng nhóm 👑';
      case MemberRole.admin:
        return 'Quản trị viên 🛡️';
      case MemberRole.member:
        return 'Thành viên 👤';
      case MemberRole.none:
        return 'Chưa tham gia';
    }
  }

  String get shortName {
    switch (this) {
      case MemberRole.owner:
        return 'Trưởng nhóm';
      case MemberRole.admin:
        return 'Quản trị viên';
      case MemberRole.member:
        return 'Thành viên';
      case MemberRole.none:
        return 'Chưa tham gia';
    }
  }

  String get icon {
    switch (this) {
      case MemberRole.owner:
        return '👑';
      case MemberRole.admin:
        return '🛡️';
      case MemberRole.member:
        return '👤';
      case MemberRole.none:
        return '🚫';
    }
  }

  bool get isLeader => this == MemberRole.owner;

  bool get isAdmin =>
      this == MemberRole.owner || this == MemberRole.admin;
}

class GroupModel {
  final String id;
  final String name;
  final String description;
  final String? avatar;
  final String? coverUrl;
  final String? ownerId;
  final List<Map<String, dynamic>> members;
  final int memberCount;
  final bool isJoined;
  final bool requirePostApproval;
  final bool requireMemberApproval;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final List<GroupPostModel> posts;
  final String? userRole; // Role from API (ADMIN/MODERATOR/MEMBER)

  GroupModel({
    required this.id,
    required this.name,
    this.description = '',
    this.avatar,
    this.coverUrl,
    this.ownerId,
    this.members = const [],
    required this.memberCount,
    this.isJoined = false,
    this.requirePostApproval = false,
    this.requireMemberApproval = true,
    this.createdAt,
    this.updatedAt,
    this.posts = const [],
    this.userRole,
  });

  // ================= FIX CHUẨN OWNER =================

  factory GroupModel.fromJson(Map<String, dynamic> json) {
    final membersJson = json['members'] as List<dynamic>? ?? [];

    // 🔥 FIX ownerId mọi trường hợp backend
    String? parsedOwnerId;

    if (json['ownerId'] != null) {
      if (json['ownerId'] is Map) {
        parsedOwnerId = json['ownerId']['_id']?.toString();
      } else {
        parsedOwnerId = json['ownerId'].toString();
      }
    } else if (json['owner_id'] != null) {
      parsedOwnerId = json['owner_id'].toString();
    } else if (json['creator_id'] != null) {
      parsedOwnerId = json['creator_id'].toString();
    } else if (json['owner'] != null) {
      if (json['owner'] is Map) {
        parsedOwnerId = json['owner']['_id']?.toString();
      } else {
        parsedOwnerId = json['owner'].toString();
      }
    }

    return GroupModel(
      id: json['_id']?.toString() ??
          json['id']?.toString() ??
          '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      avatar: json['avatar_url']?.toString() ??
          json['avatar']?.toString(),
      coverUrl: json['cover_url']?.toString() ??
          json['coverUrl']?.toString() ??
          json['background_url']?.toString(),
      ownerId: parsedOwnerId,
      members: membersJson
          .map((m) => m as Map<String, dynamic>)
          .toList(),
      memberCount: json['members_count'] ??
          json['memberCount'] ??
          membersJson.length,
      isJoined: json['userRole'] != null || membersJson.isNotEmpty,
      requirePostApproval: json['require_post_approval'] == true,
      requireMemberApproval: json['require_member_approval'] != false, // default true
      userRole: json['userRole']?.toString(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'])
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'])
          : null,
      posts: (json['posts'] as List<dynamic>?)
          ?.map((p) =>
          GroupPostModel.fromJson(p))
          .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'description': description,
      'avatar_url': avatar,
      'cover_url': coverUrl,
    };
  }

  GroupModel copyWith({
    String? id,
    String? name,
    String? description,
    String? avatar,
    String? coverUrl,
    String? ownerId,
    List<Map<String, dynamic>>? members,
    int? memberCount,
    bool? isJoined,
    bool? requirePostApproval,
    bool? requireMemberApproval,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<GroupPostModel>? posts,
    String? userRole,
  }) {
    return GroupModel(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      avatar: avatar ?? this.avatar,
      coverUrl: coverUrl ?? this.coverUrl,
      ownerId: ownerId ?? this.ownerId,
      members: members ?? this.members,
      memberCount: memberCount ?? this.memberCount,
      isJoined: isJoined ?? this.isJoined,
      requirePostApproval: requirePostApproval ?? this.requirePostApproval,
      requireMemberApproval: requireMemberApproval ?? this.requireMemberApproval,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      posts: posts ?? this.posts,
      userRole: userRole ?? this.userRole,
    );
  }

  // ================= FIX ROLE LOGIC =================

  MemberRole? getUserRole(String userId) {
    final uid = userId.toString();

    // 🔥 ƯU TIÊN OWNER TRƯỚC
    if (ownerId != null && ownerId!.toString() == uid) {
      return MemberRole.owner;
    }

    // 🔥 Check trong members (ép string 100%, case-insensitive)
    for (var m in members) {
      final memberUserId = m['userId']?.toString() ??
          m['user_id']?.toString();

      if (memberUserId == uid) {
        final role = (m['role']?.toString() ?? '').toUpperCase();

        if (role == 'ADMIN') return MemberRole.owner;
        if (role == 'MODERATOR') return MemberRole.admin;
        return MemberRole.member;
      }
    }

    // 🔥 Fallback: use userRole from API response (attached by getGroupsForUser)
    if (userRole != null) {
      switch (userRole!.toUpperCase()) {
        case 'ADMIN':
          return MemberRole.owner;
        case 'MODERATOR':
          return MemberRole.admin;
        case 'MEMBER':
          return MemberRole.member;
      }
    }

    // User is not in members list → not a member
    return null;
  }

  bool isOwner(String userId) =>
      ownerId != null && ownerId!.toString() == userId.toString();

  bool isAdminUser(String userId) =>
      getUserRole(userId)?.isAdmin ?? false;

  String? get cover => coverUrl ?? avatar;

  int get membersCount => memberCount;
}